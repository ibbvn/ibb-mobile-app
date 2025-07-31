// screens/CheckLoc.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';

export default function CheckLoc() {
  const [date, setDate] = useState('');
  const [loCode, setLoCode] = useState('');
  const [result, setResult] = useState([]);
  const [error, setError] = useState('');

  const DATA_DIR = FileSystem.documentDirectory + 'qa/';

  const handleSearch = async () => {
    setError('');
    setResult([]);

    try {
      const files = await FileSystem.readDirectoryAsync(DATA_DIR);
      const locFiles = files.filter(f => f.startsWith('loc_tank') && f.endsWith('.json'));

      let matches = [];

      for (const file of locFiles) {
        const content = await FileSystem.readAsStringAsync(DATA_DIR + file);
        const json = JSON.parse(content);

        const matchDate = date ? file.includes(`day_${date}`) : true;
        const matchLo = loCode
          ? json.lo_list?.some(lo => lo.code === loCode)
          : true;

        if (matchDate && matchLo) {
          matches.push({ file, ...json });
        }
      }

      if (matches.length === 0) {
        setError('Không tìm thấy nhật ký lọc phù hợp.');
      } else {
        setResult(matches);
      }
    } catch (e) {
      console.error(e);
      setError('Lỗi khi tìm kiếm dữ liệu.');
    }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={styles.header}>🔍 Kiểm tra nhật ký lọc</Text>

      <TextInput
        placeholder="Nhập ngày (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        style={styles.input}
      />
      <TextInput
        placeholder="Nhập số lô (VD: 3.1.2)"
        value={loCode}
        onChangeText={setLoCode}
        style={styles.input}
      />
      <Button title="Tìm kiếm" onPress={handleSearch} />

      {error ? <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text> : null}

      {result.length > 0 && (
        <View style={{ marginTop: 20 }}>
          {result.map((item, idx) => (
            <View key={idx} style={styles.block}>
              <Text style={styles.title}>📦 {item.file}</Text>
              <Text>Tank: {item.tank}</Text>
              <Text>Ngày: {item.ngay}</Text>
              <Text>Trạng thái: {item.da_dong ? '✅ Đã đóng' : '🟡 Đang lọc'}</Text>

              <Text style={{ fontWeight: 'bold', marginTop: 6 }}>Danh sách lô:</Text>
              {item.lo_list.map((lo, i) => (
                <Text key={i}>
                  • {lo.code} – BBT {lo.bbt} – {lo.volume}L – CO₂: {lo.co2} – {lo.time}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 6
  },
  block: {
    marginBottom: 20,
    backgroundColor: '#f4f4f4',
    padding: 12,
    borderRadius: 8
  },
  title: { fontWeight: 'bold', marginBottom: 4 }
});
