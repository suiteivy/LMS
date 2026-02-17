import { api } from "./api";

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
        const response = await api.get('/funds/funds');
        return response.data;
    },

    // Create Fund
    createFund: async (data: Partial<Fund>) => {
        const response = await api.post('/funds/funds', data);
        return response.data;
    },

    // Get Allocations
    getAllocations: async (fundId: string) => {
        const response = await api.get(`/funds/allocations/${fundId}`);
        return response.data;
    },

    // Create Allocation
    createAllocation: async (data: Partial<Allocation>) => {
        const response = await api.post('/funds/allocations', data);
        return response.data;
    }
};
