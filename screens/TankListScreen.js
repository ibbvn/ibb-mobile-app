// TankListScreen.js - Fixed performance and volume calculation
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, RefreshControl, Alert } from 'react-native';
import TankOptionsPopup from './TankOptionsPopup';

// Tank capacities and configurations
const TANK_CONFIG = {
  1: { capacity: 42000, type: 'large' },
  2: { capacity: 42000, type: 'large' },
  3: { capacity: 42000, type: 'large' },
  4: { capacity: 42000, type: 'large' },
  5: { capacity: 42000, type: 'large' },
  6: { capacity: 42000, type: 'large' },
  7: { capacity: 10500, type: 'small' },
  8: { capacity: 10500, type: 'small' },
  9: { capacity: 10500, type: 'small' },
  10: { capacity: 10500, type: 'small' },
  11: { capacity: 28000, type: 'medium' },
  12: { capacity: 28000, type: 'medium' },
  13: { capacity: 28000, type: 'medium' },
  14: { capacity: 28000, type: 'medium' },
  15: { capacity: 10500, type: 'small' },
  16: { capacity: 10500, type: 'small' },
  17: { capacity: 10500, type: 'small' }
};

const API_BASE_URL = 'https://api.ibb.vn';

const getTankColor = (temperature) => {
  if (temperature === null || temperature === undefined) return '#999';
  if (temperature <= 2) return '#29B6F6'; // Very cold - blue
  if (temperature <= 5) return '#4FC3F7'; // Cold - light blue
  if (temperature < 10) return '#66BB6A'; // Good - green
  if (temperature < 15) return '#FFA726'; // Warm - orange
  return '#EF5350'; // Hot - red
};

const getBeerTypeIcon = (beerType) => {
  switch (beerType?.toLowerCase()) {
    case 'hanoi': return '🏯';
    case 'chaihg': return '👑';
    case 'river': return '🍺';
    default: return '🚰';
  }
};

const formatVolume = (volume) => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return Math.round(volume).toString();
};

export default function TankListScreen() {
  const [selectedTank, setSelectedTank] = useState(null);
  const [tanksData, setTanksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs để control loading state
  const loadingRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadTanksData();
    
    // Set interval với thời gian dài hơn để giảm tải
    intervalRef.current = setInterval(loadTanksData, 60000); // 60 giây thay vì 30 giây
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadTanksData = async () => {
    // Tránh multiple concurrent requests
    if (loadingRef.current) {
      console.log('🔄 Already loading, skipping...');
      return;
    }
    
    try {
      loadingRef.current = true;
      setError(null);
      
      if (!refreshing && !loading) {
        // Chỉ set loading = true lần đầu, không set khi auto-refresh
        console.log('📡 Loading tanks data silently...');
      } else {
        setLoading(true);
      }
      
      const tanksStatus = await getAllTanksStatus();
      setTanksData(tanksStatus);
      
      console.log(`✅ Loaded ${tanksStatus.length} tanks successfully`);
      
    } catch (error) {
      console.error('❌ Error loading tanks data:', error);
      setError(error.message);
      
      // Chỉ show alert nếu là lần đầu load hoặc manual refresh
      if (loading || refreshing) {
        Alert.alert('Lỗi', 'Không thể tải dữ liệu tank. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  };

  const getAllTanksStatus = async () => {
    const tanks = [];
    
    // Load data parallel thay vì sequential để tăng tốc
    const tankPromises = [];
    for (let tankNumber = 1; tankNumber <= 17; tankNumber++) {
      tankPromises.push(getTankStatus(tankNumber));
    }
    
    const tankResults = await Promise.allSettled(tankPromises);
    
    tankResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        tanks.push(result.value);
      } else {
        console.error(`❌ Failed to load tank ${index + 1}:`, result.reason);
        // Add empty tank data if failed
        tanks.push({
          tankNumber: index + 1,
          status: 'error',
          capacity: TANK_CONFIG[index + 1].capacity,
          currentVolume: 0,
          initialVolume: 0,
          filteredVolume: 0,
          fillPercentage: 0,
          temperature: null,
          pressure: 0,
          beerType: null,
          batchCount: 0,
          latestBatch: null,
          lastFillDate: null,
          lastFilterDate: null
        });
      }
    });
    
    return tanks.sort((a, b) => a.tankNumber - b.tankNumber);
  };

  const getTankStatus = async (tankNumber) => {
    try {
      // 1. Get active batches for this tank
      const activeBatches = await getActiveBatchesForTank(tankNumber);
      
      if (activeBatches.length === 0) {
        // Empty tank
        return {
          tankNumber,
          status: 'empty',
          capacity: TANK_CONFIG[tankNumber].capacity,
          currentVolume: 0,
          initialVolume: 0,
          filteredVolume: 0,
          fillPercentage: 0,
          temperature: null,
          pressure: 0,
          beerType: null,
          batchCount: 0,
          latestBatch: null,
          lastFillDate: null,
          lastFilterDate: null
        };
      }

      // 2. Calculate initial volume and metadata
      let totalInitialVolume = 0;
      let latestBatch = null;
      let lastFillDate = null;
      let beerType = 'river';
      let latestCreatedAt = null;
      let allBatchNumbers = [];
      let allFileDates = [];
      
      activeBatches.forEach(batch => {
        // Only use field_103 for initial volume
        const batchVolume = parseFloat(batch.field_103 || 0);
        totalInitialVolume += batchVolume;
        
        console.log(`🍺 Tank ${tankNumber} - Batch ${batch.field_002 || batch.me_so}: ${batchVolume}L (from field_103)`);
        
        // Track all batch numbers
        const batchNumber = batch.field_002 || batch.me_so;
        if (batchNumber) {
          allBatchNumbers.push(batchNumber);
        }
        
        // Extract date from filename (YYYY-MM-DD format)
        const filename = batch.filename || '';
        const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          allFileDates.push(dateMatch[1]);
        }
        
        // Get latest batch info based on created_at
        const createdAt = batch.created_at || batch.ngay_nau || '';
        if (!latestCreatedAt || createdAt > latestCreatedAt) {
          latestCreatedAt = createdAt;
          latestBatch = batchNumber || 'Unknown';
          lastFillDate = batch.field_001 || batch.ngay_nau || null;
          beerType = batch.beer_type || 'river';
        }
      });
      
      // Determine display date from filenames
      let displayDate = null;
      if (allFileDates.length > 0) {
        // Check if all dates are the same
        const uniqueDates = [...new Set(allFileDates)];
        if (uniqueDates.length === 1) {
          // All batches have same date
          displayDate = uniqueDates[0];
        } else {
          // Multiple dates, take the latest one
          displayDate = uniqueDates.sort().pop();
        }
        
        // Convert YYYY-MM-DD to DD/MM/YYYY
        const [year, month, day] = displayDate.split('-');
        displayDate = `${day}/${month}/${year}`;
      }
      
      console.log(`📊 Tank ${tankNumber} - Total initial volume: ${totalInitialVolume}L from ${activeBatches.length} batches`);
      
      // 3. Get filtered volume from QA logs
      const filteredVolume = await getFilteredVolume(tankNumber);
      console.log(`🧽 Tank ${tankNumber} - Filtered volume: ${filteredVolume}L`);
      
      // 4. Calculate current volume = initial - filtered
      const currentVolume = Math.max(0, totalInitialVolume - filteredVolume);
      
      // 5. Calculate fill percentage based on current vs capacity (not initial)
      const fillPercentage = TANK_CONFIG[tankNumber].capacity > 0 ? 
        (currentVolume / TANK_CONFIG[tankNumber].capacity) * 100 : 0;
      
      // 6. Get temperature and pressure from latest metrics
      const { temperature, pressure } = await getLatestTankMetrics(tankNumber);
      
      // 7. Create display string for all batches with # prefix
      const batchDisplay = allBatchNumbers.length > 0 ? 
        allBatchNumbers.map(num => `#${num}`).join(', ') :
        '#Unknown';
      
      const result = {
        tankNumber,
        status: currentVolume > 0 ? 'active' : 'empty',
        capacity: TANK_CONFIG[tankNumber].capacity,
        currentVolume,
        initialVolume: totalInitialVolume,
        filteredVolume,
        fillPercentage,
        temperature: temperature || 10,
        pressure: pressure || 0,
        beerType,
        batchCount: activeBatches.length,
        latestBatch: batchDisplay, // Show all batches with # prefix
        lastFillDate: displayDate, // Use date from filename
        lastFilterDate: null,
        allBatches: allBatchNumbers // Keep for reference
      };
      
      console.log(`✅ Tank ${tankNumber} status:`, {
        batches: activeBatches.length,
        initial: totalInitialVolume,
        filtered: filteredVolume,
        current: currentVolume,
        percentage: fillPercentage.toFixed(1)
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error getting tank ${tankNumber} status:`, error);
      return {
        tankNumber,
        status: 'error',
        capacity: TANK_CONFIG[tankNumber].capacity,
        currentVolume: 0,
        initialVolume: 0,
        filteredVolume: 0,
        fillPercentage: 0,
        temperature: null,
        pressure: 0,
        beerType: null,
        batchCount: 0,
        latestBatch: null,
        lastFillDate: null,
        lastFilterDate: null,
        error: error.message
      };
    }
  };

  // API call to get active batches for specific tank
  const getActiveBatchesForTank = async (tankNumber) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chebien/active/tank/${tankNumber}`, {
        timeout: 10000 // 10 second timeout
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No batches found is OK
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const batches = data.batches || [];
      
      console.log(`📋 Tank ${tankNumber}: Found ${batches.length} active batches`);
      return batches;
      
    } catch (error) {
      console.error(`❌ Error getting active batches for tank ${tankNumber}:`, error);
      return [];
    }
  };

  // API call to get filtered volume from QA logs
  const getFilteredVolume = async (tankNumber) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/qa/filtered-volume/tank/${tankNumber}`, {
        timeout: 10000
      });
      
      if (!response.ok) {
        return 0; // Return 0 if no filter data found
      }
      
      const data = await response.json();
      const totalFiltered = data.totalFiltered || 0;
      
      console.log(`🧽 Tank ${tankNumber}: Filtered ${totalFiltered}L`);
      return totalFiltered;
      
    } catch (error) {
      console.error(`❌ Error getting filtered volume for tank ${tankNumber}:`, error);
      return 0;
    }
  };

  // API call to get latest temperature and pressure from metrics
  const getLatestTankMetrics = async (tankNumber) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/qa/tank-metrics/tank/${tankNumber}`, {
        timeout: 5000
      });
      
      if (!response.ok) {
        return { temperature: 10, pressure: 0 };
      }
      
      const data = await response.json();
      return {
        temperature: data.temperature || 10,
        pressure: data.pressure || 0
      };
      
    } catch (error) {
      console.error(`❌ Error getting tank metrics for tank ${tankNumber}:`, error);
      return { temperature: 10, pressure: 0 };
    }
  };

  const onRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    await loadTanksData();
  };

  const getTemperatureDisplay = (temp) => {
    if (temp === null || temp === undefined) return { text: '--°C', color: '#999' };
    
    return { 
      text: `${temp.toFixed(1)}°C`, 
      color: getTankColor(temp) 
    };
  };

  // Simple rectangular tank design
  const TankComponent = ({ tank }) => {
    // Calculate fill height based on current volume vs capacity
    const fillHeight = Math.max((tank.currentVolume / tank.capacity) * 80, 0); // 80% max height for liquid
    const tankColor = getTankColor(tank.temperature);
    const tempDisplay = getTemperatureDisplay(tank.temperature);
    
    return (
      <TouchableOpacity
        style={styles.tankWrapper}
        onPress={() => setSelectedTank(tank.tankNumber)}
        activeOpacity={0.7}
      >
        {/* Simple rectangular tank */}
        <View style={styles.tankContainer}>
          <View style={[styles.tankBody, { borderColor: '#333' }]}>
            /* Beer fill - height based on current volume */}
            {tank.currentVolume > 0 && (
              <View style={[
                styles.tankFill,
                {
                  height: `${fillHeight}%`,
                  backgroundColor: tankColor,
                  opacity: 0.8
                }
              ]} />
            )}
            
            {/* Tank number overlay */}
            <View style={styles.tankNumberOverlay}>
              <Text style={styles.tankNumberText}>{tank.tankNumber}</Text>
            </View>
          </View>
        </View>
        
        {/* Tank info */}
        <View style={styles.tankInfo}>
          <Text style={styles.tankNumber}>Tank {tank.tankNumber}</Text>
          
          {tank.status === 'active' ? (
            <View style={styles.tankDetailsContainer}>
              <View style={styles.beerTypeContainer}>
                <Text style={styles.beerTypeIcon}>
                  {getBeerTypeIcon(tank.beerType)}
                </Text>
                <Text style={styles.beerTypeName}>
                  {tank.beerType?.toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>
              
              {/* Display date from filename */}
              {tank.lastFillDate && (
                <Text style={styles.fillDate}>
                  {tank.lastFillDate}
                </Text>
              )}
              
              {/* Current volume in liters */}
              <Text style={styles.volumeValue}>
                {Math.round(tank.currentVolume)}
              </Text>
              
              <Text style={[styles.temperatureValue, { color: tempDisplay.color }]}>
                {tempDisplay.text}
              </Text>
              
              <Text style={styles.pressureValue}>
                {tank.pressure.toFixed(0)} Bar
              </Text>
              
              {/* Batch numbers with # prefix */}
              <Text style={styles.metadataText}>
                {tank.latestBatch}
              </Text>
            </View>
          ) : tank.status === 'error' ? (
            <View style={styles.errorTankContainer}>
              <Text style={styles.errorTankIcon}>⚠️</Text>
              <Text style={styles.errorTankText}>LỖI KẾT NỐI</Text>
              <Text style={styles.errorTankDetail}>
                {tank.error || 'Không thể tải dữ liệu'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyTankContainer}>
              <Text style={styles.emptyTankIcon}>🏮</Text>
              <Text style={styles.emptyTankText}>TRỐNG</Text>
              <Text style={styles.emptyTankCapacity}>
                {formatVolume(tank.capacity)}L
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && tanksData.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🔄 Đang tải dữ liệu tank từ server...</Text>
        <Text style={styles.loadingSubtext}>Vui lòng đợi trong giây lát</Text>
      </View>
    );
  }

  // Calculate summary stats
  const activeTanks = tanksData.filter(t => t.status === 'active').length;
  const totalCurrentVolume = tanksData.reduce((sum, t) => sum + t.currentVolume, 0);
  const totalFilteredVolume = tanksData.reduce((sum, t) => sum + t.filteredVolume, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏭 Trạng thái Tank Bia</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatValue}>
              {activeTanks}
            </Text>
            <Text style={styles.headerStatLabel}>Đang hoạt động</Text>
          </View>
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatValue}>
              {formatVolume(totalCurrentVolume)}L
            </Text>
            <Text style={styles.headerStatLabel}>Bia hiện tại</Text>
          </View>
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatValue}>
              {formatVolume(totalFilteredVolume)}L
            </Text>
            <Text style={styles.headerStatLabel}>Đã lọc</Text>
          </View>
        </View>
        
        {/* Error indicator */}
        {error && (
          <View style={styles.errorIndicator}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}
      </View>

      {/* Tanks List - Using FlatList */}
      <FlatList
        data={tanksData}
        keyExtractor={(item) => `tank_${item.tankNumber}`}
        renderItem={({ item }) => <TankComponent tank={item} />}
        numColumns={2}
        contentContainerStyle={styles.tanksList}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor='#007AFF'
          />
        }
        columnWrapperStyle={styles.row}
        removeClippedSubviews={true} // Optimize performance
        maxToRenderPerBatch={10} // Render fewer items per batch
        windowSize={10} // Reduce memory usage
      />

      {/* Tank Options Modal */}
      <Modal visible={!!selectedTank} transparent animationType="fade">
        <TankOptionsPopup 
          tankNumber={selectedTank}
          tankData={tanksData.find(t => t.tankNumber === selectedTank)}
          onClose={() => setSelectedTank(null)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center'
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e1e1e1'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  headerStatItem: {
    alignItems: 'center'
  },
  headerStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  headerStatLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  errorIndicator: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336'
  },
  errorText: {
    color: '#c62828',
    fontSize: 12,
    textAlign: 'center'
  },
  tanksList: {
    padding: 16
  },
  row: {
    justifyContent: 'space-around'
  },
  tankWrapper: {
    width: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center'
  },
  tankContainer: {
    alignItems: 'center',
    marginBottom: 12
  },
  tankBody: {
    width: 80,
    height: 120,
    borderWidth: 3,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative'
  },
  tankFill: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderRadius: 3
  },
  tankNumberOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  tankNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  tankInfo: {
    alignItems: 'center',
    width: '100%'
  },
  tankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  tankDetailsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 4
  },
  beerTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4
  },
  beerTypeIcon: {
    fontSize: 16,
    marginRight: 4
  },
  beerTypeName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333'
  },
  fillDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4
  },
  volumeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2'
  },
  volumeDetail: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500'
  },
  initialVolume: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic'
  },
  filteredVolume: {
    fontSize: 11,
    color: '#4caf50',
    fontWeight: '500'
  },
  temperatureValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2
  },
  pressureValue: {
    fontSize: 11,
    color: '#7b1fa2',
    fontWeight: '500',
    marginTop: 1
  },
  metadataText: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center'
  },
  emptyTankContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  emptyTankIcon: {
    fontSize: 24,
    marginBottom: 4
  },
  emptyTankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 4
  },
  emptyTankCapacity: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center'
  },
  errorTankContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  errorTankIcon: {
    fontSize: 24,
    marginBottom: 4
  },
  errorTankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 4
  },
  errorTankDetail: {
    fontSize: 10,
    color: '#f44336',
    textAlign: 'center'
  }
});