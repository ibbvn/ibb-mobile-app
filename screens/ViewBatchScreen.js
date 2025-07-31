// ViewBatchScreen.js - Inline functions (temporary fix)
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  Share
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Picker } from '@react-native-picker/picker';
import fieldDefinitions from '../assets/river.json';

const TAB_HEIGHT = 56;

// Inline utility functions (temporary)
const getFieldDefinitions = (beerType) => {
  // For now, always return river fields
  return fieldDefinitions;
};

const detectBeerTypeFromData = (data, fileName) => {
  if (fileName) {
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('hanoi')) return 'hanoi';
    if (lowerFileName.includes('chaihg') || lowerFileName.includes('chai')) return 'chaihg';
  }
  
  if (data && data.beer_type) {
    return data.beer_type.toLowerCase();
  }
  
  return 'river';
};

const getBeerTypeDisplayInfo = (beerType) => {
  switch (beerType?.toLowerCase()) {
    case 'hanoi':
      return {
        name: 'Bia Hà Nội',
        icon: '🏯',
        color: '#dc3545',
        description: 'Bia Hà Nội truyền thống'
      };
    case 'chaihg':
      return {
        name: 'Bia Chai Hoàng Gia', 
        icon: '👑',
        color: '#ffc107',
        description: 'Bia Chai Hoàng Gia cao cấp'
      };
    case 'river':
    default:
      return {
        name: 'Bia River',
        icon: '🍺', 
        color: '#007bff',
        description: 'Bia River thủ công'
      };
  }
};

const ViewBatchScreen = ({ navigation, route }) => {
  const { batchData, fileName, isAdmin, user } = route.params || {};
  
  const [data, setData] = useState(batchData || {});
  const [images, setImages] = useState({});
  const [beerType, setBeerType] = useState('river');
  const [currentFieldDefinitions, setCurrentFieldDefinitions] = useState(fieldDefinitions);

  useEffect(() => {
    if (batchData) {
      setData(batchData);
      // Detect beer type from data or filename
      const detectedType = detectBeerTypeFromData(batchData, fileName);
      setBeerType(detectedType);
      
      // Load appropriate field definitions
      const fields = getFieldDefinitions(detectedType);
      setCurrentFieldDefinitions(fields);
      
      loadExistingImages();
    }
  }, [batchData, fileName]);

  // Rest of the ViewBatchScreen component code...
  // (Copy all the functions and JSX from the original ViewBatchScreen)
  
  const loadExistingImages = async () => {
    try {
      console.log('Loading existing images for batch...');
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const handleExportExcel = async () => {
    try {
      Alert.alert(
        'Xuất Excel',
        'Bạn muốn xuất dữ liệu này ra file Excel?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xuất Excel', onPress: () => exportToExcel() }
        ]
      );
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      Alert.alert('Lỗi', 'Không thể xuất file Excel: ' + error.message);
    }
  };

  const exportToExcel = async () => {
    try {
      let csvContent = 'Field ID,Label,Value\n';
      
      currentFieldDefinitions.forEach(field => {
        const value = data[field.field_id] || '';
        const cleanValue = String(value).replace(/,/g, ';').replace(/\n/g, ' ');
        csvContent += `"${field.field_id}","${field.label}","${cleanValue}"\n`;
      });

      csvContent += '\n\nMetadata\n';
      csvContent += `"File Name","${fileName || 'Unknown'}"\n`;
      csvContent += `"Export Date","${new Date().toLocaleString('vi-VN')}"\n`;
      csvContent += `"Beer Type","${beerType.toUpperCase()}"\n`;
      csvContent += `"Batch Number","${data.field_002 || data.me_so || 'Unknown'}"\n`;
      csvContent += `"Tank Number","${data.field_003 || data.tank_so || 'Unknown'}"\n`;

      const fileUri = FileSystem.documentDirectory + `batch_export_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Xuất dữ liệu phiếu nấu',
        });
      } else {
        Alert.alert('Thành công', `File đã được lưu tại: ${fileUri}`);
      }

    } catch (error) {
      console.error('Error creating Excel file:', error);
      Alert.alert('Lỗi', 'Không thể tạo file Excel: ' + error.message);
    }
  };

  const handleEdit = () => {
    if (!isAdmin) {
      Alert.alert('Không có quyền', 'Chỉ admin mới có thể chỉnh sửa phiếu');
      return;
    }

    Alert.alert(
      'Chỉnh sửa phiếu',
      'Bạn có muốn chỉnh sửa phiếu này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chỉnh sửa',
          onPress: () => {
            const screenName = getScreenNameForBeerType(beerType);
            navigation.navigate(screenName, {
              editMode: true,
              batchData: data,
              fileName: fileName,
              user
            });
          }
        }
      ]
    );
  };

  const getScreenNameForBeerType = (type) => {
    switch (type.toLowerCase()) {
      case 'hanoi':
        return 'HanoiScreen';
      case 'chaihg':
        return 'ChaihgScreen';
      case 'river':
      default:
        return 'RiverScreen';
    }
  };

  const renderField = (field) => {
    const fid = field.field_id;
    const label = field.label;
    const value = data[fid] ?? '';
    const commonStyle = { 
      borderWidth: 1, 
      marginBottom: 10, 
      padding: 12, 
      fontSize: 16, 
      borderRadius: 8,
      backgroundColor: '#f8f9fa',
      borderColor: '#dee2e6',
      color: '#495057'
    };

    if (field.type === 'photo') {
      const imageKey = `${fid}_image`;
      const imageUri = images[imageKey];
      
      return (
        <View key={fid} style={{ marginBottom: 15 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 16, color: '#333' }}>
            {label}
          </Text>
          
          {imageUri ? (
            <Image 
              source={{ uri: imageUri }} 
              style={{ 
                width: '100%', 
                height: 200, 
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#dee2e6'
              }} 
            />
          ) : (
            <View style={{
              height: 100,
              backgroundColor: '#f8f9fa',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#dee2e6',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text style={{ color: '#6c757d', fontStyle: 'italic' }}>
                📷 Không có ảnh
              </Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View key={fid} style={{ marginBottom: 15 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 16, color: '#333' }}>
          {label}
        </Text>
        <View style={commonStyle}>
          <Text style={{ fontSize: 16, color: '#495057' }}>
            {value || 'Chưa nhập'}
          </Text>
        </View>
      </View>
    );
  };

  const getBeerTypeDisplayName = (type) => {
    const info = getBeerTypeDisplayInfo(type);
    return `${info.icon} ${info.name}`;
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ 
        backgroundColor: '#fff', 
        padding: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#dee2e6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ 
              padding: 8, 
              borderRadius: 8, 
              backgroundColor: '#6c757d',
              marginRight: 12
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>← Quay lại</Text>
          </TouchableOpacity>
          
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>
              📋 Xem phiếu nấu
            </Text>
            <Text style={{ fontSize: 14, color: '#6c757d', marginTop: 2 }}>
              {getBeerTypeDisplayName(beerType)}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleExportExcel}
            style={{
              flex: 1,
              backgroundColor: '#28a745',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center'
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              📊 Xuất Excel
            </Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              onPress={handleEdit}
              style={{
                flex: 1,
                backgroundColor: '#007bff',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                ✏️ Chỉnh sửa
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Batch info summary */}
      <View style={{ 
        backgroundColor: '#fff', 
        margin: 16, 
        padding: 16, 
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' }}>
          📝 Thông tin phiếu
        </Text>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          <View style={{ flex: 1, minWidth: '45%' }}>
            <Text style={{ fontSize: 14, color: '#6c757d' }}>Mẻ số</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
              {data.field_002 || data.me_so || 'Chưa rõ'}
            </Text>
          </View>
          
          <View style={{ flex: 1, minWidth: '45%' }}>
            <Text style={{ fontSize: 14, color: '#6c757d' }}>Tank số</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
              {data.field_003 || data.tank_so || 'Chưa rõ'}
            </Text>
          </View>
          
          <View style={{ flex: 1, minWidth: '45%' }}>
            <Text style={{ fontSize: 14, color: '#6c757d' }}>Ngày nấu</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
              {data.field_001 || data.ngay_nau || 'Chưa rõ'}
            </Text>
          </View>
          
          <View style={{ flex: 1, minWidth: '45%' }}>
            <Text style={{ fontSize: 14, color: '#6c757d' }}>Nhân viên</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
              {data.field_004 || data.nhan_vien || 'Chưa rõ'}
            </Text>
          </View>
        </View>

        {fileName && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#dee2e6' }}>
            <Text style={{ fontSize: 12, color: '#6c757d' }}>
              📁 File: {fileName}
            </Text>
          </View>
        )}
      </View>

      {/* Field data */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#333' }}>
            📊 Chi tiết dữ liệu
          </Text>
          
          {currentFieldDefinitions.map(renderField)}
        </View>
        
        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ViewBatchScreen;