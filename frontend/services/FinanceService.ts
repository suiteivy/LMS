import { api } from "./api";
import { Payment, TeacherPayout, FeeStructure } from "@/types/types";

export class FinanceService {
    static async getPayments(studentId?: string): Promise<Payment[]> {
        // Use unified transactions endpoint
        let url = '/finance/transactions?type=fee_payment';

        // Correctly pass distinct_user_id if a specific student is requested (and not 'all')
        if (studentId && studentId !== 'all') {
            url += `&distinct_user_id=${studentId}`;
        }

        const response = await api.get(url);

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
        // Calls new recordFeePayment endpoint
        const response = await api.post('/finance/fees/pay', paymentData);
        return response.data;
    }

    static async getTeacherPayouts(teacherId: string): Promise<TeacherPayout[]> {
        let url = '/finance/transactions?type=salary_payout';
        // Logic for filtering by teacherId could be added here similar to getPayments if needed

        const response = await api.get(url);

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
        const response = await api.put(`/finance/transactions/${payoutId}/process`, {});
        return response.data;
    }

    static async getFeeStructures(): Promise<FeeStructure[]> {
        const response = await api.get('/finance/fee-structures');
        return response.data;
    }

    static async createFeeStructure(feeData: any) {
        const response = await api.post('/finance/fee-structures', feeData);
        return response.data;
    }

    static async updateFeeStructure(id: string, feeData: any) {
        const response = await api.put(`/finance/fee-structures/${id}`, feeData);
        return response.data;
    }
}
