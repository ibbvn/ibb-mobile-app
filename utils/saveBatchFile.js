// utils/saveBatchFile.js
import * as FileSystem from 'expo-file-system';

export async function saveBatchFile(batchData) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  // Chuẩn hóa lấy số mẻ và số tank
  const batchNum = batchData.field_002 || batchData.me_so || 'XX';
  const tankNum = batchData.field_003 || batchData.tank_so || 'YY';

  const fileName = `${yyyy}-${mm}-${dd}_me${batchNum}_tank${tankNum}_${hh}${min}${ss}.json`;
  const dirPath = FileSystem.documentDirectory + 'chebien/active/';
  const filePath = dirPath + fileName;

  await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(batchData, null, 2));

  return fileName;
}
