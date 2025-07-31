// utils/beerTypeHandler.js - Utility để handle các loại bia khác nhau

import riverFields from '../assets/river.json';
// import hanoiFields from '../assets/hanoi.json';  // Tạo sau
// import chaihgFields from '../assets/chaihg.json'; // Tạo sau

export const getFieldDefinitions = (beerType) => {
  switch (beerType?.toLowerCase()) {
    case 'hanoi':
      // return hanoiFields; // Sẽ tạo sau
      return riverFields; // Tạm thời dùng river
    case 'chaihg':
      // return chaihgFields; // Sẽ tạo sau  
      return riverFields; // Tạm thời dùng river
    case 'river':
    default:
      return riverFields;
  }
};

export const detectBeerTypeFromData = (data, fileName) => {
  // Detect từ filename
  if (fileName) {
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('hanoi')) return 'hanoi';
    if (lowerFileName.includes('chaihg') || lowerFileName.includes('chai')) return 'chaihg';
  }
  
  // Detect từ data fields
  if (data.beer_type) {
    return data.beer_type.toLowerCase();
  }
  
  // Detect từ các field đặc trung
  if (data.hanoi_specific_field) return 'hanoi';
  if (data.chaihg_specific_field) return 'chaihg';
  
  // Default
  return 'river';
};

export const getBeerTypeDisplayInfo = (beerType) => {
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