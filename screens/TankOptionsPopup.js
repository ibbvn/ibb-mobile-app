// TankOptionsPopup.js - Fixed without temperature update
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function TankOptionsPopup({ tankNumber, tankData, onClose }) {
  const navigation = useNavigation();

  if (!tankNumber) return null;

  const handleSelect = (type) => {
    onClose();
    if (type === 'lenmen') {
      navigation.navigate('LenMen', { tankNumber, tankData });
    }
    if (type === 'loc') {
      navigation.navigate('Loc', { tankNumber, tankData });
    }
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
    return volume.toFixed(0);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.popup}>
        <Text style={styles.title}>📌 Tank số {tankNumber}</Text>

        {/* Tank Status Info */}
        {tankData && (
          <View style={styles.tankStatusContainer}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Trạng thái:</Text>
              <Text style={[
                styles.statusValue,
                { color: tankData.status === 'empty' ? '#999' : '#007AFF' }
              ]}>
                {tankData.status === 'empty' ? '🏮 TRỐNG' : '🍺 ĐANG SỬ DỤNG'}
              </Text>
            </View>

            {tankData.status !== 'empty' && (
              <>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Loại bia:</Text>
                  <Text style={styles.statusValue}>
                    {getBeerTypeIcon(tankData.beerType)} {tankData.beerType?.toUpperCase() || 'UNKNOWN'}
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Lượng hiện tại:</Text>
                  <Text style={styles.statusValue}>
                    💧 {formatVolume(tankData.currentVolume)}L / {formatVolume(tankData.capacity)}L
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Độ đầy:</Text>
                  <Text style={styles.statusValue}>
                    📊 {tankData.fillPercentage.toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Nhiệt độ:</Text>
                  <Text style={styles.statusValue}>
                    🌡 {tankData.temperature ?? '--'}°C
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Ngày đầy:</Text>
                  <Text style={styles.statusValue}>
                    📅 {tankData.lastFillDate || 'Không rõ'}
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Số mẻ:</Text>
                  <Text style={styles.statusValue}>
                    🍺 {tankData.batchCount} mẻ (mới nhất: #{tankData.latestBatch})
                  </Text>
                </View>
              </>
            )}

            {tankData.status === 'empty' && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Dung tích:</Text>
                <Text style={styles.statusValue}>
                  📏 {formatVolume(tankData.capacity)}L
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleSelect('lenmen')}>
            <Text style={styles.buttonText}>🧪 Nhật ký lên men</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => handleSelect('loc')}>
            <Text style={styles.buttonText}>🧽 Nhật ký lọc</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}>
          <Text style={styles.cancelText}>✖ Đóng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  popup: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%'
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 16,
    textAlign: 'center',
    color: '#333'
  },
  tankStatusContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right'
  },
  buttonContainer: {
    gap: 12
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  cancelButton: { 
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center'
  },
  cancelText: { 
    color: '#666', 
    fontSize: 16,
    fontWeight: '600'
  }
});