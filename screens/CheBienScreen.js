// CheBienScreen.js - Updated with migration check
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MigrationScript from '../utils/MigrationScript';
import BatchFileManager from '../utils/BatchFileManager';

const CheBienScreen = ({ navigation, user }) => {
  const isAdmin = user?.role === 'admin';
  const [migrationChecked, setMigrationChecked] = useState(false);
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    checkMigrationAndLoadStats();
  }, []);

  const checkMigrationAndLoadStats = async () => {
    try {
      // Check if migration is needed
      const needsMigration = await MigrationScript.checkIfMigrationNeeded();
      
      if (needsMigration) {
        console.log('📋 Migration needed, showing dialog...');
        const shouldMigrate = await MigrationScript.showMigrationDialog();
        
        if (shouldMigrate) {
          await performMigration();
        }
      }
      
      // Load statistics
      await loadStatistics();
      setMigrationChecked(true);
      
    } catch (error) {
      console.error('Error during migration check:', error);
      Alert.alert('Lỗi', 'Có lỗi khi kiểm tra cấu trúc dữ liệu: ' + error.message);
      setMigrationChecked(true);
    }
  };

  const performMigration = async () => {
    try {
      setMigrationInProgress(true);
      
      console.log('🔄 Starting migration...');
      const result = await MigrationScript.migrateOldFiles();
      
      // Validate migration
      const validation = await MigrationScript.validateMigration();
      
      Alert.alert(
        '✅ Cập nhật hoàn thành',
        `Đã chuyển đổi thành công!\n\n` +
        `📊 Kết quả:\n` +
        `• Đã chuyển đổi: ${result.migrated} files\n` +
        `• Bỏ qua: ${result.skipped} files\n` +
        `• Lỗi: ${result.errors} files\n\n` +
        `📁 Cấu trúc mới:\n` +
        `• Đang hoạt động: ${validation.activeCount} files\n` +
        `• Đã hoàn thành: ${validation.completedCount} files\n\n` +
        `🎉 Hệ thống đã sẵn sàng với cấu trúc mới!`
      );
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      Alert.alert(
        'Lỗi Migration',
        `Có lỗi xảy ra khi chuyển đổi:\n${error.message}\n\nVui lòng liên hệ admin.`
      );
    } finally {
      setMigrationInProgress(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const statistics = await BatchFileManager.getStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleForceReMigration = () => {
    if (!isAdmin) {
      Alert.alert('Không có quyền', 'Chỉ admin mới có thể thực hiện migration');
      return;
    }

    Alert.alert(
      '⚠️ Force Migration',
      'Bạn có chắc muốn thực hiện migration lại không?\n\nChức năng này chỉ dành cho admin khi cần thiết.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thực hiện',
          style: 'destructive',
          onPress: async () => {
            await performMigration();
            await loadStatistics();
          }
        }
      ]
    );
  };

  const handleCleanupOldFiles = () => {
    if (!isAdmin) {
      Alert.alert('Không có quyền', 'Chỉ admin mới có thể dọn dẹp files');
      return;
    }

    Alert.alert(
      '🗑️ Dọn dẹp files cũ',
      'Xóa các phiếu đã hoàn thành cũ hơn 90 ngày?\n\nThao tác này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Dọn dẹp',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletedCount = await BatchFileManager.cleanupOldCompletedFiles(90);
              Alert.alert('Hoàn thành', `Đã xóa ${deletedCount} files cũ`);
              await loadStatistics();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể dọn dẹp files: ' + error.message);
            }
          }
        }
      ]
    );
  };

  if (!migrationChecked || migrationInProgress) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {migrationInProgress ? '🔄 Đang cập nhật cấu trúc dữ liệu...' : '🔍 Đang kiểm tra hệ thống...'}
        </Text>
        <Text style={styles.loadingSubtext}>
          Vui lòng đợi trong giây lát
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CHẾ BIẾN</Text>

      {/* Statistics Card */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>📊 Thống kê phiếu nấu</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.active.total}</Text>
              <Text style={styles.statLabel}>Đang hoạt động</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.completed.total}</Text>
              <Text style={styles.statLabel}>Đã hoàn thành</Text>
            </View>
          </View>
          <View style={styles.beerTypeStats}>
            <Text style={styles.beerTypeLabel}>🍺 River: {stats.active.river + stats.completed.river}</Text>
            <Text style={styles.beerTypeLabel}>🏯 Hà Nội: {stats.active.hanoi + stats.completed.hanoi}</Text>
            <Text style={styles.beerTypeLabel}>👑 Chai HG: {stats.active.chaihg + stats.completed.chaihg}</Text>
          </View>
        </View>
      )}

      {/* Main Menu Buttons */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('NewBatchScreen', { user })}
      >
        <Text style={styles.buttonText}>🍺 Nấu mẻ mới</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('IncompleteBatchListScreen', { user })}
      >
        <Text style={styles.buttonText}>📝 Phiếu nấu chưa hoàn thành</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('AllBatchListScreen', { user })}
      >
        <Text style={styles.buttonText}>📂 Danh sách phiếu nấu</Text>
      </TouchableOpacity>

      {/* Admin Section */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminTitle}>🔧 Quản trị viên</Text>
          
          <TouchableOpacity
            style={styles.adminButton}
            onPress={handleForceReMigration}
          >
            <Text style={styles.adminButtonText}>🔄 Force Migration</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminButton}
            onPress={handleCleanupOldFiles}
          >
            <Text style={styles.adminButtonText}>🗑️ Dọn dẹp files cũ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.adminButton}
            onPress={loadStatistics}
          >
            <Text style={styles.adminButtonText}>📊 Tải lại thống kê</Text>
          </TouchableOpacity>
          
          {/* Debug button */}
          <TouchableOpacity
            style={styles.adminButton}
            onPress={async () => {
              try {
                const MigrationCheckScript = require('../utils/MigrationCheckScript').default;
                const result = await MigrationCheckScript.debugFileStructure();
                Alert.alert(
                  'Debug File Structure',
                  `Chebien files: ${result.chebienFiles.length}\n` +
                  `Active files: ${result.activeFiles.length}\n` +
                  `Completed files: ${result.completedFiles.length}\n\n` +
                  'Check console for details'
                );
              } catch (error) {
                Alert.alert('Debug Error', error.message);
              }
            }}
          >
            <Text style={styles.adminButtonText}>🔍 Debug Files</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Cấu trúc mới: Phiếu được phân tách rõ ràng giữa "Đang hoạt động" và "Đã hoàn thành"
        </Text>
      </View>
    </View>
  );
};

export default CheBienScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  beerTypeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  beerTypeLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  adminSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
  },
  adminButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});