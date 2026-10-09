import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL || '',
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      if (!API_URL) {
        error.message = 'EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env and set your computer LAN address, then restart Expo.';
      } else if (error.code === 'ECONNABORTED') {
        error.message = `The WildPulse server at ${API_URL} timed out. Check that the backend is running and the phone is on the same Wi-Fi.`;
      } else {
        error.message = `Cannot reach ${API_URL}. On a phone, localhost is the phone itself. Use the computer LAN address, and allow port 5000 through the firewall.`;
      }
    }
    return Promise.reject(error);
  }
);

export { API_URL };
export default api;
