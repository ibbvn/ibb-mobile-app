// utils/MigrationScript.js - Complete migration utility
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

const OLD_DIR = FileSystem.documentDirectory + 'chebien/';
const ACTIVE_DIR = FileSystem.documentDirectory + 'chebien/active/';
const COMPLETED_DIR = FileSystem.documentDirectory + 'chebien/completed/';

export const MigrationScript = {
  
  // Check if migration is needed
  async checkIfMigrationNeeded() {
    try {
      // Check if old structure exists (files directly in chebien/)
      const oldDirInfo = await FileSystem.getInfoAsync(OLD_DIR);
      if (!oldDirInfo.exists) {
        return false;
      }
      
      const files = await FileSystem.readDirectoryAsync(OLD_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('/'));
      
      // If there are JSON files directly in chebien/, migration is needed
      return jsonFiles.length > 0;
      
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  },
  
  // Main migration function
  async migrateOldFiles() {
    try {
      console.log('🔄 Starting migration from old structure to new...');
      
      // Ensure new directories exist
      await FileSystem.makeDirectoryAsync(ACTIVE_DIR, { intermediates: true });
      await FileSystem.makeDirectoryAsync(COMPLETED_DIR, { intermediates: true });
      
      // Get files from old directory
      const files = await FileSystem.readDirectoryAsync(OLD_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('/'));
      
      let migrated = 0;
      let skipped = 0;
      let errors = 0;
      
      for (const file of jsonFiles) {
        try {
          const oldFilePath = OLD_DIR + file;
          
          // Read file content
          const content = await FileSystem.readAsStringAsync(oldFilePath);
          const data = JSON.parse(content);
          
          // Generate new filename
          const newFileName = this.generateNewFileName(file, data);
          
          // Determine target directory (default to active)
          const targetDir = this.shouldBeCompleted(data) ? COMPLETED_DIR : ACTIVE_DIR;
          const newFilePath = targetDir + newFileName;
          
          // Add migration metadata
          data.migrated_at = new Date().toISOString();
          data.original_filename = file;
          
          // Write to new location
          await FileSystem.writeAsStringAsync(newFilePath, JSON.stringify(data, null, 2));
          
          // Delete old file
          await FileSystem.deleteAsync(oldFilePath);
          
          console.log(`✅ Migrated: ${file} → ${newFileName}`);
          migrated++;
          
        } catch (error) {
          console.error(`❌ Error migrating ${file}:`, error);
          errors++;
        }
      }
      
      const result = { migrated, skipped, errors };
      console.log(`🎉 Migration completed:`, result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },
  
  // Generate new filename with format: YYYY-MM-DD_meXX_tankYY_HHMMSS.json
  generateNewFileName(oldFileName, data) {
    // Try to parse from old filename format: YYYY-MM-DD__meXX__HHMMSS.json
    const oldMatch = oldFileName.match(/^(\d{4}-\d{2}-\d{2})__me(\d+)__(\d{6})\.json$/);
    
    if (oldMatch) {
      const [, date, meNum, time] = oldMatch;
      const tankNum = (data.field_003 || data.tank_so || '01').toString().padStart(2, '0');
      const meStr = meNum.padStart(2, '0');
      
      return `${date}_me${meStr}_tank${tankNum}_${time}.json`;
    }
    
    // Fallback: generate new name from current data and time
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const hh = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    const ss = now.getSeconds().toString().padStart(2, '0');
    
    const meNum = (data.field_002 || data.me_so || '01').toString().padStart(2, '0');
    const tankNum = (data.field_003 || data.tank_so || '01').toString().padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}_me${meNum}_tank${tankNum}_${hh}${min}${ss}.json`;
  },
  
  // Determine if batch should be in completed folder
  shouldBeCompleted(data) {
    // Logic to determine if batch should be in completed folder
    // For now, assume all are active unless explicitly marked as completed
    return data.status === 'completed' || data.completed_at;
  },
  
  // Validate migration results
  async validateMigration() {
    try {
      console.log('🔍 Validating migration...');
      
      const activeFiles = await FileSystem.readDirectoryAsync(ACTIVE_DIR);
      const completedFiles = await FileSystem.readDirectoryAsync(COMPLETED_DIR);
      
      const activeJsonCount = activeFiles.filter(f => f.endsWith('.json')).length;
      const completedJsonCount = completedFiles.filter(f => f.endsWith('.json')).length;
      
      console.log(`📊 Migration validation:`);
      console.log(`   Active files: ${activeJsonCount}`);
      console.log(`   Completed files: ${completedJsonCount}`);
      console.log(`   Total: ${activeJsonCount + completedJsonCount}`);
      
      // Check filename format
      let validFormat = 0;
      let invalidFormat = 0;
      
      for (const file of [...activeFiles, ...completedFiles]) {
        if (file.endsWith('.json')) {
          const isValid = /^\d{4}-\d{2}-\d{2}_me\d{2}_tank\d{2}_\d{6}\.json$/.test(file);
          if (isValid) {
            validFormat++;
          } else {
            invalidFormat++;
            console.warn(`⚠️ Invalid format: ${file}`);
          }
        }
      }
      
      console.log(`📝 Filename format validation:`);
      console.log(`   Valid format: ${validFormat}`);
      console.log(`   Invalid format: ${invalidFormat}`);
      
      return {
        activeCount: activeJsonCount,
        completedCount: completedJsonCount,
        validFormat,
        invalidFormat
      };
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  },
  
  // Show migration dialog to user
  async showMigrationDialog() {
    return new Promise((resolve) => {
      Alert.alert(
        '🔄 Cập nhật cấu trúc dữ liệu',
        'Hệ thống phát hiện cấu trúc file cũ cần được cập nhật.\n\n' +
        'Cấu trúc mới sẽ:\n' +
        '• Phân tách phiếu đang hoạt động và đã hoàn thành\n' +
        '• Cải thiện hiệu suất hiển thị Tank\n' +
        '• Tránh nhầm lẫn dữ liệu cũ\n' +
        '• Tối ưu tốc độ tải dữ liệu\n\n' +
        'Quá trình này an toàn và tự động.',
        [
          {
            text: 'Để sau',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Cập nhật ngay',
            style: 'default',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  },
  
  // Rollback migration (if needed)
  async rollbackMigration() {
    try {
      console.log('🔙 Rolling back migration...');
      
      const activeFiles = await FileSystem.readDirectoryAsync(ACTIVE_DIR);
      const completedFiles = await FileSystem.readDirectoryAsync(COMPLETED_DIR);
      
      let restored = 0;
      let errors = 0;
      
      // Restore files from active directory
      for (const file of activeFiles) {
        if (file.endsWith('.json')) {
          try {
            const content = await FileSystem.readAsStringAsync(ACTIVE_DIR + file);
            const data = JSON.parse(content);
            
            const originalName = data.original_filename || file;
            
            // Remove migration metadata
            delete data.migrated_at;
            delete data.original_filename;
            
            // Write back to old location
            await FileSystem.writeAsStringAsync(OLD_DIR + originalName, JSON.stringify(data, null, 2));
            
            // Delete from new location
            await FileSystem.deleteAsync(ACTIVE_DIR + file);
            
            restored++;
          } catch (error) {
            console.error(`Error restoring ${file}:`, error);
            errors++;
          }
        }
      }
      
      // Restore files from completed directory
      for (const file of completedFiles) {
        if (file.endsWith('.json')) {
          try {
            const content = await FileSystem.readAsStringAsync(COMPLETED_DIR + file);
            const data = JSON.parse(content);
            
            const originalName = data.original_filename || file;
            
            // Remove migration metadata
            delete data.migrated_at;
            delete data.original_filename;
            
            // Write back to old location
            await FileSystem.writeAsStringAsync(OLD_DIR + originalName, JSON.stringify(data, null, 2));
            
            // Delete from new location
            await FileSystem.deleteAsync(COMPLETED_DIR + file);
            
            restored++;
          } catch (error) {
            console.error(`Error restoring ${file}:`, error);
            errors++;
          }
        }
      }
      
      console.log(`🎉 Rollback completed: ${restored} files restored, ${errors} errors`);
      return { restored, errors };
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};

export default MigrationScript;