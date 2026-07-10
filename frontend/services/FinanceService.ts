import { api } from "./api";
import { Payment, FeeStructure } from "@/types/types";

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
        return response.data.map((tx: any) => {
            const userObj = tx.users;
            const studentProfile = Array.isArray(userObj?.students)
                ? userObj.students[0]
                : userObj?.students;
            const student_name = userObj?.first_name 
                ? `${userObj.first_name} ${userObj.last_name || ''}`.trim() 
                : (userObj?.full_name || 'Unknown');
            const student_id = studentProfile?.id || tx.user_id;
            const student_display_id =
                tx.student_display_id ||
                studentProfile?.id ||
                tx.user_id;
            
            return {
                id: tx.id,
                student_id,
                student_name,
                student_display_id,
                amount: tx.amount,
                payment_date: tx.date || tx.created_at,
                payment_method: tx.method || tx.payment_method,
                status: tx.status,
                reference_number: tx.meta?.reference_number,
                notes: tx.meta?.notes,
                origin_type: tx.origin_type || null,
                origin_id: tx.origin_id || null,
                origin_label: tx.origin_label || null,
                target_type: tx.target_type || null,
                target_id: tx.target_id || null,
                target_label: tx.target_label || null,
                recorded_by_user_id: tx.recorded_by_user_id || null,
                recorded_by_label: tx.recorded_by_label || tx.meta?.recorded_by_name || null,
            };
        });
    }

    static async recordPayment(paymentData: any) {
        // Calls new recordFeePayment endpoint
        const response = await api.post('/finance/fees/pay', paymentData);
        return response.data;
    }

    static async getInstitutionPayments(): Promise<Payment[]> {
        const response = await api.get('/finance/payments');
        return (response.data || []).map((p: any) => ({
            id: p.id,
            student_id: p.student_id,
            student_name: p.student_name,
            student_display_id: p.student_display_id,
            amount: Number(p.amount || 0),
            payment_date: p.payment_date || p.created_at,
            payment_method: p.payment_method,
            status: p.status,
            reference_number: p.reference_number,
            notes: p.admin_notes,
            reviewed_at: p.reviewed_at || null,
            confirmed_at: p.confirmed_at || null,
            status_updated_at: p.status_updated_at || null,
            retention_until: p.retention_until || null,
            fee_structure_snapshot: p.fee_structure_snapshot || null,
            origin_type: p.origin_type || null,
            origin_id: p.origin_id || null,
            origin_label: p.origin_label || null,
            target_type: p.target_type || null,
            target_id: p.target_id || null,
            target_label: p.target_label || null,
            recorded_by_user_id: p.recorded_by_user_id || null,
            recorded_by_label: p.recorded_by_label || null,
        }));
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

    static async releaseFeeStructure(id: string, options?: { strictCurrentPair?: boolean }) {
        const strictCurrentPair = options?.strictCurrentPair ?? true;
        const response = await api.put(
            `/finance/fee-structures/${id}/release?strict_current_pair=${strictCurrentPair ? 'true' : 'false'}`,
            {}
        );
        return response.data;
    }

    static async revertReleaseFeeStructure(id: string) {
        const response = await api.put(`/finance/fee-structures/${id}/revert-release`, {});
        return response.data;
    }

    static async deleteFeeStructure(id: string) {
        const response = await api.delete(`/finance/fee-structures/${id}`);
        return response.data;
    }

    static async submitEvidence(evidenceData: any) {
        const response = await api.post('/finance/fees/evidence', evidenceData);
        return response.data;
    }

    static async getPendingPayments(): Promise<any[]> {
        const response = await api.get('/finance/fees/pending');
        return (response.data || []).map((p: any) => ({
            ...p,
            confirmed_at: p.confirmed_at || null,
            retention_until: p.retention_until || null,
            status_updated_at: p.status_updated_at || null,
        }));
    }

    static async confirmPaymentEvidence(paymentId: string, action: 'approve' | 'reject', notes: string) {
        const response = await api.post('/finance/fees/confirm', {
            payment_id: paymentId,
            action,
            admin_notes: notes
        });
        return response.data;
    }

    static async getPaymentReceiptHtml(paymentId: string): Promise<string> {
        const response = await api.get(`/finance/fees/${encodeURIComponent(paymentId)}/receipt`, {
            responseType: 'text',
            headers: {
                Accept: 'text/html',
            },
        });
        return typeof response.data === 'string' ? response.data : String(response.data || '');
    }

    static async getTransactionReceiptHtml(transactionId: string): Promise<string> {
        const response = await api.get(`/finance/transactions/${encodeURIComponent(transactionId)}/receipt`, {
            responseType: 'text',
            headers: {
                Accept: 'text/html',
            },
        });
        return typeof response.data === 'string' ? response.data : String(response.data || '');
    }

    static async getAnyReceiptHtml(id: string): Promise<string> {
        try {
            return await this.getTransactionReceiptHtml(id);
        } catch (error: any) {
            const status = error?.response?.status;
            if (status && status !== 404) {
                throw error;
            }
        }

        return this.getPaymentReceiptHtml(id);
    }
}
