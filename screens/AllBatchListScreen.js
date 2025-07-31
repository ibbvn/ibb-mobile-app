// AllBatchListScreen.js - Fixed with new directory structure
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

const ACTIVE_DIR = FileSystem.documentDirectory + 'chebien/active/';
const COMPLETED_DIR = FileSystem.documentDirectory + 'chebien/completed/';

export default function AllBatchListScreen({ route, navigation }) {
  const { user } = route.params || {};
  const isAdmin = user?.role === 'admin';
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('active'); // 'active' or 'completed'

  useEffect(() => {
    loadAllFiles();
  }, [selectedTab]);

  const loadAllFiles = async () => {
    try {
      setLoading(true);
      
      // Tạo thư mục nếu chưa có
      await FileSystem.makeDirectoryAsync(ACTIVE_DIR, { intermediates: true });
      await FileSystem.makeDirectoryAsync(COMPLETED_DIR, { intermediates: true });

      const dataDir = selectedTab === 'active' ? ACTIVE_DIR : COMPLETED_DIR;
      const fileNames = await FileSystem.readDirectoryAsync(dataDir);
      const result = [];

      for (const file of fileNames) {
        if (file.endsWith('.json')) {
          try {
            const content = await FileSystem.readAsStringAsync(dataDir + file);
            const data = JSON.parse(content);
            
            // Parse thông tin từ file với định dạng mới
            const meSo = data.field_002 || data.me_so || parseMeFromFilename(file);
            const tankSo = data.field_003 || data.tank_so || parseTankFromFilename(file);
            const ngay = data.field_001 || data.ngay_nau || parseDateFromFilename(file);
            const nhanVien = data.field_004 || data.nhan_vien || '';
            const createdAt = data.created_at || parseTimeFromFilename(file);
            const beerType = data.beer_type || detectBeerTypeFromData(data, file);
            
            // Tính trạng thái hoàn thành
            const requiredFields = ['field_002', 'field_003']; // Có thể mở rộng
            const isComplete = requiredFields.every(field => data[field] && data[field] !== '');
           
            result.push({ 
              file, 
              data,
              meSo,
              ngay,
              tankSo,
              nhanVien,
              createdAt,
              beerType,
              isComplete,
              label: `${getBeerTypeIcon(beerType)} Mẻ ${meSo} - Tank ${tankSo} - ${ngay}`,
              directory: selectedTab
            });
          } catch (parseError) {
            console.error(`Lỗi parse file ${file}:`, parseError);
            // Vẫn thêm file bị lỗi để hiển thị
            result.push({
              file,
              data: null,
              meSo: '???',
              ngay: 'Lỗi file',
              tankSo: '',
              nhanVien: '',
              createdAt: '',
              beerType: 'unknown',
              isComplete: false,
              label: `❌ ${file} (Lỗi)`,
              directory: selectedTab
            });
          }
        }
      }

      // Sắp xếp theo thời gian tạo (mới nhất trước)
      result.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return b.file.localeCompare(a.file);
      });

      setFiles(result);
    } catch (error) {
      console.error('Lỗi đọc thư mục:', error);
      Alert.alert('Lỗi', 'Không thể đọc danh sách phiếu nấu');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions để parse thông tin từ tên file
  const parseMeFromFilename = (filename) => {
    const match = filename.match(/_me(\d+)_/);
    return match ? match[1] : '???';
  };

  const parseTankFromFilename = (filename) => {
    const match = filename.match(/_tank(\d+)_/);
    return match ? match[1] : '???';
  };

  const parseDateFromFilename = (filename) => {
    const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const [year, month, day] = match[1].split('-');
      return `${day}/${month}/${year}`;
    }
    return 'Không rõ ngày';
  };

  const parseTimeFromFilename = (filename) => {
    const match = filename.match(/_(\d{6})\.json$/);
    if (match) {
      const timeStr = match[1];
      const hour = timeStr.substring(0, 2);
      const min = timeStr.substring(2, 4);
      const sec = timeStr.substring(4, 6);
      return new Date().toISOString().substring(0, 10) + `T${hour}:${min}:${sec}Z`;
    }
    return '';
  };

  const detectBeerTypeFromData = (data, filename) => {
    if (data && data.beer_type) {
      return data.beer_type.toLowerCase();
    }
    
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('hanoi')) return 'hanoi';
    if (lowerFilename.includes('chaihg') || lowerFilename.includes('chai')) return 'chaihg';
    return 'river';
  };

  const getBeerTypeIcon = (beerType) => {
    switch (beerType?.toLowerCase()) {
      case 'hanoi': return '🏯';
      case 'chaihg': return '👑';
      case 'river': return '🍺';
      default: return '❓';
    }
  };

  const getBeerTypeName = (beerType) => {
    switch (beerType?.toLowerCase()) {
      case 'hanoi': return 'Bia Hà Nội';
      case 'chaihg': return 'Bia Chai Hoàng Gia';
      case 'river': return 'Bia River';
      default: return 'Không rõ';
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllFiles();
    setRefreshing(false);
  };

  const handleViewBatch = (item) => {
    if (!item.data) {
      Alert.alert('Lỗi', 'File này bị hỏng và không thể mở');
      return;
    }
    
    // Navigate to view/edit screen
    navigation.navigate('ViewBatchScreen', {
      batchData: item.data,
      fileName: item.file,
      isAdmin,
      user
    });
  };

  const handleEditBatch = (item) => {
    if (!isAdmin) {
      Alert.alert('Không có quyền', 'Chỉ admin mới có thể sửa phiếu');
      return;
    }
    
    if (!item.data) {
      Alert.alert('Lỗi', 'File này bị hỏng và không thể sửa');
      return;
    }

    Alert.alert(
      'Sửa phiếu nấu',
      `Bạn có muốn sửa phiếu mẻ ${item.meSo}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Sửa', 
          onPress: () => {
            // Navigate to appropriate screen based on beer type
            const screenName = getScreenNameForBeerType(item.beerType);
            navigation.navigate(screenName, {
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

  const getScreenNameForBeerType = (beerType) => {
    switch (beerType?.toLowerCase()) {
      case 'hanoi': return 'HanoiScreen';
      case 'chaihg': return 'ChaihgScreen';
      case 'river':
      default: return 'RiverScreen';
    }
  };

  const handleDeleteBatch = (item) => {
    if (!isAdmin) {
      Alert.alert('Không có quyền', 'Chỉ admin mới có thể xóa phiếu');
      return;
    }

    Alert.alert(
      'Xóa phiếu nấu',
      `Bạn có chắc muốn xóa phiếu mẻ ${item.meSo}?\nHành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            try {
              const dataDir = item.directory === 'active' ? ACTIVE_DIR : COMPLETED_DIR;
              await FileSystem.deleteAsync(dataDir + item.file);
              Alert.alert('Thành công', 'Đã xóa phiếu nấu');
              loadAllFiles(); // Refresh list
            } catch (error) {
              console.error('Lỗi xóa file:', error);
              Alert.alert('Lỗi', 'Không thể xóa file');
            }
          }
        }
      ]
    );
  };

  const handleMoveBatch = (item) => {
    if (!isAdmin) {
      Alert.alert('Không có quyền', 'Chỉ admin mới có thể di chuyển phiếu');
      return;
    }

    const targetDir = item.directory === 'active' ? 'completed' : 'active';
    const targetDirName = targetDir === 'active' ? 'Đang hoạt động' : 'Đã hoàn thành';
    
    Alert.alert(
      'Di chuyển phiếu',
      `Bạn có muốn di chuyển phiếu mẻ ${item.meSo} sang thư mục "${targetDirName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Di chuyển', 
          onPress: async () => {
            try {
              const sourceDir = item.directory === 'active' ? ACTIVE_DIR : COMPLETED_DIR;
              const targetDirPath = targetDir === 'active' ? ACTIVE_DIR : COMPLETED_DIR;
              
              // Ensure target directory exists
              await FileSystem.makeDirectoryAsync(targetDirPath, { intermediates: true });
              
              // Read file content
              const content = await FileSystem.readAsStringAsync(sourceDir + item.file);
              
              // Write to new location
              await FileSystem.writeAsStringAsync(targetDirPath + item.file, content);
              
              // Delete from old location
              await FileSystem.deleteAsync(sourceDir + item.file);
              
              Alert.alert('Thành công', `Đã di chuyển phiếu sang thư mục "${targetDirName}"`);
              loadAllFiles(); // Refresh list
            } catch (error) {
              console.error('Lỗi di chuyển file:', error);
              Alert.alert('Lỗi', 'Không thể di chuyển file');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Đang tải danh sách phiếu...</Text>
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
        <Text style={styles.title}>📂 Danh sách phiếu nấu</Text>
        <Text style={styles.subtitle}>
          {files.length} phiếu • {isAdmin ? 'Admin' : 'Nhân viên'}
        </Text>
        
        {/* Tab switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'active' && styles.activeTab]}
            onPress={() => setSelectedTab('active')}
          >
            <Text style={[styles.tabText, selectedTab === 'active' && styles.activeTabText]}>
              🔄 Đang hoạt động
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'completed' && styles.activeTab]}
            onPress={() => setSelectedTab('completed')}
          >
            <Text style={[styles.tabText, selectedTab === 'completed' && styles.activeTabText]}>
              ✅ Đã hoàn thành
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {files.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {selectedTab === 'active' ? '📭 Không có phiếu đang hoạt động' : '📭 Không có phiếu đã hoàn thành'}
          </Text>
          <Text style={styles.emptySubtext}>
            {selectedTab === 'active' 
              ? 'Hãy tạo phiếu mới từ menu "Nấu mẻ mới"'
              : 'Các phiếu đã lọc xong sẽ xuất hiện ở đây'
            }
          </Text>
        </View>
      ) : (
        files.map((item, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[
              styles.item,
              !item.isComplete && styles.incompleteItem,
              selectedTab === 'completed' && styles.completedItem
            ]}
            onPress={() => handleViewBatch(item)}
          >
            <View style={styles.itemContent}>
              <View style={styles.itemHeader}>
                <Text style={styles.batchTitle}>{item.label}</Text>
                {!item.isComplete && selectedTab === 'active' && (
                  <Text style={styles.incompleteTag}>⚠️ Chưa hoàn thành</Text>
                )}
                {selectedTab === 'completed' && (
                  <Text style={styles.completedTag}>✅ Hoàn thành</Text>
                )}
              </View>
              
              <View style={styles.beerTypeContainer}>
                <Text style={styles.beerTypeText}>
                  {getBeerTypeIcon(item.beerType)} {getBeerTypeName(item.beerType)}
                </Text>
              </View>
              
              {item.nhanVien && (
                <Text style={styles.itemDetail}>👤 {item.nhanVien}</Text>
              )}
              
              {item.createdAt && (
                <Text style={styles.itemDetail}>
                  🕒 {new Date(item.createdAt).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.viewButton}
                onPress={() => handleViewBatch(item)}
              >
                <Text style={styles.viewButtonText}>👀</Text>
              </TouchableOpacity>
              
              {isAdmin && (
                <>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditBatch(item)}
                  >
                    <Text style={styles.editButtonText}>✏️</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.moveButton}
                    onPress={() => handleMoveBatch(item)}
                  >
                    <Text style={styles.moveButtonText}>
                      {item.directory === 'active' ? '📤' : '📥'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteBatch(item)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Kéo xuống để làm mới • {isAdmin ? 'Có quyền chỉnh sửa' : 'Chỉ xem'}
        </Text>
        <Text style={styles.footerNote}>
          💡 Phiếu ở thư mục "Đang hoạt động" sẽ được Tank hiển thị
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
    color: '#666',
    marginTop: 4,
    marginBottom: 16
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  activeTab: {
    backgroundColor: '#007AFF'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  activeTabText: {
    color: '#fff'
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
    color: '#666',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  incompleteItem: {
    backgroundColor: '#fff8e1',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800'
  },
  completedItem: {
    backgroundColor: '#f0f8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50'
  },
  itemContent: {
    flex: 1
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  batchTitle: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  incompleteTag: {
    fontSize: 12,
    color: '#ff9800',
    fontWeight: '600'
  },
  completedTag: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600'
  },
  beerTypeContainer: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4
  },
  beerTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  itemDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  viewButton: {
    padding: 8,
    marginLeft: 4
  },
  viewButtonText: {
    fontSize: 18
  },
  editButton: {
    padding: 8,
    marginLeft: 4
  },
  editButtonText: {
    fontSize: 16,
    color: '#007AFF'
  },
  moveButton: {
    padding: 8,
    marginLeft: 4
  },
  moveButtonText: {
    fontSize: 16,
    color: '#FF9500'
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FF3B30'
  },
  footer: {
    padding: 20,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4
  },
  footerNote: {
    fontSize: 11,
    color: '#007AFF',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});