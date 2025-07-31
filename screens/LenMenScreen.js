// LenMenScreen.js - Fixed VirtualizedList issue
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system';
import BatchFileManager from '../utils/BatchFileManager';

export default function LenMenScreen({ route }) {
  const { tankNumber } = route.params;
  const [meSoList, setMeSoList] = useState([]);
  const [currentMe, setCurrentMe] = useState('');
  const [meInfo, setMeInfo] = useState({});
  const [logCreated, setLogCreated] = useState(false);
  const [logData, setLogData] = useState({});
  const [activeBatches, setActiveBatches] = useState([]);
  const [dayInputs, setDayInputs] = useState([]);

  const DATA_DIR = FileSystem.documentDirectory + 'qa/';

  useEffect(() => {
    loadActiveBatches();
  }, []);

  const loadActiveBatches = async () => {
    try {
      // Call API instead of local BatchFileManager
      const response = await fetch(`https://api.ibb.vn/api/chebien/active/tank/${tankNumber}`);
      
      if (response.ok) {
        const result = await response.json();
        const batches = result.batches || [];
        setActiveBatches(batches);
        console.log(`📋 Found ${batches.length} active batches for tank ${tankNumber}`);
        
        // Auto-populate with active batches
        if (batches.length > 0) {
          const meNumbers = batches.map(b => b.field_002 || b.me_so).filter(Boolean);
          setMeSoList(meNumbers);
          
          const meInfoMap = {};
          batches.forEach(batch => {
            const meNumber = batch.field_002 || batch.me_so;
            if (meNumber) {
              meInfoMap[meNumber] = {
                tank_so: batch.field_003 || batch.tank_so || tankNumber,
                plato_cuoi: batch.field_020 || '12',
                the_tich: parseFloat(batch.field_025 || batch.the_tich_dau || 0),
                nguoi_nhap: batch.field_004 || batch.nhan_vien || 'Unknown'
              };
            }
          });
          setMeInfo(meInfoMap);
        }
      } else {
        console.log(`No active batches found for tank ${tankNumber}`);
        setActiveBatches([]);
      }
      
    } catch (error) {
      console.error('Error loading active batches from API:', error);
      setActiveBatches([]);
    }
  };

  const handleAddMe = async () => {
    const me = currentMe.trim();
    if (!me) return;
    if (meSoList.includes(me)) {
      Alert.alert('Cảnh báo', `Đã nhập mẻ ${me} trước đó`);
      return;
    }

    // Try to find from active batches first
    const foundBatch = activeBatches.find(b => b.batchNumber === me);
    if (foundBatch) {
      setMeSoList(prev => [...prev, me]);
      setMeInfo(prev => ({
        ...prev,
        [me]: {
          tank_so: foundBatch.tankNumber,
          plato_cuoi: foundBatch.data.field_020 || '12',
          the_tich: foundBatch.volume || 0,
          nguoi_nhap: foundBatch.data.field_004 || foundBatch.data.nhan_vien || 'Unknown'
        }
      }));
      setCurrentMe('');
      return;
    }

    // Fallback: search in files (old method)
    try {
      const CHEBIEN_DIR = FileSystem.documentDirectory + 'chebien/active/';
      const fileNames = await FileSystem.readDirectoryAsync(CHEBIEN_DIR);
      let found = false;
      for (const file of fileNames) {
        if (file.endsWith('.json')) {
          const content = await FileSystem.readAsStringAsync(CHEBIEN_DIR + file);
          const data = JSON.parse(content);
          const batchNumber = data.field_002 || data.me_so;
          if (batchNumber === me) {
            setMeSoList(prev => [...prev, me]);
            setMeInfo(prev => ({
              ...prev,
              [me]: {
                tank_so: data.field_003 || data.tank_so || tankNumber,
                plato_cuoi: data.field_020 || '12',
                the_tich: parseFloat(data.field_025 || data.the_tich_dau || 0),
                nguoi_nhap: data.field_004 || data.nhan_vien || 'Unknown'
              }
            }));
            setCurrentMe('');
            found = true;
            break;
          }
        }
      }
      if (!found) {
        Alert.alert('Không tìm thấy', `Không tìm thấy dữ liệu cho mẻ ${me}`);
      }
    } catch (error) {
      console.error('Error searching batch in files:', error);
      Alert.alert('Lỗi', 'Không thể tìm kiếm dữ liệu mẻ.');
    }
  };

  // Các hàm/phần giao diện phụ bên dưới, thêm lại theo nhu cầu thực tế
  // Ví dụ: render item, nhập log, v.v.

  // ĐÂY CHỈ LÀ VÍ DỤ, BẠN BỔ SUNG GIAO DIỆN THEO ĐÚNG CODE CŨ CỦA BẠN
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nhật ký lên men - Tank {tankNumber}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Nhập số mẻ"
          value={currentMe}
          onChangeText={setCurrentMe}
        />
        <Button title="Thêm mẻ" onPress={handleAddMe} />
      </View>
      <FlatList
        data={meSoList}
        keyExtractor={item => item}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.meText}>Mẻ: {item}</Text>
            <Text>Tank: {meInfo[item]?.tank_so || ''}</Text>
            <Text>Plato cuối: {meInfo[item]?.plato_cuoi || ''}</Text>
            <Text>Thể tích: {meInfo[item]?.the_tich || ''}</Text>
            <Text>Người nhập: {meInfo[item]?.nguoi_nhap || ''}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{textAlign:'center'}}>Chưa có mẻ nào được nhập</Text>}
      />
      {/* Các chức năng khác như nhập log, lưu file, tạo nhật ký... bạn bổ sung hoặc copy lại từ code cũ nếu cần */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 8, marginRight: 8 },
  item: { padding: 10, marginBottom: 8, backgroundColor: '#f7f7f7', borderRadius: 8 },
  meText: { fontWeight: 'bold', fontSize: 16 }
});
