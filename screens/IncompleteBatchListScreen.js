// IncompleteBatchListScreen.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import * as FileSystem from 'expo-file-system';

const DATA_DIR = FileSystem.documentDirectory + 'chebien/';

// Danh sách field bắt buộc để kiểm tra tính hoàn thành
const REQUIRED_FIELDS = [
  'field_002', // Mẻ nấu số
  'field_003', // Tank số
  'field_005', // Nhiệt độ nước xuống gạo
  'field_007', // pH nước nấu
  'field_008', // TDS nước nấu
  'field_010', // Giờ bắt đầu xuống bột gạo
  'field_011', // Giờ kết thúc xuống bột gạo
  'field_013', // Giờ bắt đầu giữ nhiệt 90°C
  // Có thể thêm nhiều field khác tùy yêu cầu
];

export default function IncompleteBatchListScreen({ route, navigation }) {
  const { user } = route.params || {};
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadIncompleteFiles();
  }, []);

  const loadIncompleteFiles = async () => {
    try {
      setLoading(true);
      
      // Tạo thư mục nếu chưa có
      await FileSystem.makeDirectoryAsync(DATA_DIR, { intermediates: true });
      
      const fileNames = await FileSystem.readDirectoryAsync(DATA_DIR);
      const incompleteFiles = [];

      for (const file of fileNames) {
        if (file.endsWith('.json')) {
          try {
            const content = await FileSystem.readAsStringAsync(DATA_DIR + file);
            const data = JSON.parse(content);
            
            // Kiểm tra các field bắt buộc
            const missingFields = [];
            const emptyFields = [];
            
            REQUIRED_FIELDS.forEach(fieldId => {
              if (!data.hasOwnProperty(fieldId)) {
                missingFields.push(fieldId);
              } else if (!data[fieldId] || data[fieldId] === '' || data[fieldId] === null) {
                emptyFields.push(fieldId);
              }
            });
            
            // Nếu có field thiếu hoặc rỗng thì coi là chưa hoàn thành
            if (missingFields.length > 0 || emptyFields.length > 0) {
              const meSo = data.field_002 || data.me_so || '???';
              const ngay = data.field_001 || data.ngay_nau || 'Không rõ ngày';
              const tankSo = data.field_003 || data.tank_so || '';
              const nhanVien = data.field_004 || data.nhan_vien || '';
              const createdAt = data.created_at || '';
              
              incompleteFiles.push({
                file,
                data,
                meSo,
                ngay, 
                tankSo,
                nhanVien,
                createdAt,
                missingFields,
                emptyFields,
                totalMissing: missingFields.length + emptyFields.length,
                label: `Mẻ ${meSo} - Tank ${tankSo} - ${ngay}`
              });
            }
          } catch (parseError) {
            console.error(`Lỗi parse file ${file}:`, parseError);
            // File lỗi cũng coi là chưa hoàn thành
            incompleteFiles.push({
              file,
              data: null,
              meSo: '???',
              ngay: 'Lỗi file',
              tankSo: '',
              nhanVien: '',
              createdAt: '',
              missingFields: [],
              emptyFields: [],
              totalMissing: 999, // Đánh dấu file lỗi
              label: `❌ ${file} (Lỗi parse)`
            });
          }
        }
      }

      // Sắp xếp theo số lượng field thiếu (ít thiếu nhất trước)
      incompleteFiles.sort((a, b) => {
        if (a.totalMissing === 999) return 1; // File lỗi xuống cuối
        if (b.totalMissing === 999) return -1;
        return a.totalMissing - b.totalMissing;
      });

      setFiles(incompleteFiles);
    } catch (error) {
      console.error('Lỗi đọc file:', error);
      Alert.alert('Lỗi', 'Không thể đọc danh sách phiếu chưa hoàn thành');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncompleteFiles();
    setRefreshing(false);
  };

  const handleContinueEdit = (item) => {
    if (!item.data) {
      Alert.alert('Lỗi', 'File này bị hỏng và không thể chỉnh sửa');
      return;
    }

    Alert.alert(
      'Tiếp tục nhập liệu',
      `Phiếu mẻ ${item.meSo} thiếu ${item.totalMissing} thông tin.\nBạn có muốn tiếp tục nhập liệu?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiếp tục',
          onPress: () => {
            // Navigate về RiverScreen với dữ liệu hiện tại
            navigation.navigate('RiverScreen', {
              editMode: true,
              batchData: item.data,
              fileName: item.file,
              user
            });
          }
        }
      ]
    );
  };

  const getMissingFieldsText = (item) => {
    if (item.totalMissing === 999) return 'File bị lỗi';
    
    const missing = [...item.missingFields, ...item.emptyFields];
    if (missing.length <= 3) {
      return `Thiếu: ${missing.join(', ')}`;
    } else {
      return `Thiếu ${missing.length} thông tin`;
    }
  };

  const getProgressPercent = (item) => {
    if (item.totalMissing === 999) return 0;
    const totalFields = REQUIRED_FIELDS.length;
    const completedFields = totalFields - item.totalMissing;
    return Math.round((completedFields / totalFields) * 100);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Đang kiểm tra phiếu chưa hoàn thành...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>📝 Phiếu chưa hoàn thành</Text>
        <Text style={styles.subtitle}>
          {files.length} phiếu cần hoàn thiện
        </Text>
      </View>

      {files.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🎉 Tất cả phiếu đã hoàn thành!</Text>
          <Text style={styles.emptySubtext}>
            Không có phiếu nào thiếu thông tin bắt buộc
          </Text>
        </View>
      ) : (
        files.map((item, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={styles.item}
            onPress={() => handleContinueEdit(item)}
          >
            <View style={styles.itemContent}>
              <View style={styles.itemHeader}>
                <Text style={styles.batchTitle}>{item.label}</Text>
                <Text style={styles.progressText}>
                  {getProgressPercent(item)}%
                </Text>
              </View>
              
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${getProgressPercent(item)}%` }
                  ]} 
                />
              </View>
              
              <Text style={styles.missingText}>
                {getMissingFieldsText(item)}
              </Text>
              
              {item.nhanVien && (
                <Text style={styles.itemDetail}>👤 {item.nhanVien}</Text>
              )}
              
              {item.createdAt && (
                <Text style={styles.itemDetail}>
                  🕒 {new Date(item.createdAt).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>

            <View style={styles.actionButton}>
              <Text style={styles.actionButtonText}>➡️</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Nhấn vào phiếu để tiếp tục nhập liệu • Kéo xuống để làm mới
        </Text>
        <Text style={styles.footerNote}>
          💡 Phiếu sẽ tự động chuyển sang "Hoàn thành" khi đủ thông tin bắt buộc
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1'
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#333'
  },
  subtitle: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 4,
    fontWeight: '600'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  },
  item: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flex: 1
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  batchTitle: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800'
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 2
  },
  missingText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500',
    marginBottom: 4
  },
  itemDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  actionButton: {
    padding: 8,
    marginLeft: 12
  },
  actionButtonText: {
    fontSize: 20,
    color: '#FF9800'
  },
  footer: {
    padding: 20,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8
  },
  footerNote: {
    fontSize: 11,
    color: '#4CAF50',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});