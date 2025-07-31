// screens/CheckLenMen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';

export default function CheckLenMen() {
  const [tank, setTank] = useState('');
  const [date, setDate] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const DATA_DIR = FileSystem.documentDirectory + 'qa/';

  const handleSearch = async () => {
    setResult(null);
    setError('');

    try {
      const files = await FileSystem.readDirectoryAsync(DATA_DIR);
      const targetFiles = files.filter(f => f.startsWith('tank_') && f.endsWith('.json'));

      let matches = [];

      for (const file of targetFiles) {
        const content = await FileSystem.readAsStringAsync(DATA_DIR + file);
        const json = JSON.parse(content);

        const matchTank = tank ? file.includes(`tank_${tank}`) : true;
        const matchDate = date ? file.includes(`day_${date}`) : true;

        if (matchTank && matchDate) matches.push({ file, data: json });
      }

      if (matches.length === 0) {
        setError('Không tìm thấy nhật ký phù hợp.');
        return;
      }

      if (matches.length === 1) {
        setResult(matches[0]);
      } else {
        setResult({ multi: true, list: matches });
      }
    } catch (e) {
      console.error(e);
      setError('Lỗi khi tìm nhật ký.');
    }
  };

  const renderOneLog = (data) => (
    <View style={styles.block}>
      <Text style={styles.title}>Tank {data.tank_so}</Text>
      <Text>Ngày: {data.ngay}</Text>
      <Text>Mẻ: {data.me_so}</Text>
      <Text>Plato TB: {data.plato_tb} °P</Text>
      <Text>Tổng thể tích: {data.tong_the_tich} L</Text>
      <Text>Người kiểm tra: {data.nguoi_kiem_tra}</Text>

      <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Diễn biến 15 ngày:</Text>
      {data.data.map((d, idx) => (
        <Text key={idx}>
          Ngày {d.ngay_thu}: {d.gio || '--'}h – Plato: {d.plato || '--'} – pH: {d.pH || '--'} – Tế bào: {d.te_bao || '--'} – T: {d.nhiet_do || '--'}°C – Áp: {d.ap_suat || '--'}
        </Text>
      ))}
    </View>
  );

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={styles.header}>🔍 Kiểm tra nhật ký lên men</Text>

      <TextInput
        placeholder="Nhập số tank (VD: 3)"
        value={tank}
        onChangeText={setTank}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        placeholder="Nhập ngày (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        style={styles.input}
      />
      <Button title="Tìm kiếm" onPress={handleSearch} />

      {error ? <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text> : null}

      {result?.multi ? (
        <View style={{ marginTop: 20 }}>
          <Text>🔎 Tìm thấy nhiều kết quả:</Text>
          {result.list.map((item, idx) => (
            <Text key={idx}>• {item.file}</Text>
          ))}
        </View>
      ) : result ? (
        renderOneLog(result.data)
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 6
  },
  block: { marginTop: 20, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 }
});
