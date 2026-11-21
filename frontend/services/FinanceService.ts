import { api } from "./api";
import { Payment, FeeStructure } from "@/types/types";

type HttpLikeError = {
    response?: {
        status?: number;
    };
};

export const isPermissionDeniedError = (error: unknown): boolean => {
    const status = Number((error as HttpLikeError)?.response?.status || 0);
    return status === 403;
};

export class FinanceService {
    static isPermissionDeniedError(error: unknown): boolean {
        return isPermissionDeniedError(error);
    }

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
        const response = await api.post('/finance/fees/pay', paymentData, {
            skipErrorToast: true,
            skipErrorLog: true,
        });
        return response.data;
    }

    static async getInstitutionPayments(): Promise<Payment[]> {
        const response = await api.get('/finance/payments', {
            skipErrorToast: true,
            skipErrorLog: true,
        });
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

    static async getFeeStructures(params?: { page?: number; limit?: number }): Promise<FeeStructure[]> {
        const response = await api.get('/finance/fee-structures', { params });
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    }

    static async getFeeStructuresPaginated(params?: { page?: number; limit?: number }): Promise<any> {
        const response = await api.get('/finance/fee-structures', { params });
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

    /**
     * Finance Administrator Designations (Main Admin only)
     */
    static async getFinanceAdmins(): Promise<{ designations: any[]; eligibleUsers: any[] }> {
        const response = await api.get('/finance/administrators');
        return response.data;
    }

    static async toggleFinanceAdmin(userId: string, isActive: boolean, notes?: string) {
        const response = await api.post('/finance/administrators/toggle', {
            userId,
            isActive,
            notes,
        });
        return response.data;
    }

    static async getFinanceAdminAuditLogs(limit?: number): Promise<{ logs: any[] }> {
        const response = await api.get('/finance/administrators/audit', { params: limit ? { limit } : undefined });
        return response.data;
    }

    /**
     * Individual Financial Records (Selectable-Person View)
     */
    static async getIndividualFinancialRecord(personType: 'student' | 'staff', personId: string) {
        const response = await api.get(`/finance/individual-records/${personType}/${encodeURIComponent(personId)}`);
        return response.data;
    }

    static async adjustIndividualBalance(
        payloadOrStudentId: string | {
            studentId?: string;
            personId?: string;
            amount: number;
            adjustmentType: 'credit' | 'debit';
            reason: string;
            term?: string;
            academicYear?: string;
        },
        amount?: number,
        adjustmentType?: 'credit' | 'debit',
        reason?: string,
        term?: string,
        academicYear?: string
    ) {
        let payload: any;
        if (typeof payloadOrStudentId === 'object') {
            payload = {
                ...payloadOrStudentId,
                personId: payloadOrStudentId.personId || payloadOrStudentId.studentId,
            };
        } else {
            payload = {
                personId: payloadOrStudentId,
                studentId: payloadOrStudentId,
                amount,
                adjustmentType,
                reason,
                term,
                academicYear,
            };
        }
        const response = await api.post('/finance/individual-records/adjust', payload);
        return response.data;
    }

    /**
     * Discrete Fee Components
     */
    static async getFeeComponents(feeStructureId: string) {
        const response = await api.get(`/finance/components/${feeStructureId}`);
        return response.data;
    }

    static async createFeeComponent(payload: any) {
        const response = await api.post('/finance/components', payload);
        return response.data;
    }

    static async updateFeeComponent(id: string, payload: any) {
        const response = await api.put(`/finance/components/${id}`, payload);
        return response.data;
    }

    static async deleteFeeComponent(id: string) {
        const response = await api.delete(`/finance/components/${id}`);
        return response.data;
    }

    /**
     * Fee Discounts, Scholarships, and Waivers
     */
    static async getStudentDiscounts(studentId: string) {
        const response = await api.get(`/finance/discounts/${encodeURIComponent(studentId)}`);
        return response.data;
    }

    static async createDiscountOrWaiver(payload: any) {
        const response = await api.post('/finance/discounts', payload);
        return response.data;
    }

    static async revokeDiscountOrWaiver(id: string) {
        const response = await api.post(`/finance/discounts/${id}/revoke`);
        return response.data;
    }

    /**
     * Billing Statements & Invoices
     */
    static async generateStudentInvoice(studentIdOrPayload: string | any, options?: any) {
        const payload = typeof studentIdOrPayload === 'string'
            ? { student_id: studentIdOrPayload, ...options }
            : studentIdOrPayload;
        const response = await api.post('/finance/invoices/generate', payload);
        return response.data;
    }

    static async getStudentInvoices(studentId: string) {
        const response = await api.get(`/finance/invoices/${encodeURIComponent(studentId)}`);
        return response.data;
    }

    /**
     * Overdue Reminders Sweep
     */
    static async sendOverdueReminders() {
        const response = await api.post('/finance/reminders/overdue');
        return response.data;
    }

    /**
     * ==========================================
     * RECONSTRUCTED FINANCE API METHODS
     * ==========================================
     */

    // Fee Categories
    static async getFeeCategories(): Promise<any[]> {
        const response = await api.get('/finance/categories');
        return response.data || [];
    }

    static async createFeeCategory(payload: { name: string; description?: string; display_order?: number }): Promise<any> {
        const response = await api.post('/finance/categories', payload);
        return response.data;
    }

    // Fee Types
    static async getFeeTypes(params?: { category_id?: string; status?: string; term_id?: string }): Promise<any[]> {
        const response = await api.get('/finance/fee-types', { params });
        return response.data || [];
    }

    static async createFeeType(payload: any): Promise<any> {
        const response = await api.post('/finance/fee-types', payload);
        return response.data;
    }

    static async updateFeeType(id: string, payload: any): Promise<any> {
        const response = await api.put(`/finance/fee-types/${id}`, payload);
        return response.data;
    }

    // Payments Inbox & Verification
    static async getPaymentsInbox(params?: { tab?: string; search?: string; method?: string; page?: number; limit?: number }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
        const response = await api.get('/finance/inbox', { params });
        return response.data || { data: [], total: 0, page: 1, limit: 20 };
    }

    static async confirmPayment(id: string, payload?: { confirmed_amount?: number; admin_notes?: string }): Promise<any> {
        const response = await api.post(`/finance/payments/${id}/confirm`, payload || {});
        return response.data;
    }

    static async flagPayment(id: string, payload: { reason_code?: string; reason_id?: string; admin_notes?: string }): Promise<any> {
        const response = await api.post(`/finance/payments/${id}/flag`, payload);
        return response.data;
    }

    static async bulkConfirmPayments(payment_ids: string[]): Promise<any> {
        const response = await api.post('/finance/payments/bulk-confirm', { payment_ids });
        return response.data;
    }

    static async reversePayment(id: string, reason: string): Promise<any> {
        const response = await api.post(`/finance/payments/${id}/reverse`, { reason });
        return response.data;
    }

    // Settings
    static async getFinanceSettings(): Promise<any> {
        const response = await api.get('/finance/settings');
        return response.data;
    }

    static async updateFinanceSettings(payload: any): Promise<any> {
        const response = await api.put('/finance/settings', payload);
        return response.data;
    }

    static async createPaymentMethod(payload: any): Promise<any> {
        const response = await api.post('/finance/payment-methods', payload);
        return response.data;
    }

    static async updatePaymentMethod(id: string, payload: any): Promise<any> {
        const response = await api.put(`/finance/payment-methods/${id}`, payload);
        return response.data;
    }

    static async createFlagReason(payload: any): Promise<any> {
        const response = await api.post('/finance/flag-reasons', payload);
        return response.data;
    }

    static async updateFlagReason(id: string, payload: any): Promise<any> {
        const response = await api.put(`/finance/flag-reasons/${id}`, payload);
        return response.data;
    }

    // Parent Experience
    static async getParentOverview(): Promise<any> {
        const response = await api.get('/finance/parent/overview');
        return response.data;
    }

    static async getChildPayableItems(studentId: string): Promise<any[]> {
        const response = await api.get(`/finance/parent/child/${encodeURIComponent(studentId)}/payable-items`);
        return response.data || [];
    }

    static async recordParentPayment(payload: {
        student_id?: string;
        total_amount: number;
        payment_method: string;
        reference_number: string;
        payer_name?: string;
        payer_phone?: string;
        paid_date?: string;
        proof_urls?: string[];
        allocations?: Array<{ student_id: string; fee_type_id?: string; amount: number; notes?: string }>;
        idempotency_key?: string;
    }): Promise<any> {
        const response = await api.post('/finance/parent/payments/record', payload);
        return response.data;
    }

    static async getParentPaymentHistory(studentId?: string): Promise<any[]> {
        const response = await api.get('/finance/parent/history', { params: studentId ? { studentId } : undefined });
        return response.data || [];
    }

    static async getOfficialReceiptBase64(receiptId: string): Promise<{ base64: string; filename: string }> {
        const response = await api.post(`/finance/receipts/${encodeURIComponent(receiptId)}/compile-base64`, {});
        return response.data;
    }

    /**
     * ==========================================
     * RECONCILED LEVEL-SPECIFIC FEE STRUCTURES & BUILDER
     * ==========================================
     */

    static async getFeeStructuresV2(params?: { academic_year_id?: string; term_id?: string; status?: string }): Promise<any[]> {
        const response = await api.get('/finance/structures-v2', { params });
        return response.data || [];
    }

    static async getFeeStructureDetails(id: string): Promise<any> {
        const response = await api.get(`/finance/structures-v2/${encodeURIComponent(id)}/details`);
        return response.data;
    }

    static async createFeeStructureV2(payload: any): Promise<any> {
        const response = await api.post('/finance/structures-v2', payload);
        return response.data;
    }

    static async updateFeeStructureV2(id: string, payload: any): Promise<any> {
        const response = await api.put(`/finance/structures-v2/${encodeURIComponent(id)}`, payload);
        return response.data;
    }

    static async copyFeeStructure(id: string, payload: any): Promise<any> {
        const response = await api.post(`/finance/structures-v2/${encodeURIComponent(id)}/copy`, payload);
        return response.data;
    }

    static async bulkPercentageIncrease(payload: { structure_ids: string[]; percentage: number; preview_only?: boolean }): Promise<any> {
        const response = await api.post('/finance/structures-v2/bulk-increase', payload);
        return response.data;
    }

    static async publishFeeStructure(id: string): Promise<any> {
        const response = await api.post(`/finance/structures-v2/${encodeURIComponent(id)}/publish`);
        return response.data;
    }

    static async getParentViewPreview(id: string): Promise<any> {
        const response = await api.get(`/finance/structures-v2/${encodeURIComponent(id)}/parent-preview`);
        return response.data;
    }

    static async compileFeeStructureBase64(id: string): Promise<{ base64: string; filename: string }> {
        const response = await api.post(`/finance/structures-v2/${encodeURIComponent(id)}/compile-base64`);
        return response.data;
    }

    /**
     * ==========================================
     * REUSABLE OPTION CATALOGS & PRICING MATRICES
     * ==========================================
     */

    static async getOptionCatalogs(catalog_type?: string): Promise<any[]> {
        const response = await api.get('/finance/catalogs', { params: catalog_type ? { catalog_type } : undefined });
        return response.data || [];
    }

    static async createOptionCatalog(payload: { catalog_type: string; name: string; code?: string; details?: any; display_order?: number }): Promise<any> {
        const response = await api.post('/finance/catalogs', payload);
        return response.data;
    }

    static async updateOptionCatalog(id: string, payload: any): Promise<any> {
        const response = await api.put(`/finance/catalogs/${encodeURIComponent(id)}`, payload);
        return response.data;
    }

    static async deleteOptionCatalog(id: string): Promise<any> {
        const response = await api.delete(`/finance/catalogs/${encodeURIComponent(id)}`);
        return response.data;
    }

    static async bulkImportCatalogs(items: any[]): Promise<any> {
        const response = await api.post('/finance/catalogs/bulk-import', { items });
        return response.data;
    }

    /**
     * ==========================================
     * OPTIONAL ITEMS REVIEW QUEUE (Admin)
     * ==========================================
     */

    static async getOptionalItemsQueue(params?: { status?: string; fee_type_id?: string; grade_level?: string | number; class_id?: string }): Promise<any[]> {
        const response = await api.get('/finance/optional-queue', { params });
        return response.data || [];
    }

    static async confirmOptOut(selectionId: string, payload?: { admin_notes?: string; opt_out_reason?: string }): Promise<any> {
        const response = await api.post(`/finance/optional-queue/${encodeURIComponent(selectionId)}/confirm-opt-out`, payload || {});
        return response.data;
    }

    static async markTakingItem(payload: { student_id: string; fee_type_id: string; variant_id?: string; quantity?: number; admin_notes?: string }): Promise<any> {
        const response = await api.post('/finance/optional-queue/mark-taking', payload);
        return response.data;
    }

    static async bulkConfirmOptionalItems(payload: { action: 'confirm_opt_out' | 'mark_taking'; selection_ids: string[]; admin_notes?: string }): Promise<any> {
        const response = await api.post('/finance/optional-queue/bulk-confirm', payload);
        return response.data;
    }

    static async sendOptionalItemReminder(selectionId: string): Promise<any> {
        const response = await api.post(`/finance/optional-queue/${encodeURIComponent(selectionId)}/remind`);
        return response.data;
    }

    static async getOperationalRosters(params: { catalog_type?: string; catalog_id?: string }): Promise<any[]> {
        const response = await api.get('/finance/optional-queue/rosters', { params });
        return response.data || [];
    }

    /**
     * ==========================================
     * PARENT OPTIONAL SELECTIONS & STATEMENTS
     * ==========================================
     */

    static async getParentChildFeeStructure(studentId: string): Promise<any> {
        const response = await api.get(`/finance/parent/child/${encodeURIComponent(studentId)}/fee-structure`);
        return response.data;
    }

    static async saveChildOptionalSelections(studentId: string, selections: Array<{
        fee_type_id: string;
        variant_id?: string | null;
        catalog_id?: string | null;
        quantity?: number;
        is_opt_out?: boolean;
        opt_out_reason?: string;
    }>): Promise<any> {
        const response = await api.post(`/finance/parent/child/${encodeURIComponent(studentId)}/optional-selections`, { selections });
        return response.data;
    }

    static async getStudentStatementBase64(studentId: string): Promise<{ base64: string; filename: string }> {
        const response = await api.post(`/finance/parent/statement/${encodeURIComponent(studentId)}/compile-base64`);
        return response.data;
    }
}
