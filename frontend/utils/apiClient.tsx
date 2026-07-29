import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
