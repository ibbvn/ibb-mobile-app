// RiverScreen.js - Fixed with new filename format and directory structure
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Button,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Picker } from '@react-native-picker/picker';
import fieldDefinitions from '../assets/river.json';

const TAB_HEIGHT = 56;

// New directory structure
const ACTIVE_DIR = FileSystem.documentDirectory + 'chebien/active/';
const COMPLETED_DIR = FileSystem.documentDirectory + 'chebien/completed/';

// Hàm cộng thời gian tổng quát (đã sửa và cải thiện)
const addTime = (t1, t2) => {
  console.log(`addTime called with: t1="${t1}", t2="${t2}"`);
  
  // Xử lý t1
  let [h1 = 0, m1 = 0] = (t1 || '00:00').split(':').map(Number);
  
  // Xử lý t2
  let h2 = 0, m2 = 0;
  if (!t2 || t2 === '') { 
    h2 = 0; 
    m2 = 0; 
  } else if (/^\d{1,2}:\d{2}$/.test(t2)) { 
    // Format HH:MM
    [h2, m2] = t2.split(':').map(Number); 
  } else if (/^\d{1,2}$/.test(t2)) { 
    // Chỉ có số phút
    m2 = Number(t2); 
    h2 = 0; 
  }
  
  console.log(`Parsed: t1=${h1}:${m1}, t2=${h2}:${m2}`);
  
  // Tính tổng phút
  let totalMin = h1 * 60 + m1 + h2 * 60 + m2;
  let hh = Math.floor(totalMin / 60) % 24;
  let mm = totalMin % 60;
  
  const result = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  console.log(`addTime result: ${result}`);
  
  return result;
};

// Hàm resolveAutoValues cho tất cả các field (đã sửa)
const resolveAutoValues = (data) => {
  let updatedData = { ...data };
  
  for (let loop = 0; loop < 30; ++loop) {
    let changed = false;
    
    fieldDefinitions.forEach(field => {
      if ((field.type === 'auto' || field.type === 'autofixed') && field.calculate) {
        try {
          if (field.calculate.startsWith('=')) {
            const expr = field.calculate.slice(1).trim();
            
            // Hàm lấy giá trị field theo format CXX
            const getFieldValue = (code) => {
              const m = code.match(/^[Cc](\d+)$/);
              if (!m) {
                console.log(`Invalid code format: ${code}`);
                return '00:00';
              }
              
              let fieldKey = `field_${m[1].padStart(3, '0')}`;
              let value = updatedData[fieldKey];
              
              // Debug log
              console.log(`Getting value for ${code} (${fieldKey}): "${value}"`);
              
              if (value === undefined || value === "") {
                console.log(`${fieldKey} is empty, returning 00:00`);
                return "00:00";
              }
              
              // Xử lý trường hợp chỉ có số phút
              if (/^\d{1,2}$/.test(value)) {
                value = `00:${value.padStart(2, '0')}`;
                console.log(`Converted number to time format: ${value}`);
              }
              
              return value;
            };
            
            // Xử lý các phép toán cộng thời gian
            if (expr.includes('+')) {
              const parts = expr.split('+').map(s => s.trim());
              let result = getFieldValue(parts[0]);
              
              console.log(`Calculating ${field.field_id}: Starting with ${parts[0]} = ${result}`);
              
              for (let i = 1; i < parts.length; i++) {
                let nextValue = getFieldValue(parts[i]);
                console.log(`Adding ${parts[i]} = ${nextValue}`);
                const oldResult = result;
                result = addTime(result, nextValue);
                console.log(`Result: ${oldResult} + ${nextValue} = ${result}`);
              }
              
              if (updatedData[field.field_id] !== result) {
                console.log(`Final update ${field.field_id} from ${updatedData[field.field_id]} to ${result}`);
                updatedData[field.field_id] = result;
                changed = true;
              } else {
                console.log(`No change needed for ${field.field_id}, already ${result}`);
              }
            } else {
              // Chỉ copy giá trị từ field khác
              const result = getFieldValue(expr);
              if (updatedData[field.field_id] !== result) {
                console.log(`Copying ${field.field_id} from ${expr}: ${result}`);
                updatedData[field.field_id] = result;
                changed = true;
              }
            }
          } else {
            // Phép toán số học - sử dụng format field_XXX thay vì CXX
            let expr = field.calculate;
            
            // Replace field_XXX references with actual values
            expr = expr.replace(/field_(\d{3})/g, (match, fieldNum) => {
              const value = parseFloat(updatedData[`field_${fieldNum}`]) || 0;
              console.log(`Replacing ${match} with ${value}`);
              return value;
            });
            
            console.log(`Evaluating arithmetic: ${expr}`);
            // eslint-disable-next-line no-eval
            const result = String(eval(expr));
            
            if (updatedData[field.field_id] !== result) {
              console.log(`Arithmetic result for ${field.field_id}: ${result}`);
              updatedData[field.field_id] = result;
              changed = true;
            }
          }
        } catch (e) {
          console.error(`Error calculating field ${field.field_id}:`, e);
          console.error(`Calculate expression: ${field.calculate}`);
          updatedData[field.field_id] = 'Err';
        }
      }
    });
    
    if (!changed) break;
  }
  return updatedData;
};

const RiverScreen = ({ user, navigation, route }) => {
  const { editMode = false, batchData = null, fileName = null } = route.params || {};
  
  const [batches, setBatches] = useState({ 1: {} });
  const [activeBatch, setActiveBatch] = useState(1);
  const [images, setImages] = useState({});
  const [nowDate, setNowDate] = useState('');
  const [currentFileName, setCurrentFileName] = useState(fileName);

  // Khi khởi tạo hoặc edit mode
  useEffect(() => {
    const now = new Date();
    const formatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    setNowDate(formatted);
    
    if (editMode && batchData) {
      // Edit mode: load existing data
      console.log('📝 Edit mode: Loading existing batch data');
      const editBatch = resolveAutoValues({
        ...batchData,
        field_001: batchData.field_001 || formatted,
        field_004: batchData.field_004 || user?.full_name || 'Không rõ',
        beer_type: 'river'
      });
      setBatches({ 1: editBatch });
      setActiveBatch(1);
    } else {
      // Create mode: initialize with preset values
      console.log('✨ Create mode: Initializing new batch');
      const initialData = {
        field_001: formatted, // Ngày tháng năm
        field_004: user?.full_name || 'Không rõ', // Nhân viên
        beer_type: 'river'
      };
      
      // Thêm các preset values từ fieldDefinitions
      fieldDefinitions.forEach(field => {
        if (field.value && field.value !== '') {
          initialData[field.field_id] = field.value;
          console.log(`Setting preset value for ${field.field_id}: ${field.value}`);
        }
      });
      
      const firstBatch = resolveAutoValues(initialData);
      setBatches({ 1: firstBatch });
      setActiveBatch(1);
    }
  }, [user, editMode, batchData]);

  // Xử lý nhập liệu (đã sửa để resolve ngay lập tức)
  const handleInputChange = (fieldId, value) => {
    setBatches(prev => {
      const updated = { 
        ...prev, 
        [activeBatch]: { 
          ...prev[activeBatch], 
          [fieldId]: value 
        } 
      };
      
      // Resolve lại toàn bộ field auto ngay sau khi thay đổi
      updated[activeBatch] = resolveAutoValues(updated[activeBatch]);
      
      return updated;
    });
  };

  // Chụp ảnh và upload lên server
  const handleCapturePhoto = async (fieldId) => {
    try {
      // Kiểm tra quyền camera
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Lỗi', 'Cần quyền truy cập máy ảnh để chụp ảnh');
        return;
      }

      // Chụp ảnh
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        exif: false
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Hiển thị ảnh ngay lập tức
        setImages(prev => ({
          ...prev,
          [`${activeBatch}_${fieldId}`]: imageUri
        }));

        // Upload ảnh lên server
        await uploadImageToServer(imageUri, fieldId);
        
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    }
  };

  // Lấy ảnh đã upload từ server
  const loadExistingImages = async (batchId) => {
    try {
      const response = await fetch(`https://api.ibb.vn/api/images/field_100_photo/${batchId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.images.length > 0) {
          // Load ảnh từ server vào state
          result.images.forEach(image => {
            setImages(prev => ({
              ...prev,
              [`${batchId}_field_100_photo_server`]: `https://api.ibb.vn${image.url}`
            }));
          });
        }
      }
    } catch (error) {
      console.log('Could not load existing images:', error);
    }
  };

  // Load ảnh khi chuyển batch
  useEffect(() => {
    if (activeBatch) {
      loadExistingImages(activeBatch);
    }
  }, [activeBatch]);

  
  // Upload ảnh lên server Flask
  const uploadImageToServer = async (imageUri, fieldId) => {
    try {
      // Tạo tên file unique
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const batchInfo = batches[activeBatch];
      const tankNumber = batchInfo?.field_003 || 'unknown';
      const batchNumber = batchInfo?.field_002 || activeBatch;
      
      // Tên file: Tank[X]_Batch[Y]_Field[Z]_[timestamp].jpg
      const fileName = `Tank${tankNumber}_Batch${batchNumber}_${fieldId}_${timestamp}.jpg`;
      
      // Tạo FormData
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName
      });
      formData.append('folder', 'Chebien/Plato'); // Folder đích
      formData.append('fileName', fileName);
      formData.append('fieldId', fieldId);
      formData.append('batchId', activeBatch.toString());
      formData.append('tankNumber', tankNumber.toString());
      formData.append('batchNumber', batchNumber.toString());

      // Upload tới Flask server qua DNS api.ibb.vn
      const response = await fetch('https://api.ibb.vn/api/upload-image', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Image uploaded successfully:', result);
        
        // Lưu URL ảnh từ server vào state
        if (result.imageUrl) {
          setImages(prev => ({
            ...prev,
            [`${activeBatch}_${fieldId}_server`]: `https://api.ibb.vn${result.imageUrl}`
          }));
        }
        
        Alert.alert('Thành công', `Ảnh đã được lưu thành công\nFile: ${result.fileName}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(
        'Cảnh báo', 
        `Ảnh đã được chụp nhưng chưa upload lên server.\nLỗi: ${error.message}\nVui lòng kiểm tra kết nối mạng.`
      );
    }
  };

  // Xóa mẻ
  const handleDeleteBatch = (batchId) => {
    if (Object.keys(batches).length === 1) return;
    Alert.alert(
      "Xác nhận xoá mẻ",
      "Bạn có chắc muốn xoá mẻ này không? Dữ liệu sẽ bị mất vĩnh viễn.",
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Đồng ý xoá", style: "destructive", onPress: () => {
            const remain = { ...batches };
            delete remain[batchId];
            const remainKeys = Object.keys(remain).map(Number);
            setBatches(remain);
            setActiveBatch(remainKeys.length ? remainKeys[0] : 1);
          }
        }
      ]
    );
  };

  // Thêm mẻ mới
  const handleAddBatch = () => {
    const newId = Math.max(...Object.keys(batches).map(Number)) + 1;
    
    // Khởi tạo dữ liệu với preset values
    const initialData = {
      field_001: nowDate, // Ngày tháng năm
      field_004: user?.full_name || 'Không rõ', // Nhân viên
      beer_type: 'river'
    };
    
    // Thêm các preset values từ fieldDefinitions
    fieldDefinitions.forEach(field => {
      if (field.value && field.value !== '') {
        initialData[field.field_id] = field.value;
      }
    });
    
    const newBatch = resolveAutoValues(initialData);
    
    setBatches(prev => ({
      ...prev,
      [newId]: newBatch
    }));
    setActiveBatch(newId);
  };

  // Lưu phiếu nấu (cả local và server)
  const handleSubmit = async () => {
    const currentBatch = resolveAutoValues(batches[activeBatch]);
    setBatches(prev => ({
      ...prev,
      [activeBatch]: currentBatch
    }));
    
    const missingField = fieldDefinitions.find(f => f.required && !currentBatch[f.field_id]);
    if (missingField) {
      Alert.alert(
        'Thiếu thông tin',
        `Trường bắt buộc: ${missingField.label} chưa được nhập`,
        [
          { text: 'Nhập tiếp', onPress: () => { } },
          { text: 'Vẫn lưu', onPress: () => saveBatch(currentBatch) }
        ]
      );
      return;
    }
    
    // Lưu phiếu hoàn chỉnh
    await saveBatch(currentBatch);
  };

  // Lưu batch (cả local và server)
  const saveBatch = async (batchData) => {
    try {
      const saveData = {
        ...batchData,
        me_so: batchData.field_002 || activeBatch, // Mẻ nấu số
        tank_so: batchData.field_003 || 'unknown', // Tank số
        nhan_vien: batchData.field_004 || user?.full_name,
        ngay_nau: batchData.field_001 || nowDate,
        batch_id: activeBatch,
        beer_type: 'river',
        created_at: new Date().toISOString()
      };

      // 1. Lưu local file trước
      await saveToLocalFile(saveData);
      
      // 2. Sau đó sync lên server
      await syncToServer(saveData);
      
      Alert.alert('Thành công', 'Phiếu nấu River đã được lưu thành công!');
      
    } catch (error) {
      console.error('Error saving batch:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi lưu phiếu: ' + error.message);
    }
  };

  // Lưu vào file local với định dạng mới: YYYY-MM-DD_meXX_tankYY_HHMMSS.json
  const saveToLocalFile = async (data) => {
    try {
      // Tạo thư mục nếu chưa có
      await FileSystem.makeDirectoryAsync(ACTIVE_DIR, { intermediates: true });
      
      let fileName;
      
      if (editMode && currentFileName) {
        // Edit mode: overwrite existing file
        fileName = currentFileName;
        console.log(`📝 Edit mode: Updating existing file ${fileName}`);
      } else {
        // Create mode: tạo file mới với định dạng YYYY-MM-DD_meXX_tankYY_HHMMSS.json
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const hh = now.getHours().toString().padStart(2, '0');
        const min = now.getMinutes().toString().padStart(2, '0');
        const ss = now.getSeconds().toString().padStart(2, '0');
        
        const meSo = (data.field_002 || data.me_so || activeBatch).toString().padStart(2, '0');
        const tankSo = (data.field_003 || data.tank_so || '00').toString().padStart(2, '0');
        
        fileName = `${yyyy}-${mm}-${dd}_me${meSo}_tank${tankSo}_${hh}${min}${ss}.json`;
        console.log(`✨ Create mode: Creating new file ${fileName}`);
      }
      
      const filePath = ACTIVE_DIR + fileName;
      
      // Lưu file JSON
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`✅ Saved River to local file: ${fileName}`);
      setCurrentFileName(fileName); // Update current file name
      return fileName;
      
    } catch (error) {
      console.error('❌ Error saving River to local file:', error);
      throw new Error('Không thể lưu file local: ' + error.message);
    }
  };

  // Sync lên server (optional)
  const syncToServer = async (data) => {
    try {
      const response = await fetch('https://api.ibb.vn/save_form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Synced River to server:', result.message);
      } else {
        console.warn('⚠️ River Server sync failed, but local file saved');
      }
    } catch (error) {
      console.warn('⚠️ River Server sync failed:', error.message, '(Local file still saved)');
      // Không throw error để không làm gián đoạn việc lưu local
    }
  };

  // Chọn giờ phút
  const renderTimeDropdown = (fid, label) => {
    const value = batches[activeBatch]?.[fid] || '';
    const [hour = '00', min = '00'] = value.split(':');
    
    return (
      <View key={fid}>
        <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Picker 
            selectedValue={hour} 
            style={{ flex: 1, height: TAB_HEIGHT }}
            onValueChange={val => handleInputChange(fid, `${val}:${min}`)}>
            {[...Array(24).keys()].map(i => (
              <Picker.Item key={i} label={i.toString().padStart(2, '0')} value={i.toString().padStart(2, '0')} />
            ))}
          </Picker>
          <Text>:</Text>
          <Picker 
            selectedValue={min} 
            style={{ flex: 1, height: TAB_HEIGHT }}
            onValueChange={val => handleInputChange(fid, `${hour}:${val}`)}>
            {[...Array(60).keys()].map(i => (
              <Picker.Item key={i} label={i.toString().padStart(2, '0')} value={i.toString().padStart(2, '0')} />
            ))}
          </Picker>
        </View>
      </View>
    );
  };

  // Hiển thị từng field
  const renderField = (field) => {
    const fid = field.field_id;
    const label = field.label;
    const value = batches[activeBatch]?.[fid] ?? '';
    const commonStyle = { borderWidth: 1, marginBottom: 10, padding: 8, fontSize: 17, borderRadius: 8 };
    const editable = !!field.required;

    if (field.type === 'photo') {
      const localImageKey = `${activeBatch}_${fid}`;
      const serverImageKey = `${activeBatch}_${fid}_server`;
      const localImage = images[localImageKey];
      const serverImage = images[serverImageKey];
      
      return (
        <View key={fid} style={{ marginBottom: 10 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{label}</Text>
          
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 10
            }}
            onPress={() => handleCapturePhoto(fid)}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
              📸 Chụp ảnh {field.label.includes('Plato') ? 'Plato' : ''}
            </Text>
          </TouchableOpacity>
          
          {localImage && (
            <View>
              <Image 
                source={{ uri: localImage }} 
                style={{ 
                  width: '100%', 
                  height: 200, 
                  marginVertical: 10, 
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: serverImage ? '#4CAF50' : '#FFA500'
                }} 
              />
              
              {/* Hiển thị trạng thái upload */}
              <View style={{
                backgroundColor: serverImage ? '#4CAF50' : '#FFA500',
                padding: 8,
                borderRadius: 5,
                marginTop: 5
              }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                  {serverImage ? '✅ Đã lưu lên server' : '⏳ Chưa upload lên server'}
                </Text>
              </View>
              
              {/* Hiển thị tên file dự kiến */}
              <Text style={{ 
                fontSize: 12, 
                color: '#666', 
                marginTop: 5,
                fontStyle: 'italic' 
              }}>
                Tên file: Tank{batches[activeBatch]?.field_003 || 'X'}_Batch{batches[activeBatch]?.field_002 || activeBatch}_{fid}
              </Text>
            </View>
          )}
        </View>
      );
    }
    
    if (field.type === 'fixed') {
      return (
        <View key={fid}>
          <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{label}</Text>
          <TextInput
            value={field.value || ''}
            editable={false}
            style={{ ...commonStyle, backgroundColor: '#eee' }}
          />
        </View>
      );
    }
    
    if (field.type === 'autofixed') {
      return (
        <View key={fid}>
          <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{label}</Text>
          <TextInput
            value={value}
            editable={false}
            style={{ ...commonStyle, backgroundColor: '#eee' }}
          />
        </View>
      );
    }
    
    if (field.type === 'auto') {
      if (editable) {
        return (
          <View key={fid}>
            <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{label}</Text>
            <TextInput
              value={value}
              editable={true}
              onChangeText={text => handleInputChange(fid, text)}
              placeholder={`[auto] ${label}`}
              style={{ ...commonStyle, backgroundColor: '#eef' }}
            />
          </View>
        );
      } else {
        // readonly: chỉ show giá trị auto
        return (
          <View key={fid}>
            <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{label}</Text>
            <TextInput
              value={value}
              editable={false}
              style={{ ...commonStyle, backgroundColor: '#eee' }}
            />
          </View>
        );
      }
    }
    
    if (field.type === 'preset-editable') {
      return (
        <View key={fid}>
          <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{label}</Text>
          <TextInput
            defaultValue={field.value || ''}
            value={value}
            onChangeText={text => handleInputChange(fid, text)}
            style={commonStyle}
            editable={editable}
          />
        </View>
      );
    }
    
    if (field.type === 'dropdown' && Array.isArray(field.option)) {
      return (
        <View key={fid}>
          <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{label}</Text>
          <Picker 
            selectedValue={value} 
            onValueChange={(val) => handleInputChange(fid, val)} 
            style={{ height: TAB_HEIGHT }} 
            enabled={editable}>
            <Picker.Item label="Chọn..." value="" />
            {field.option.map((op, idx) => (
              <Picker.Item key={idx} label={op} value={op} />
            ))}
          </Picker>
        </View>
      );
    }
    
    if (field.type === 'time_dropdown') {
      return renderTimeDropdown(fid, label);
    }
    
    return (
      <View key={fid}>
        <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{label}</Text>
        <TextInput
          placeholder={label}
          value={value}
          onChangeText={text => handleInputChange(fid, text)}
          style={commonStyle}
          editable={editable}
        />
      </View>
    );
  };

  const sortedFields = [...fieldDefinitions];
  const batchIds = Object.keys(batches).map(Number);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ padding: 10, paddingTop: 18 }}>
        <Button title="← Quay về trang chính" onPress={() => navigation?.goBack && navigation.goBack()} />
      </View>
      
      <ScrollView horizontal style={{ backgroundColor: '#eee', flexDirection: 'row', paddingVertical: 4, minHeight: TAB_HEIGHT }}>
        {batchIds.map((batchId) => (
          <View key={batchId} style={{
            flexDirection: 'row', alignItems: 'center', marginHorizontal: 4,
            backgroundColor: activeBatch === batchId ? '#007AFF' : '#fff',
            borderRadius: 16, minWidth: 120, height: TAB_HEIGHT, paddingRight: 8, paddingLeft: 16
          }}>
            <TouchableOpacity onPress={() => setActiveBatch(batchId)} style={{ flex: 1 }}>
              <Text style={{
                color: activeBatch === batchId ? '#fff' : '#111',
                fontWeight: 'bold', fontSize: 18, textAlign: 'center'
              }}>
                {`Mẻ ${batchId}`}
              </Text>
            </TouchableOpacity>
            {batchIds.length > 1 && (
              <TouchableOpacity
                onPress={() => handleDeleteBatch(batchId)}
                style={{
                  marginLeft: 8,
                  padding: 8,
                  borderRadius: 16,
                  backgroundColor: '#f88'
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>✖</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {/* Thêm mẻ */}
        <TouchableOpacity
          onPress={handleAddBatch}
          style={{
            backgroundColor: '#4dd',
            minWidth: 56,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            height: TAB_HEIGHT,
            marginHorizontal: 8
          }}>
          <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 24 }}>＋</Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={{ padding: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          🍺 Bia River - {user?.full_name || 'Người dùng'} - Ngày: {nowDate}
        </Text>
        
        {/* Debug info */}
        {editMode && (
          <View style={{ backgroundColor: '#e7f3ff', padding: 10, borderRadius: 5, marginBottom: 10 }}>
            <Text style={{ fontSize: 14, color: '#007AFF', fontWeight: 'bold' }}>
              📝 Chế độ chỉnh sửa - Bia River
            </Text>
            {currentFileName && (
              <Text style={{ fontSize: 12, color: '#666' }}>
                File: {currentFileName}
              </Text>
            )}
          </View>
        )}
        
        {sortedFields.map(renderField)}
        
        <Button title='💾 Lưu phiếu Bia River' onPress={handleSubmit} />
        
        {/* Debug button to check saved files */}
        {__DEV__ && (
          <TouchableOpacity
            style={{ backgroundColor: '#666', padding: 10, borderRadius: 5, marginTop: 10 }}
            onPress={async () => {
              try {
                const files = await FileSystem.readDirectoryAsync(ACTIVE_DIR);
                Alert.alert('Files in active/', files.join('\n') || 'No files found');
              } catch (error) {
                Alert.alert('Debug', 'Error reading directory: ' + error.message);
              }
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>🔍 Debug: Check saved files</Text>
          </TouchableOpacity>
        )}
        
        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RiverScreen;