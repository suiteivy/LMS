import { api } from "./api";
import { supabase } from "@/libs/supabase";

export class BursaryService {
    static async getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { Authorization: `Bearer ${session?.access_token}` };
    }

    static async getBursaries() {
        const headers = await this.getAuthHeaders();
        const response = await api.get('/bursary', { headers });
        return response.data;
    }

    static async createBursary(bursaryData: any) {
        const headers = await this.getAuthHeaders();
        const response = await api.post('/bursary', bursaryData, { headers });
        return response.data;
    }

    static async getBursaryDetails(id: string) {
        const headers = await this.getAuthHeaders();
        const response = await api.get(`/bursary/${id}`, { headers });
        return response.data;
    }

    static async applyForBursary(bursaryId: string) {
        const headers = await this.getAuthHeaders();
        const response = await api.post('/bursary/apply', { bursary_id: bursaryId }, { headers });
        return response.data;
    }

    static async updateApplicationStatus(applicationId: string, status: 'approved' | 'rejected') {
        const headers = await this.getAuthHeaders();
        const response = await api.put(`/bursary/applications/${applicationId}`, { status }, { headers });
        return response.data;
    }
}
