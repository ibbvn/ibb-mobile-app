// App.js - Fixed Navigator with correct import paths
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button } from 'react-native';

// Screens chính
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';

// Chế biến screens
import CheBienScreen from './screens/CheBienScreen';
import NewBatchScreen from './screens/NewBatchScreen';
import IncompleteBatchListScreen from './screens/IncompleteBatchListScreen';
import AllBatchListScreen from './screens/AllBatchListScreen';
import ViewBatchScreen from './screens/ViewBatchScreen';
import RiverScreen from './screens/RiverScreen';
import HanoiScreen from './screens/HanoiScreen';
import ChaihgScreen from './screens/ChaihgScreen';

// QA screens
import QaScreen from './screens/QaScreen';
import TankListScreen from './screens/TankListScreen';
import TankOptionsPopup from './screens/TankOptionsPopup';
import LenMenScreen from './screens/LenMenScreen';
import LocScreen from './screens/LocScreen';
import CheckLogScreen from './screens/CheckLogScreen';
import CheckLenMen from './screens/CheckLenMen';
import CheckLoc from './screens/CheckLoc';
import QaDashboardScreen from './screens/QaDashboardScreen';

// ❌ KHÔNG IMPORT BatchFileManager trong App.js vì nó không được sử dụng ở đây
// ❌ import BatchFileManager from '../utils/BatchFileManager'; // WRONG PATH

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* =============== TRANG CHÍNH VÀ ĐĂNG NHẬP =============== */}
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ 
            title: '🏠 IBB Management System',
            headerShown: true
          }} 
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ 
            title: '🔐 Đăng nhập',
            headerShown: true
          }} 
        />

        {/* =============== CHẾ BIẾN SCREENS =============== */}
        <Stack.Screen 
          name="CheBien" 
          component={CheBienScreen} 
          options={{ 
            title: '🍺 Chế Biến',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="NewBatchScreen" 
          component={NewBatchScreen} 
          options={{ 
            title: '✨ Nấu Mẻ Mới',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="IncompleteBatchListScreen" 
          component={IncompleteBatchListScreen} 
          options={{ 
            title: '📝 Mẻ Chưa Hoàn Thành',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="AllBatchListScreen" 
          component={AllBatchListScreen} 
          options={{ 
            title: '📂 Tổng Hợp Mẻ Nấu',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="ViewBatchScreen" 
          component={ViewBatchScreen} 
          options={{ 
            title: '👀 Xem Chi Tiết Phiếu',
            headerShown: false // ViewBatchScreen có header riêng
          }} 
        />

        {/* =============== CÁC LOẠI BIA =============== */}
        <Stack.Screen 
          name="RiverScreen" 
          component={RiverScreen} 
          options={{ 
            title: '🍺 Bia River',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="HanoiScreen" 
          component={HanoiScreen} 
          options={{ 
            title: '🏯 Bia Hà Nội',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="ChaihgScreen" 
          component={ChaihgScreen} 
          options={{ 
            title: '👑 Bia Chai Hoàng Gia',
            headerShown: true
          }} 
        />

        {/* =============== QA SCREENS =============== */}
        <Stack.Screen 
          name="QA" 
          component={QaScreen} 
          options={{ 
            title: '🔬 Kiểm Soát Chất Lượng',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="TankList" 
          component={TankListScreen} 
          options={{ 
            title: '🏭 Danh Sách Tank',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="LenMen" 
          component={LenMenScreen} 
          options={{ 
            title: '🧪 Nhật Ký Lên Men',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="Loc" 
          component={LocScreen} 
          options={{ 
            title: '🧽 Nhật Ký Lọc',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="CheckLog" 
          component={CheckLogScreen} 
          options={{ 
            title: '🔍 Kiểm Tra Nhật Ký',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="CheckLenMen" 
          component={CheckLenMen} 
          options={{ 
            title: '📋 Xem Nhật Ký Lên Men',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="CheckLoc" 
          component={CheckLoc} 
          options={{ 
            title: '📋 Xem Nhật Ký Lọc',
            headerShown: true
          }} 
        />
        
        <Stack.Screen 
          name="QaDashboard" 
          component={QaDashboardScreen} 
          options={{ 
            title: '📊 Tổng Hợp QA',
            headerShown: true
          }} 
        />

        {/* =============== UTILITY SCREENS =============== */}
        {/* TankOptionsPopup không cần thêm vào Stack vì nó là Modal */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}