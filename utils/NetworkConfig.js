// utils/NetworkConfig.js - Optimized for tunnel architecture
import { Platform } from 'react-native';

// ✅ OPTIMAL: Always use api.ibb.vn (tunnel to Flask backend)
export const API_CONFIG = {
  production: {
    baseUrl: 'https://api.ibb.vn',
    timeout: 30000,
    description: 'Production tunnel to Flask backend'
  },
  development: {
    // ✅ FIXED: Also use api.ibb.vn in development for consistency
    baseUrl: 'https://api.ibb.vn', 
    timeout: 15000,
    description: 'Development tunnel to Flask backend'
  }
};

export const getApiConfig = () => {
  // Always use the tunnel, regardless of environment
  return __DEV__ ? API_CONFIG.development : API_CONFIG.production;
};

export const getApiBaseUrl = () => {
  return getApiConfig().baseUrl;
};

export const getApiTimeout = () => {
  return getApiConfig().timeout;
};

// Test network connectivity through tunnel
export const testNetworkConnection = async () => {
  const config = getApiConfig();
  
  try {
    console.log(`🔍 Testing tunnel connection: ${config.baseUrl}`);
    console.log(`📡 This will tunnel to Flask backend automatically`);
    
    const response = await fetch(`${config.baseUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Tunnel connection successful:', result.status);
      console.log('🔗 Data flow: App → api.ibb.vn → Flask Backend');
      return { success: true, data: result };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Tunnel connection failed:', error);
    return { 
      success: false, 
      error: error.message,
      suggestions: [
        'Check internet connection',
        'Verify api.ibb.vn is accessible',
        'Check if Flask backend is running',
        'Verify tunnel configuration',
        `Tunnel URL: ${config.baseUrl}`
      ]
    };
  }
};

// Get network architecture info
export const getNetworkInfo = () => {
  return {
    platform: Platform.OS,
    isDev: __DEV__,
    apiUrl: getApiBaseUrl(),
    timeout: getApiTimeout(),
    architecture: 'App → api.ibb.vn (tunnel) → Flask Backend',
    dataStorage: 'Flask Backend (data/ folder)',
    tunnelActive: true
  };
};

// Helper function to show network architecture
export const logNetworkDebug = () => {
  const info = getNetworkInfo();
  console.log('🏗️ Network Architecture:');
  console.log(`   ${info.architecture}`);
  console.log(`   Platform: ${info.platform}`);
  console.log(`   Environment: ${info.isDev ? 'Development' : 'Production'}`);
  console.log(`   Tunnel URL: ${info.apiUrl}`);
  console.log(`   Data Storage: ${info.dataStorage}`);
  console.log(`   Timeout: ${info.timeout}ms`);
  console.log('');
  console.log('🔄 Data Flow:');
  console.log('   1. App sends request to api.ibb.vn');
  console.log('   2. api.ibb.vn tunnels to Flask backend');
  console.log('   3. Flask processes and saves to data/ folder');
  console.log('   4. Response tunneled back through api.ibb.vn');
  
  if (info.isDev) {
    console.log('');
    console.log('💡 Development Note:');
    console.log('   Using same tunnel as production for consistency');
    console.log('   No need for IP configuration or localhost setup');
  }
};