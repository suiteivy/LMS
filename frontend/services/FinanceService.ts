import { api } from "./api";
import { supabase } from "@/libs/supabase";

export class FinanceService {
    static async getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { Authorization: `Bearer ${session?.access_token}` };
    }

    static async getPayments(studentId?: string) {
        const headers = await this.getAuthHeaders();
        const url = studentId ? `/finance/fees/${studentId}` : '/finance/fees/all'; // Need to ensure /all exists or handle in index.tsx
        const response = await api.get(url, { headers });
        return response.data;
    }

    static async recordPayment(paymentData: any) {
        const headers = await this.getAuthHeaders();
        const response = await api.post('/finance/payments', paymentData, { headers });
        return response.data;
    }

    static async getTeacherPayouts(teacherId: string) {
        const headers = await this.getAuthHeaders();
        const response = await api.get(`/finance/payouts/${teacherId}`, { headers });
        return response.data;
    }

    static async processPayout(payoutId: string) {
        const headers = await this.getAuthHeaders();
        const response = await api.put(`/finance/payouts/${payoutId}/process`, {}, { headers });
        return response.data;
    }

    static async getFeeStructures() {
        const headers = await this.getAuthHeaders();
        const response = await api.get('/finance/fee-structures', { headers });
        return response.data;
    }

    static async updateFeeStructure(feeData: any) {
        const headers = await this.getAuthHeaders();
        const response = await api.post('/finance/fee-structures', feeData, { headers });
        return response.data;
    }
}
