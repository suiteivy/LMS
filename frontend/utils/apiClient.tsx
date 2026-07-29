import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = (): string => {
  let envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (__DEV__ && Platform.OS !== 'web') {
    const hostUri = Constants.expoConfig?.hostUri;
    const devIp = hostUri ? hostUri.split(':')[0] : (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
    if (envUrl && envUrl.includes('localhost')) {
      return envUrl.replace('localhost', devIp);
    }
    if (!envUrl) {
      return `http://${devIp}:4001/api`;
    }
  }
  return envUrl || 'http://localhost:4001/api';
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
