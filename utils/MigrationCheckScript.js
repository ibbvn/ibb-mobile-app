// MigrationCheckScript.js - Debug migration status
import * as FileSystem from 'expo-file-system';

const OLD_DIR = FileSystem.documentDirectory + 'chebien/';
const ACTIVE_DIR = FileSystem.documentDirectory + 'chebien/active/';
const COMPLETED_DIR = FileSystem.documentDirectory + 'chebien/completed/';

export const MigrationCheckScript = {
  
  async debugFileStructure() {
    console.log('🔍 ==> DEBUGGING FILE STRUCTURE <==');
    
    try {
      // Check chebien/ directory
      const chebienExists = await FileSystem.getInfoAsync(OLD_DIR);
      console.log(`📁 chebien/ exists: ${chebienExists.exists}`);
      
      if (chebienExists.exists) {
        const chebienFiles = await FileSystem.readDirectoryAsync(OLD_DIR);
        const jsonFiles = chebienFiles.filter(f => f.endsWith('.json') && !f.includes('/'));
        console.log(`📄 JSON files in chebien/: ${jsonFiles.length}`);
        jsonFiles.forEach(file => {
          console.log(`  - ${file}`);
        });
      }
      
      // Check active/ directory
      const activeExists = await FileSystem.getInfoAsync(ACTIVE_DIR);
      console.log(`📁 chebien/active/ exists: ${activeExists.exists}`);
      
      if (activeExists.exists) {
        const activeFiles = await FileSystem.readDirectoryAsync(ACTIVE_DIR);
        const activeJsonFiles = activeFiles.filter(f => f.endsWith('.json'));
        console.log(`📄 JSON files in active/: ${activeJsonFiles.length}`);
        activeJsonFiles.forEach(file => {
          console.log(`  - ${file}`);
        });
      }
      
      // Check completed/ directory
      const completedExists = await FileSystem.getInfoAsync(COMPLETED_DIR);
      console.log(`📁 chebien/completed/ exists: ${completedExists.exists}`);
      
      if (completedExists.exists) {
        const completedFiles = await FileSystem.readDirectoryAsync(COMPLETED_DIR);
        const completedJsonFiles = completedFiles.filter(f => f.endsWith('.json'));
        console.log(`📄 JSON files in completed/: ${completedJsonFiles.length}`);
        completedJsonFiles.forEach(file => {
          console.log(`  - ${file}`);
        });
      }
      
      console.log('🔍 ==> END DEBUG <==');
      
      return {
        chebienFiles: chebienExists.exists ? 
          (await FileSystem.readDirectoryAsync(OLD_DIR)).filter(f => f.endsWith('.json') && !f.includes('/')) : [],
        activeFiles: activeExists.exists ? 
          (await FileSystem.readDirectoryAsync(ACTIVE_DIR)).filter(f => f.endsWith('.json')) : [],
        completedFiles: completedExists.exists ? 
          (await FileSystem.readDirectoryAsync(COMPLETED_DIR)).filter(f => f.endsWith('.json')) : []
      };
      
    } catch (error) {
      console.error('❌ Error debugging file structure:', error);
      return { chebienFiles: [], activeFiles: [], completedFiles: [] };
    }
  },
  
  async forceMigration() {
    console.log('🔄 ==> FORCE MIGRATION <==');
    
    try {
      const debugInfo = await this.debugFileStructure();
      
      if (debugInfo.chebienFiles.length === 0) {
        console.log('ℹ️ No files to migrate');
        return { migrated: 0, message: 'No old files found' };
      }
      
      // Ensure directories exist
      await FileSystem.makeDirectoryAsync(ACTIVE_DIR, { intermediates: true });
      await FileSystem.makeDirectoryAsync(COMPLETED_DIR, { intermediates: true });
      
      let migrated = 0;
      
      for (const file of debugInfo.chebienFiles) {
        try {
          console.log(`🔄 Migrating: ${file}`);
          
          const oldPath = OLD_DIR + file;
          const content = await FileSystem.readAsStringAsync(oldPath);
          const data = JSON.parse(content);
          
          // Generate new filename
          const newFileName = this.generateNewFileName(file, data);
          const newPath = ACTIVE_DIR + newFileName;
          
          // Add migration metadata
          data.migrated_at = new Date().toISOString();
          data.original_filename = file;
          
          // Write to new location
          await FileSystem.writeAsStringAsync(newPath, JSON.stringify(data, null, 2));
          
          // Delete old file
          await FileSystem.deleteAsync(oldPath);
          
          console.log(`✅ Migrated: ${file} -> ${newFileName}`);
          migrated++;
          
        } catch (error) {
          console.error(`❌ Error migrating ${file}:`, error);
        }
      }
      
      console.log(`🎉 Force migration completed: ${migrated} files migrated`);
      return { migrated, message: `Successfully migrated ${migrated} files` };
      
    } catch (error) {
      console.error('❌ Force migration failed:', error);
      return { migrated: 0, message: 'Migration failed: ' + error.message };
    }
  },
  
  generateNewFileName(oldFileName, data) {
    // Try to parse from old filename format
    const oldMatch = oldFileName.match(/^(\d{4}-\d{2}-\d{2})__me(\d+)__(\d{6})\.json$/);
    
    if (oldMatch) {
      const [, date, meNum, time] = oldMatch;
      const tankNum = (data.field_003 || data.tank_so || '01').toString().padStart(2, '0');
      const meStr = meNum.padStart(2, '0');
      
      return `${date}_me${meStr}_tank${tankNum}_${time}.json`;
    }
    
    // Fallback: generate new name
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
  }
};

export default MigrationCheckScript;