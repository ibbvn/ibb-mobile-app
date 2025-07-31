// NewBatchScreen.js - Updated for all beer types
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';

export default function NewBatchScreen({ navigation, route }) {
  const { user } = route.params || {};

  const handleNavigate = (type) => {
    let screenName;
    let beerTypeName;
    
    switch (type) {
      case 'river':
        screenName = 'RiverScreen';
        beerTypeName = 'Bia River';
        break;
      case 'hanoi':
        screenName = 'HanoiScreen';
        beerTypeName = 'Bia Hà Nội';
        break;
      case 'chaihg':
        screenName = 'ChaihgScreen';
        beerTypeName = 'Bia Chai Hoàng Gia';
        break;
      default:
        Alert.alert('Lỗi', 'Loại bia không hợp lệ');
        return;
    }

    // Navigate to the selected beer screen
    navigation.navigate(screenName, { 
      user,
      editMode: false, // Tạo mới
      beerType: type // Pass beer type for identification
    });
  };

  // Get beer type information
  const getBeerTypeInfo = () => {
    return [
      {
        id: 'river',
        name: 'Bia River',
        icon: '🍺',
        color: '#007AFF',
        description: 'Form đầy đủ với 109 thông số',
        available: true,
        features: ['✅ Form hoàn chỉnh', '✅ Tự động tính toán', '✅ Upload ảnh', '✅ Export Excel']
      },
      {
        id: 'hanoi',
        name: 'Bia Hà Nội',
        icon: '🏯',
        color: '#dc3545',
        description: 'Quy trình sản xuất Bia Hà Nội',
        available: true,
        features: ['✅ Form chuyên biệt', '✅ Công thức riêng', '✅ Kiểm soát chất lượng', '✅ Báo cáo sản xuất']
      },
      {
        id: 'chaihg',
        name: 'Bia Chai Hoàng Gia',
        icon: '👑',
        color: '#ffc107',
        description: 'Quy trình cao cấp Bia Chai Hoàng Gia',
        available: true,
        features: ['✅ Quy trình cao cấp', '✅ Kiểm soát nghiêm ngặt', '✅ Công thức đặc biệt', '✅ Quản lý chất lượng']
      }
    ];
  };

  const beerTypes = getBeerTypeInfo();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🍺 Nấu mẻ mới</Text>
        <Text style={styles.subtitle}>
          Chọn loại bia để bắt đầu nhập liệu
        </Text>
        
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userText}>👤 {user.full_name}</Text>
            <Text style={styles.userRole}>
              {user.role === 'admin' ? '🔧 Quản trị viên' : '👨‍🔬 Nhân viên'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {beerTypes.map((beerType) => (
          <TouchableOpacity
            key={beerType.id}
            style={[
              styles.button,
              beerType.available ? styles.availableButton : styles.comingSoonButton,
              { borderColor: beerType.color }
            ]}
            onPress={() => beerType.available && handleNavigate(beerType.id)}
            disabled={!beerType.available}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>{beerType.icon}</Text>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>{beerType.name}</Text>
                <Text style={styles.buttonDescription}>
                  {beerType.description}
                </Text>
                
                {/* Features list */}
                <View style={styles.featuresList}>
                  {beerType.features.map((feature, index) => (
                    <Text key={index} style={styles.featureItem}>
                      {feature}
                    </Text>
                  ))}
                </View>
              </View>
              
              <View style={styles.buttonStatus}>
                {beerType.available ? (
                  <Text style={[styles.statusTag, { backgroundColor: beerType.color }]}>
                    ✅ Sẵn sàng
                  </Text>
                ) : (
                  <Text style={styles.comingSoonTag}>🔧 Sắp có</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>📋 Hướng dẫn:</Text>
        <Text style={styles.instructionItem}>
          • Chọn loại bia phù hợp với quy trình sản xuất
        </Text>
        <Text style={styles.instructionItem}>
          • Mỗi loại bia có form nhập liệu và công thức riêng
        </Text>
        <Text style={styles.instructionItem}>
          • Dữ liệu được lưu tự động và có thể xuất Excel
        </Text>
        <Text style={styles.instructionItem}>
          • Admin có thể chỉnh sửa tất cả phiếu đã tạo
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Quay lại menu chính</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerNote}>
          💡 Tất cả loại bia hiện đã sẵn sàng để sử dụng
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  userText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  button: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#fff',
  },
  availableButton: {
    borderWidth: 2,
  },
  comingSoonButton: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  buttonIcon: {
    fontSize: 32,
    marginRight: 16,
    marginTop: 4,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  featuresList: {
    gap: 2,
  },
  featureItem: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  buttonStatus: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusTag: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },
  comingSoonTag: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 12,
    color: '#28a745',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '600',
  },
});