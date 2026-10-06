import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For Android emulator, 10.0.2.2 maps to host PC localhost:5000.
// For physical devices on the same Wi-Fi, use host machine LAN IP (192.168.8.128).
const DEV_LAN_IP = '192.168.8.128';
const API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:5000/api'
  : `http://${DEV_LAN_IP}:5000/api`;

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;