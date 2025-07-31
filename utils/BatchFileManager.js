// BatchFileManager.js - Utility for managing batch files between directories
import * as FileSystem from 'expo-file-system';

const ACTIVE_DIR = FileSystem.documentDirectory + 'chebien/active/';
const COMPLETED_DIR = FileSystem.documentDirectory + 'chebien/completed/';

export const BatchFileManager = {
  
  // Ensure directories exist
  async ensureDirectories() {
    await FileSystem.makeDirectoryAsync(ACTIVE_DIR, { intermediates: true });
    await FileSystem.makeDirectoryAsync(COMPLETED_DIR, { intermediates: true });
  },

  // Move batch from active to completed when filtering is done
  async markBatchAsCompleted(fileName) {
    try {
      await this.ensureDirectories();
      
      const sourceFile = ACTIVE_DIR + fileName;
      const targetFile = COMPLETED_DIR + fileName;
      
      // Check if source file exists
      const sourceInfo = await FileSystem.getInfoAsync(sourceFile);
      if (!sourceInfo.exists) {
        throw new Error(`Source file not found: ${fileName}`);
      }
      
      // Read file content
      const content = await FileSystem.readAsStringAsync(sourceFile);
      const data = JSON.parse(content);
      
      // Add completion metadata
      data.completed_at = new Date().toISOString();
      data.status = 'completed';
      
      // Write to completed directory
      await FileSystem.writeAsStringAsync(targetFile, JSON.stringify(data, null, 2));
      
      // Delete from active directory
      await FileSystem.deleteAsync(sourceFile);
      
      console.log(`✅ Moved batch ${fileName} to completed directory`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error moving batch ${fileName} to completed:`, error);
      throw error;
    }
  },

  // Move batch from completed back to active (if needed)
  async markBatchAsActive(fileName) {
    try {
      await this.ensureDirectories();
      
      const sourceFile = COMPLETED_DIR + fileName;
      const targetFile = ACTIVE_DIR + fileName;
      
      // Check if source file exists
      const sourceInfo = await FileSystem.getInfoAsync(sourceFile);
      if (!sourceInfo.exists) {
        throw new Error(`Source file not found: ${fileName}`);
      }
      
      // Read file content
      const content = await FileSystem.readAsStringAsync(sourceFile);
      const data = JSON.parse(content);
      
      // Remove completion metadata
      delete data.completed_at;
      data.status = 'active';
      
      // Write to active directory
      await FileSystem.writeAsStringAsync(targetFile, JSON.stringify(data, null, 2));
      
      // Delete from completed directory
      await FileSystem.deleteAsync(sourceFile);
      
      console.log(`✅ Moved batch ${fileName} back to active directory`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error moving batch ${fileName} to active:`, error);
      throw error;
    }
  },

  // Get all active batches for a specific tank
  async getActiveBatchesForTank(tankNumber) {
    try {
      await this.ensureDirectories();
      
      const files = await FileSystem.readDirectoryAsync(ACTIVE_DIR);
      const tankFiles = files.filter(file => 
        file.includes(`_tank${tankNumber.toString().padStart(2, '0')}_`) && 
        file.endsWith('.json')
      );
      
      const batches = [];
      for (const file of tankFiles) {
        try {
          const content = await FileSystem.readAsStringAsync(ACTIVE_DIR + file);
          const data = JSON.parse(content);
          batches.push({
            fileName: file,
            data: data,
            tankNumber: parseInt(data.field_003 || data.tank_so || tankNumber),
            batchNumber: data.field_002 || data.me_so,
            volume: parseFloat(data.field_025 || data.the_tich_dau || 0),
            beerType: data.beer_type || 'river',
            createdAt: data.created_at || this.parseTimeFromFilename(file)
          });
        } catch (parseError) {
          console.error(`Error parsing file ${file}:`, parseError);
        }
      }
      
      // Sort by creation time (newest first)
      batches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return batches;
      
    } catch (error) {
      console.error(`Error getting active batches for tank ${tankNumber}:`, error);
      return [];
    }
  },

  // Get the latest batch for a tank
  async getLatestBatchForTank(tankNumber) {
    const batches = await this.getActiveBatchesForTank(tankNumber);
    return batches.length > 0 ? batches[0] : null;
  },

  // Parse time from filename
  parseTimeFromFilename(filename) {
    const match = filename.match(/^(\d{4}-\d{2}-\d{2}).*_(\d{6})\.json$/);
    if (match) {
      const [, dateStr, timeStr] = match;
      const hour = timeStr.substring(0, 2);
      const min = timeStr.substring(2, 4);
      const sec = timeStr.substring(4, 6);
      return `${dateStr}T${hour}:${min}:${sec}Z`;
    }
    return new Date().toISOString();
  },

  // Clean up old completed files (optional - for maintenance)
  async cleanupOldCompletedFiles(daysOld = 90) {
    try {
      await this.ensureDirectories();
      
      const files = await FileSystem.readDirectoryAsync(COMPLETED_DIR);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = COMPLETED_DIR + file;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.modificationTime < cutoffDate.getTime()) {
            await FileSystem.deleteAsync(filePath);
            deletedCount++;
            console.log(`🗑️ Deleted old completed file: ${file}`);
          }
        }
      }
      
      console.log(`✅ Cleanup completed: Deleted ${deletedCount} old files`);
      return deletedCount;
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return 0;
    }
  },

  // Get statistics
  async getStatistics() {
    try {
      await this.ensureDirectories();
      
      const activeFiles = await FileSystem.readDirectoryAsync(ACTIVE_DIR);
      const completedFiles = await FileSystem.readDirectoryAsync(COMPLETED_DIR);
      
      const activeCount = activeFiles.filter(f => f.endsWith('.json')).length;
      const completedCount = completedFiles.filter(f => f.endsWith('.json')).length;
      
      // Count by beer type
      const stats = {
        active: {
          total: activeCount,
          river: 0,
          hanoi: 0,
          chaihg: 0
        },
        completed: {
          total: completedCount,
          river: 0,
          hanoi: 0,
          chaihg: 0
        }
      };
      
      // Count active files by type
      for (const file of activeFiles) {
        if (file.endsWith('.json')) {
          try {
            const content = await FileSystem.readAsStringAsync(ACTIVE_DIR + file);
            const data = JSON.parse(content);
            const beerType = data.beer_type || 'river';
            stats.active[beerType]++;
          } catch (e) {
            // Skip corrupted files
          }
        }
      }
      
      // Count completed files by type
      for (const file of completedFiles) {
        if (file.endsWith('.json')) {
          try {
            const content = await FileSystem.readAsStringAsync(COMPLETED_DIR + file);
            const data = JSON.parse(content);
            const beerType = data.beer_type || 'river';
            stats.completed[beerType]++;
          } catch (e) {
            // Skip corrupted files
          }
        }
      }
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      return {
        active: { total: 0, river: 0, hanoi: 0, chaihg: 0 },
        completed: { total: 0, river: 0, hanoi: 0, chaihg: 0 }
      };
    }
  }
};

export default BatchFileManager;