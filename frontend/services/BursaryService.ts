import { api } from "./api";
import { supabase } from "@/libs/supabase";

export class BursaryService {
    static async getBursaries() {
        const response = await api.get('/bursary');
        return response.data;
    }

    static async createBursary(bursaryData: any) {
        const response = await api.post('/bursary', bursaryData);
        return response.data;
    }

    static async getBursaryDetails(id: string) {
        const response = await api.get(`/bursary/${id}`);
        return response.data;
    }

    static async applyForBursary(bursaryId: string) {
        const response = await api.post('/bursary/apply', { bursary_id: bursaryId });
        return response.data;
    }

    static async updateApplicationStatus(applicationId: string, status: 'approved' | 'rejected') {
        const response = await api.put(`/bursary/applications/${applicationId}`, { status });
        return response.data;
    }
}
