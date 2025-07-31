// screens/QaDashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

export default function QaDashboardScreen() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [summary, setSummary] = useState(null);
  const [logList, setLogList] = useState([]);
  const DATA_DIR = FileSystem.documentDirectory + 'qa/';

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toISOString().slice(0, 10);
  };

  const loadDashboard = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(DATA_DIR);
      const lenmenFiles = files.filter(f => f.startsWith('tank_') && f.endsWith('.json'));
      const locFiles = files.filter(f => f.startsWith('loc_tank') && f.endsWith('.json'));

      const tankInfo = {};
      let totalVolumeByTank = {};
      let totalVolumeByType = {};
      let logListTmp = [];
      let totalLocVolume = 0;

      const from = fromDate || toDate || '';
      const to = toDate || fromDate || '';

      const inRange = (fname) => {
        if (!from && !to) return true;
        const match = fname.match(/day_(\d{4}-\d{2}-\d{2})/);
        if (!match) return false;
        const d = match[1];
        return d >= from && d <= to;
      };

      for (const file of lenmenFiles) {
        if (!inRange(file)) continue;
        const content = await FileSystem.readAsStringAsync(DATA_DIR + file);
        const json = JSON.parse(content);
        tankInfo[json.tank_so] = {
          ...json,
          da_dong: false,
          con_lai: parseFloat(json.tong_the_tich),
          loai_bia: json.loai_bia || 'Không rõ'
        };
        totalVolumeByTank[json.tank_so] = parseFloat(json.tong_the_tich);
        const type = json.loai_bia || 'Không rõ';
        totalVolumeByType[type] = (totalVolumeByType[type] || 0) + parseFloat(json.tong_the_tich);
      }

      for (const file of locFiles) {
        if (!inRange(file)) continue;
        const content = await FileSystem.readAsStringAsync(DATA_DIR + file);
        const json = JSON.parse(content);
        const tank = json.tank;

        if (json.da_dong) tankInfo[tank].da_dong = true;

        for (const lo of json.lo_list || []) {
          totalLocVolume += parseFloat(lo.volume);
          if (tankInfo[tank]) {
            tankInfo[tank].con_lai -= parseFloat(lo.volume);
            const type = tankInfo[tank].loai_bia;
            totalVolumeByType[type] -= parseFloat(lo.volume);
          }
          logListTmp.push({
            code: lo.code,
            tank,
            volume: lo.volume,
            co2: lo.co2,
            time: lo.time,
            type: tankInfo[tank]?.loai_bia || 'Không rõ'
          });
        }
      }

      const tanksWithLog = Object.keys(tankInfo);
      const tanksFiltering = tanksWithLog.filter(t => !tankInfo[t].da_dong);
      const tanksNoLog = Array.from({ length: 17 }, (_, i) => `${i + 1}`).filter(t => !tankInfo[t]);

      const totalRemain = Object.values(tankInfo).reduce((a, b) => a + b.con_lai, 0);

      setSummary({
        tanksWithLog: tanksWithLog.length,
        tanksFiltering: tanksFiltering.length,
        locsToday: logListTmp.length,
        tanksNoLog,
        totalRemain,
        remainByType: totalVolumeByType,
        totalLocVolume
      });

      setLogList(logListTmp);
    } catch (e) {
      Alert.alert('Lỗi', e.message);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={styles.title}>📊 Tổng hợp QA</Text>

      <View style={styles.row}>
        <TextInput
          placeholder="Từ ngày (YYYY-MM-DD)"
          value={fromDate}
          onChangeText={setFromDate}
          style={styles.input}
        />
        <TextInput
          placeholder="Đến ngày (YYYY-MM-DD)"
          value={toDate}
          onChangeText={setToDate}
          style={styles.input}
        />
      </View>
      <Button title="🔄 Tổng hợp lại" onPress={loadDashboard} />

      {summary && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sub}>✅ Tổng số tank có nhật ký lên men: {summary.tanksWithLog}</Text>
          <Text style={styles.sub}>🔄 Số tank đang lọc (chưa đóng): {summary.tanksFiltering}</Text>
          <Text style={styles.sub}>📦 Số lô lọc trong giai đoạn: {summary.locsToday}</Text>
          <Text style={styles.sub}>📉 Tổng lượng đã lọc: {summary.totalLocVolume} L</Text>
          <Text style={styles.sub}>🧊 Tổng lượng còn tồn: {summary.totalRemain.toFixed(1)} L</Text>

          <Text style={styles.sub}>🍺 Tồn theo loại:</Text>
          {Object.entries(summary.remainByType).map(([k, v], i) => (
            <Text key={i} style={{ marginLeft: 10 }}>• {k}: {v.toFixed(1)} L</Text>
          ))}

          {summary.tanksNoLog.length > 0 && (
            <Text style={[styles.sub, { color: 'red', marginTop: 10 }]}>
              ⚠️ Tank chưa có dữ liệu: {summary.tanksNoLog.join(', ')}
            </Text>
          )}
        </View>
      )}

      <View style={{ marginTop: 30 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>📋 Danh sách lô đã lọc:</Text>
        {logList.map((l, idx) => (
          <View key={idx} style={styles.lo}>
            <Text>• {l.code} – {l.volume}L – CO₂: {l.co2} – {l.time}</Text>
            <Text style={{ color: '#555', fontSize: 13 }}>Loại: {l.type}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  sub: { fontSize: 16, marginVertical: 4 },
  row: { flexDirection: 'row', marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 8,
    borderRadius: 6, flex: 1, marginRight: 8
  },
  lo: { marginVertical: 6, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 6 }
});
