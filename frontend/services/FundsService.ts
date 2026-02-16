import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL + '/api/funds';

export interface Fund {
    id: string;
    name: string;
    description?: string;
    total_amount: number;
    allocated_amount: number;
    institution_id: string;
}

export interface Allocation {
    id: string;
    fund_id: string;
    title: string;
    description?: string;
    amount: number;
    category?: string;
    status: 'planned' | 'approved' | 'spent';
    allocation_date?: string;
}

export const FundsAPI = {
    // Get all funds
    getFunds: async () => {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_URL}/funds`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Create Fund
    createFund: async (data: Partial<Fund>) => {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.post(`${API_URL}/funds`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Get Allocations
    getAllocations: async (fundId: string) => {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_URL}/allocations/${fundId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Create Allocation
    createAllocation: async (data: Partial<Allocation>) => {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.post(`${API_URL}/allocations`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};
