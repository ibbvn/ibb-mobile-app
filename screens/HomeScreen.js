import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function HomeScreen({ navigation, user }) {
  // Temporary fix: If no user data, create default user for testing
  const effectiveUser = user || {
    full_name: 'Test User',
    department: 'chebien', 
    role: 'staff'
  };

  const getDepartmentAccess = () => {
    const department = effectiveUser?.department || 'chebien';
    const role = effectiveUser?.role || 'staff';
    
    const access = [];
    
    // Luôn hiển thị tất cả menu (để test)
    access.push({
      title: 'Chế biến',
      icon: '🍺',
      route: 'CheBien',
      description: 'Quản lý quy trình nấu bia',
      available: true,
      primary: department === 'chebien'
    });
    
    access.push({
      title: 'QA - Kiểm soát chất lượng',
      icon: '🔬',
      route: 'QA', 
      description: 'Kiểm tra và đảm bảo chất lượng',
      available: true,
      primary: department === 'qa'
    });
    
    // Admin features
    if (role === 'admin') {
      access.push({
        title: 'Test & Development',
        icon: '⚙️',
        route: 'CheBienTest',
        description: 'Môi trường thử nghiệm (Admin)',
        available: true,
        primary: false
      });
      
      access.push({
        title: 'Quản lý người dùng',
        icon: '👥',
        route: 'UserManagement',
        description: 'Quản lý tài khoản và phân quyền (Admin)',
        available: false, // Chưa implement
        primary: false
      });
    }
    
    return access;
  };

  const handleNavigate = (route) => {
    navigation.navigate(route, { user: effectiveUser });
  };

  const departmentAccess = getDepartmentAccess();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Chào mừng</Text>
        <Text style={styles.userName}>{effectiveUser?.full_name || 'Người dùng'}</Text>
        
        <View style={styles.userInfo}>
          <Text style={styles.userDetail}>
            🏢 Bộ phận: {(effectiveUser?.department || 'chebien').toUpperCase()}
          </Text>
          <Text style={styles.userDetail}>
            {(effectiveUser?.role === 'admin') ? '🔧 Quản trị viên' : '👨‍💼 Nhân viên'}
          </Text>
          
          {/* Debug info */}
          {!user && (
            <Text style={[styles.userDetail, {color: '#FF9800', fontSize: 12}]}>
              ⚠️ Debug Mode: Sử dụng user mặc định
            </Text>
          )}
        </View>
      </View>

      <View style={styles.menuContainer}>
        <Text style={styles.menuTitle}>Truy cập hệ thống</Text>
        
        {departmentAccess.length === 0 ? (
          <View style={styles.noAccessContainer}>
            <Text style={styles.noAccessText}>
              ❌ Không có quyền truy cập nào được cấp
            </Text>
            <Text style={styles.noAccessSubtext}>
              Vui lòng liên hệ quản trị viên để được cấp quyền
            </Text>
          </View>
        ) : (
          departmentAccess.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuButton,
                !item.available && styles.disabledButton,
                item.primary && styles.primaryButton
              ]}
              onPress={() => item.available && handleNavigate(item.route)}
              disabled={!item.available}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>{item.icon}</Text>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>
                    {item.title}
                    {item.primary && ' (Bộ phận chính)'}
                  </Text>
                  <Text style={styles.buttonDescription}>{item.description}</Text>
                  {!item.available && (
                    <Text style={styles.comingSoonText}>🔧 Đang phát triển</Text>
                  )}
                </View>
                <Text style={[styles.arrow, !item.available && styles.disabledArrow]}>
                  {item.available ? '→' : '⏳'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          IBB Management System v1.2.0
        </Text>
        <Text style={styles.footerSubtext}>
          💡 Quyền truy cập được quản lý theo bộ phận và vai trò
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
  welcomeText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 8,
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  userDetail: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginVertical: 2,
  },
  menuContainer: {
    flex: 1,
    padding: 20,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  noAccessContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcccb',
  },
  noAccessText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  noAccessSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  menuButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  primaryButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 32,
    marginRight: 16,
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
  },
  arrow: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  disabledArrow: {
    color: '#ccc',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#FF9800',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  footerText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});