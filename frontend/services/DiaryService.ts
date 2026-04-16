import { api } from './api';

export interface DiaryEntry {
    id: string;
    institution_id: string;
    class_id: string;
    teacher_id: string | null;
    title: string;
    content: string;
    entry_date: string;
    created_at: string;
    updated_at: string;
    is_signed?: boolean;
    status?: 'pending' | 'approved' | 'rejected';
    teacher?: {
        id: string;
        users: {
            first_name: string;
            last_name: string;
            full_name?: string;
        };
    };
}

export const DiaryService = {
    async getEntries(classId?: string, studentId?: string): Promise<DiaryEntry[]> {
        const params: any = {};
        if (classId) params.class_id = classId;
        if (studentId) params.student_id = studentId;
        const res = await api.get('/diary', { params });
        return res.data;
    },

    async createEntry(data: {
        class_id: string;
        title: string;
        content: string;
        entry_date?: string;
    }): Promise<DiaryEntry> {
        const res = await api.post('/diary', data);
        return res.data;
    },

    async updateEntry(id: string, data: Partial<DiaryEntry>): Promise<DiaryEntry> {
        const res = await api.put(`/diary/${id}`, data);
        return res.data;
    },

    async deleteEntry(id: string): Promise<void> {
        await api.delete(`/diary/${id}`);
    },

    /** Parent signs a diary entry to acknowledge it */
    async signEntry(id: string): Promise<DiaryEntry> {
        const res = await api.patch(`/diary/${id}/sign`);
        return res.data;
    },

    /** Admin approves a diary entry */
    async approveEntry(id: string): Promise<DiaryEntry> {
        const res = await api.patch(`/diary/${id}/approve`);
        return res.data;
    },
};

export const DiaryAPI = DiaryService;
