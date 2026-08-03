import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND } from '../config';

const api = axios.create({
  baseURL: BACKEND,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
