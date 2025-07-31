// screens/CheckLogScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function CheckLogScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Kiểm tra nhật ký</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('CheckLenMen')}>
        <Text style={styles.buttonText}>🧪 Nhật ký lên men</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('CheckLoc')}>
        <Text style={styles.buttonText}>🧯 Nhật ký lọc</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40 },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 20,
    width: '80%',
    alignItems: 'center'
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
