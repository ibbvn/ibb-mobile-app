// utils/tankDataManager.js - Tank Data Management Utility
import * as FileSystem from 'expo-file-system';

// Tank capacity configuration
export const TANK_CAPACITIES = {
  1: 42000, 2: 42000, 3: 42000, 4: 42000, 5: 42000, 6: 42000,  // 42,000L tanks
  11: 28000, 12: 28000, 13: 28000, 14: 28000,                   // 28,000L tanks
  // All other tanks default to 10,500L
  7: 10500, 8: 10500, 9: 10500, 10: 10500,
  15: 10500, 16: 10500, 17: 10500, 18: 10500, 19: 10500, 20: 10500
};

const DATA_DIR = FileSystem.documentDirectory + 'chebien/';

export const getTankCapacity = (tankNumber) => {
  return TANK_CAPACITIES[tankNumber] || 10500; // Default 10,500L
};

// Get tank color based on temperature
export const getTankColor = (temperature) => {
  if (temperature === null || temperature === undefined) return '#E0E0E0'; // Empty/Unknown
  if (temperature >= 12) return '#FF4D4D'; // Hot - Red
  if (temperature >= 10) return '#FFA500'; // Warm - Orange  
  return '#4CAF50'; // Cool - Green (default after brewing)
};

// Calculate current tank status from batch files
export const calculateTankStatus = async (tankNumber) => {
  try {
    // Ensure directory exists
    await FileSystem.makeDirectoryAsync(DATA_DIR, { intermediates: true });
    
    const files = await FileSystem.readDirectoryAsync(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const tankBatches = [];
    
    // Read all batch files and filter for this tank
    for (const file of jsonFiles) {
      try {
        const content = await FileSystem.readAsStringAsync(DATA_DIR + file);
        const data = JSON.parse(content);
        
        const fileTankNumber = parseInt(data.field_003 || data.tank_so || 0);
        
        if (fileTankNumber === parseInt(tankNumber)) {
          const batchNumber = parseInt(data.field_002 || data.me_so || 0);
          const volume = parseFloat(data.field_080 || data.the_tich_cuoi || 0); // Final volume
          const ngayNau = data.field_001 || data.ngay_nau || '';
          const beerType = data.beer_type || 'unknown';
          const createdAt = data.created_at || '';
          
          tankBatches.push({
            file,
            batchNumber,
            volume,
            ngayNau,
            beerType,
            createdAt,
            data
          });
        }
      } catch (parseError) {
        console.warn(`Error parsing file ${file}:`, parseError);
      }
    }
    
    if (tankBatches.length === 0) {
      return {
        tankNumber,
        capacity: getTankCapacity(tankNumber),
        currentVolume: 0,
        fillPercentage: 0,
        temperature: null,
        lastFillDate: null,
        beerType: null,
        batchCount: 0,
        latestBatch: null,
        status: 'empty'
      };
    }
    
    // Sort by batch number to get latest
    tankBatches.sort((a, b) => b.batchNumber - a.batchNumber);
    const latestBatch = tankBatches[0];
    
    // Calculate total volume
    const totalVolume = tankBatches.reduce((sum, batch) => sum + batch.volume, 0);
    const capacity = getTankCapacity(tankNumber);
    const fillPercentage = Math.min((totalVolume / capacity) * 100, 100);
    
    return {
      tankNumber,
      capacity,
      currentVolume: totalVolume,
      fillPercentage,
      temperature: 10, // Default post-brewing temperature
      lastFillDate: latestBatch.ngayNau,
      beerType: latestBatch.beerType,
      batchCount: tankBatches.length,
      latestBatch: latestBatch.batchNumber,
      status: totalVolume > 0 ? 'filled' : 'empty',
      batches: tankBatches
    };
    
  } catch (error) {
    console.error(`Error calculating tank ${tankNumber} status:`, error);
    return {
      tankNumber,
      capacity: getTankCapacity(tankNumber),
      currentVolume: 0,
      fillPercentage: 0,
      temperature: null,
      lastFillDate: null,
      beerType: null,
      batchCount: 0,
      latestBatch: null,
      status: 'error'
    };
  }
};

// Get all tanks status
export const getAllTanksStatus = async () => {
  const tankNumbers = Object.keys(TANK_CAPACITIES).map(Number);
  const tankStatuses = [];
  
  for (const tankNumber of tankNumbers) {
    const status = await calculateTankStatus(tankNumber);
    tankStatuses.push(status);
  }
  
  return tankStatuses.sort((a, b) => a.tankNumber - b.tankNumber);
};

// Update tank temperature and other QA data
export const updateTankQAData = async (tankNumber, qaData) => {
  const QA_DIR = FileSystem.documentDirectory + 'qa/';
  await FileSystem.makeDirectoryAsync(QA_DIR, { intermediates: true });
  
  const today = new Date().toISOString().split('T')[0];
  const fileName = `tank_${tankNumber}_qa_${today}.json`;
  const filePath = QA_DIR + fileName;
  
  try {
    // Read existing QA data if any
    let existingData = {};
    const exists = await FileSystem.getInfoAsync(filePath);
    if (exists.exists) {
      const content = await FileSystem.readAsStringAsync(filePath);
      existingData = JSON.parse(content);
    }
    
    // Merge with new data
    const updatedData = {
      ...existingData,
      tankNumber,
      date: today,
      lastUpdated: new Date().toISOString(),
      ...qaData
    };
    
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(updatedData, null, 2));
    return updatedData;
    
  } catch (error) {
    console.error(`Error updating tank ${tankNumber} QA data:`, error);
    throw error;
  }
};

// Get tank QA data
export const getTankQAData = async (tankNumber) => {
  const QA_DIR = FileSystem.documentDirectory + 'qa/';
  const today = new Date().toISOString().split('T')[0];
  const fileName = `tank_${tankNumber}_qa_${today}.json`;
  const filePath = QA_DIR + fileName;
  
  try {
    const exists = await FileSystem.getInfoAsync(filePath);
    if (exists.exists) {
      const content = await FileSystem.readAsStringAsync(filePath);
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    console.error(`Error reading tank ${tankNumber} QA data:`, error);
    return null;
  }
};