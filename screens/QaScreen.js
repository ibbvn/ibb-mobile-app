// screens/QaScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function QaScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Giao diện QA</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('TankList')}>
        <Text style={styles.buttonText}>📝 Nhập số liệu</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('QaDashboard')}>
        <Text style={styles.buttonText}>📊 Tổng hợp</Text>
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
