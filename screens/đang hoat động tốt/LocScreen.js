// LocScreen.js - Fixed file saving logic for server backend
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, FlatList, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import BatchFileManager from '../utils/BatchFileManager';

export default function LocScreen({ route }) {
  const { tankNumber } = route.params;
  const [data, setData] = useState([]);
  const [bbt, setBbt] = useState('');
  const [volume, setVolume] = useState('');
  const [co2, setCO2] = useState('');
  const [daDong, setDaDong] = useState(false);
  const [reload, setReload] = useState(false);
  const [activeBatches, setActiveBatches] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error

  const DATA_DIR = FileSystem.documentDirectory + 'qa/';
  const today = new Date().toISOString().slice(0, 10);
  const fileName = `loc_tank${tankNumber}_day_${today}.json`;
  const filePath = DATA_DIR + fileName;

  useEffect(() => {
    initializeScreen();
  }, [reload]);

  const initializeScreen = async () => {
    try {
      // 1. Load local file first
      await loadFile();
      
      // 2. Load active batches from API
      await loadActiveBatches();
      
      // 3. Sync with server on startup
      await syncFromServerOnStartup();
      
    } catch (error) {
      console.error('Error initializing LocScreen:', error);
    }
  };

  const loadFile = async () => {
    try {
      await FileSystem.makeDirectoryAsync(DATA_DIR, { intermediates: true });
      const exists = await FileSystem.getInfoAsync(filePath);
      if (exists.exists) {
        const content = await FileSystem.readAsStringAsync(filePath);
        const json = JSON.parse(content);
        setData(json.lo_list || []);
        setDaDong(json.da_dong || false);
        console.log(`📁 Loaded local filter file: ${fileName}`);
      }
    } catch (e) {
      console.log(`📭 No local filter file found: ${fileName}`);
    }
  };

  const loadActiveBatches = async () => {
    try {
      // Load from server API instead of local files
      const response = await fetch(`http://localhost:5000/api/chebien/active/tank/${tankNumber}`);
      
      if (response.ok) {
        const result = await response.json();
        const batches = result.batches || [];
        setActiveBatches(batches);
        console.log(`📋 Found ${batches.length} active batches for tank ${tankNumber} from server`);
      } else {
        console.log(`No active batches found for tank ${tankNumber}`);
        setActiveBatches([]);
      }
    } catch (error) {
      console.error('Error loading active batches from server:', error);
      // Fallback to local method
      try {
        const batches = await BatchFileManager.getActiveBatchesForTank(tankNumber);
        setActiveBatches(batches);
        console.log(`📋 Fallback: Found ${batches.length} active batches locally`);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setActiveBatches([]);
      }
    }
  };

  // Sync from server on app startup - load existing filter data
  const syncFromServerOnStartup = async () => {
    try {
      setSyncStatus('syncing');
      console.log(`🔄 Checking for existing filter data on server for tank ${tankNumber}...`);
      
      // Try to get existing filter logs from server (new format)
      const response = await fetch(`http://localhost:5000/api/qa/filter-logs/tank/${tankNumber}/date/${today}`, {
        method: 'GET',
        timeout: 10000
      });

      if (response.ok) {
        const serverData = await response.json();
        
        if (serverData.success && serverData.data) {
          // Server has existing data, use it
          const serverFilterData = serverData.data.lo_list || [];
          const serverClosed = serverData.data.da_dong || false;
          
          // Only update if server has more data or different state
          if (serverFilterData.length > data.length || serverClosed !== daDong) {
            setData(serverFilterData);
            setDaDong(serverClosed);
            
            // Save server data to local file for offline use
            const localFileData = {
              tank: tankNumber,
              ngay: today,
              lo_list: serverFilterData,
              da_dong: serverClosed,
              total_volume_filtered: serverData.data.total_volume_filtered || 0,
              synced_from_server: true,
              server_files: serverData.data.files_included || []
            };
            await saveToLocalFileOnly(localFileData);
            
            console.log(`✅ Synced existing filter data from server: ${serverFilterData.length} entries`);
            console.log(`📁 Server files: ${serverData.data.files_included?.join(', ')}`);
            setSyncStatus('success');
          } else {
            console.log(`📊 Local data is up to date with server`);
            setSyncStatus('success');
          }
        } else {
          console.log(`📭 No existing filter data on server for tank ${tankNumber} on ${today}`);
          setSyncStatus('idle');
        }
      } else if (response.status === 404) {
        console.log(`📭 No filter logs found on server for tank ${tankNumber}`);
        setSyncStatus('idle');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error syncing from server:', error);
      setSyncStatus('error');
      // Continue with local data, don't block the UI
    }
  };

  const saveFile = async (newData, closed = daDong) => {
    const fileData = {
      tank: tankNumber,
      ngay: today,
      lo_list: newData,
      da_dong: closed,
      total_volume_filtered: newData.reduce((sum, item) => sum + parseFloat(item.volume || 0), 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Save to local file first (for offline capability)
      await saveToLocalFileOnly(fileData);
      
      // 2. Sync to server backend (this saves the file to server's data/qa/ folder)
      await syncToServerBackend(fileData);
      
      // 3. Reload UI
      setReload(r => !r);
      
    } catch (error) {
      console.error('Error saving filter file:', error);
      Alert.alert('Lỗi', 'Có lỗi khi lưu dữ liệu: ' + error.message);
    }
  };

  const saveToLocalFileOnly = async (fileData) => {
    try {
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(fileData, null, 2));
      console.log(`💾 Saved filter data to local file: ${fileName}`);
    } catch (error) {
      console.error('❌ Error saving to local file:', error);
      throw new Error('Không thể lưu file local: ' + error.message);
    }
  };

  // FIXED: Sync to server backend (saves to individual files with correct format)
  const syncToServerBackend = async (fileData) => {
    try {
      setSyncStatus('syncing');
      
      const response = await fetch('http://localhost:5000/api/qa/save-consolidated-filter-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tank_number: tankNumber,
          date: today,
          filter_data: fileData // The consolidated filter log data
        }),
        timeout: 15000
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Synced filter data to server backend:', result.message);
        console.log(`📁 Individual files created: ${result.individual_files?.join(', ')}`);
        console.log(`📄 Summary file: ${result.summary_file}`);
        setSyncStatus('success');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error syncing to server backend:', error);
      setSyncStatus('error');
      
      // Show warning but don't block operation
      Alert.alert(
        'Cảnh báo', 
        `Dữ liệu đã lưu local nhưng chưa sync lên server backend.\nLỗi: ${error.message}\n\nFile local vẫn có thể sử dụng offline.`
      );
    }
  };

  const handleAdd = async () => {
    if (!bbt || !volume || !co2) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ BBT, thể tích và CO₂');
      return;
    }
    
    const volumeNum = parseFloat(volume);
    if (isNaN(volumeNum) || volumeNum <= 0) {
      Alert.alert('Lỗi', 'Thể tích phải là số dương');
      return;
    }

    const filtered = data.filter(d => d.bbt === bbt);
    const nextStt = filtered.length + 1;
    const newCode = `${tankNumber}.${bbt}.${nextStt}`;
    const now = new Date();
    const newItem = {
      code: newCode,
      bbt,
      volume: volumeNum.toString(),
      co2,
      time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.toISOString()
    };

    const updated = [...data, newItem];
    await saveFile(updated);
    setBbt('');
    setVolume('');
    setCO2('');
    
    console.log(`✅ Added filter batch: ${newCode} - ${volumeNum}L`);
  };

  const handleClose = async () => {
    // Calculate total filtered volume
    const totalFiltered = data.reduce((sum, item) => sum + parseFloat(item.volume || 0), 0);
    
    // Show summary before closing
    Alert.alert(
      'Xác nhận đóng nhật ký lọc',
      `Tank ${tankNumber} - ${today}\n\n` +
      `📊 Tổng kết:\n` +
      `• Số lô đã lọc: ${data.length}\n` +
      `• Tổng thể tích lọc: ${totalFiltered.toFixed(1)}L\n` +
      `• Phiếu nấu đang hoạt động: ${activeBatches.length}\n\n` +
      `Sau khi đóng nhật ký:\n` +
      `• Tank sẽ được đánh dấu "Hoàn thành lọc"\n` +
      `• Các phiếu nấu sẽ được chuyển từ "active" sang "completed"\n` +
      `• Tank sẽ sẵn sàng cho mẻ mới\n\n` +
              `Dữ liệu sẽ được lưu tại server backend theo format:\n` +
        `• Individual files: {tank}_{BBT}_{STT}_day_{date}.json\n` +
        `• Summary file: summary_tank{tank}_day_{date}.json\n\n` +
      `Bạn có chắc chắn?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đóng nhật ký', 
          style: 'destructive',
          onPress: async () => {
            await confirmCloseLog(totalFiltered);
          }
        }
      ]
    );
  };

  const confirmCloseLog = async (totalFiltered) => {
    try {
      console.log(`🔄 Closing filter log for tank ${tankNumber}...`);
      
      // 1. Save final filter log with closed status
      await saveFile(data, true);
      
      // 2. Call API to move batches from active to completed folder
      const moveResponse = await fetch(`http://localhost:5000/api/chebien/move-to-completed/tank/${tankNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tank_number: tankNumber,
          total_filtered: totalFiltered,
          filter_date: today,
          operator: 'QA_User' // TODO: get from user context
        }),
      });
      
      let movedCount = 0;
      if (moveResponse.ok) {
        const moveResult = await moveResponse.json();
        movedCount = moveResult.moved_count || 0;
        console.log(`✅ API moved ${movedCount} batches from active to completed folder`);
      } else {
        console.warn('⚠️ API call to move batches failed');
      }
      
      // 3. Update tank status locally
      await updateTankStatusLocal(totalFiltered, movedCount);
      
      // 4. Show completion message
      Alert.alert(
        'Hoàn thành lọc',
        `🎉 Tank ${tankNumber} đã hoàn thành lọc!\n\n` +
        `📊 Kết quả:\n` +
        `• Đã lọc ${totalFiltered.toFixed(1)}L bia\n` +
        `• Đã chuyển ${movedCount} phiếu nấu\n` +
        `• Tank sẵn sàng cho mẻ mới\n\n` +
        `📁 Dữ liệu đã lưu tại:\n` +
        `• Server backend: data/qa/loc/ (individual files)\n` +
        `• Phiếu nấu: data/chebien/completed/\n` +
        `• Local app: qa/${fileName}`
      );
      
      // Reload data
      setReload(r => !r);
      loadActiveBatches();
      
    } catch (error) {
      console.error('❌ Error closing filter log:', error);
      Alert.alert(
        'Lỗi khi đóng nhật ký',
        `Có lỗi xảy ra: ${error.message}\n\nVui lòng thử lại hoặc liên hệ admin.`
      );
    }
  };

  const updateTankStatusLocal = async (totalFiltered, movedBatches) => {
    try {
      // Save tank completion status locally (for reference)
      const tankStatusDir = FileSystem.documentDirectory + 'qa/tank_status/';
      await FileSystem.makeDirectoryAsync(tankStatusDir, { intermediates: true });
      
      const tankStatusFile = tankStatusDir + `tank_${tankNumber}_completion.json`;
      const statusData = {
        tank_number: tankNumber,
        completion_date: today,
        total_filtered_volume: totalFiltered,
        batches_moved: movedBatches,
        filter_log_file: fileName,
        server_path: `data/qa/loc/individual_files`,
        completed_at: new Date().toISOString(),
        status: 'completed'
      };
      
      await FileSystem.writeAsStringAsync(tankStatusFile, JSON.stringify(statusData, null, 2));
      console.log(`💾 Saved tank ${tankNumber} completion status locally`);
      
    } catch (error) {
      console.error('Error saving tank status:', error);
      // Non-critical error, don't throw
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return '#FF9800';
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      default: return '#666';
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return '🔄 Đang đồng bộ với server backend...';
      case 'success': return '✅ Đã đồng bộ với server backend';
      case 'error': return '❌ Lỗi đồng bộ (chỉ lưu local)';
      default: return '💾 Chỉ lưu local';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.code}>{item.code}</Text>
      <Text style={styles.text}>BBT: {item.bbt}</Text>
      <Text style={styles.text}>Thể tích: {item.volume}L</Text>
      <Text style={styles.text}>CO₂: {item.co2}</Text>
      <Text style={styles.text}>Giờ: {item.time}</Text>
    </View>
  );

  return (
    <View style={{ padding: 16 }}>
      <Text style={styles.title}>Nhật ký lọc – Tank {tankNumber} – Ngày {today}</Text>
      
      {/* Sync Status Indicator */}
      <View style={[styles.syncStatus, { backgroundColor: getSyncStatusColor() }]}>
        <Text style={styles.syncStatusText}>{getSyncStatusText()}</Text>
        <Text style={styles.syncStatusPath}>
          📁 Server: data/qa/loc/ (individual files)
        </Text>
      </View>
      
      {/* Tank Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          📋 Phiếu nấu đang hoạt động: {activeBatches.length}
        </Text>
        {activeBatches.length > 0 && (
          <Text style={styles.infoSubtext}>
            Mẻ: {activeBatches.map(b => b.field_002 || b.me_so || 'Unknown').join(', ')}
          </Text>
        )}
        <Text style={styles.infoText}>
          🧽 Đã lọc: {data.reduce((sum, item) => sum + parseFloat(item.volume || 0), 0).toFixed(1)}L
        </Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.code}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ fontStyle: 'italic', color: '#888', textAlign: 'center', padding: 20 }}>
            Chưa có lô lọc nào hôm nay
          </Text>
        }
        style={styles.list}
      />

      {!daDong && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.sectionTitle}>➕ Thêm lô lọc mới</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={bbt}
                onChangeText={setBbt}
                placeholder="BBT số"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                value={volume}
                onChangeText={setVolume}
                placeholder="Số lít"
                style={styles.input}
                keyboardType="numeric"
              />
              <TextInput
                value={co2}
                onChangeText={setCO2}
                placeholder="CO₂"
                style={styles.input}
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <Button title="➕ Thêm lô lọc" onPress={handleAdd} />
          <View style={{ height: 10 }} />
          <Button 
            title="✅ Đóng nhật ký lọc (Hoàn thành tank)" 
            color="#FF3B30" 
            onPress={handleClose} 
          />
        </>
      )}

      {daDong && (
        <View style={styles.completedContainer}>
          <Text style={styles.completedText}>✅ Tank đã hoàn thành lọc</Text>
          <Text style={styles.completedSubtext}>
            Tổng: {data.reduce((sum, item) => sum + parseFloat(item.volume || 0), 0).toFixed(1)}L đã lọc
          </Text>
          <Text style={styles.completedPath}>
            📁 Dữ liệu tại: data/qa/loc/ (individual files)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  syncStatus: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: 'center'
  },
  syncStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  syncStatusPath: {
    color: 'white',
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  infoSubtext: {
    fontSize: 12,
    color: '#666',
    marginLeft: 16,
    marginBottom: 4
  },
  list: {
    maxHeight: 300,
    marginBottom: 16
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    paddingVertical: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4
  },
  code: { fontWeight: 'bold', fontSize: 16, color: '#007AFF' },
  text: { fontSize: 14, marginTop: 2 },
  inputContainer: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333'
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
    width: '30%',
    backgroundColor: '#fff'
  },
  completedContainer: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  completedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4
  },
  completedSubtext: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4
  },
  completedPath: {
    fontSize: 12,
    color: '#2e7d32',
    fontStyle: 'italic'
  }
});