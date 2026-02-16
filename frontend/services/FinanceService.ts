import { api } from "./api";
import { supabase } from "@/libs/supabase";

export class FinanceService {
    static async getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { Authorization: `Bearer ${session?.access_token}` };
    }

    static async getPayments(studentId?: string) {
        const headers = await this.getAuthHeaders();
        // Use unified transactions endpoint
        const params: any = { type: 'fee_payment' };
        if (studentId && studentId !== 'all') {
            // If studentId is 'all', backend filters by role anyway.
            // If passing specific studentId, need strict filter?
            // Backend takes 'distinct_user_id' for admin filtering.
            // But 'studentId' here is likely 'all' or specific.
            // If specific, assume it's User ID (UUID) or resolve it?
            // Existing usage passes 'all'.
        }

        let url = '/finance/transactions?type=fee_payment';
        if (studentId && studentId !== 'all') {
            // If we really need filtering by specific student (rare in current usage)
            // we'd append &distinct_user_id=...
            // But let's assume 'all' for now as per usage.
        }

        const response = await api.get(url, { headers });

        // Map FinancialTransaction -> Payment
        return response.data.map((tx: any) => ({
            id: tx.id,
            student_id: tx.users?.students?.[0]?.id || tx.user_id, // Map Custom ID if available
            student_name: tx.users?.full_name || 'Unknown',
            student_display_id: tx.users?.students?.[0]?.id,
            amount: tx.amount,
            payment_date: tx.date || tx.created_at,
            payment_method: tx.method,
            status: tx.status,
            reference_number: tx.meta?.reference_number,
            notes: tx.meta?.notes
        }));
    }

    static async recordPayment(paymentData: any) {
        const headers = await this.getAuthHeaders();
        // Calls new recordFeePayment endpoint
        const response = await api.post('/finance/fees/pay', paymentData, { headers });
        return response.data;
    }

    static async getTeacherPayouts(teacherId: string) {
        const headers = await this.getAuthHeaders();
        const response = await api.get('/finance/transactions?type=salary_payout', { headers });

        // Map FinancialTransaction -> TeacherPayout
        return response.data.map((tx: any) => ({
            id: tx.id,
            teacher_id: tx.users?.teachers?.[0]?.id || tx.user_id,
            teacher_name: tx.users?.full_name || 'Unknown',
            teacher_display_id: tx.users?.teachers?.[0]?.id,
            amount: tx.amount,
            period_start: tx.date, // Approximate
            period_end: tx.date,
            status: tx.status,
            payment_date: tx.date || tx.created_at,
            // Meta fields if needed
        }));
    }

    static async processPayout(payoutId: string) {
        const headers = await this.getAuthHeaders();
        const response = await api.put(`/finance/transactions/${payoutId}/process`, {}, { headers });
        return response.data;
    }

    static async getFeeStructures() {
        // Now fetched from subjects
        const headers = await this.getAuthHeaders();
        // We added getFeeStructures to finance controller (planned)
        // Or if we didn't yet, we need to.
        const response = await api.get('/finance/fee-structures', { headers });
        return response.data;
    }

    static async updateFeeStructure(feeData: any) {
        const headers = await this.getAuthHeaders();
        const response = await api.post('/finance/fee-structures', feeData, { headers });
        return response.data;
    }
}
