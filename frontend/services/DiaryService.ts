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
    teacher?: {
        id: string;
        users: {
            full_name: string;
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
    }
};

export const DiaryAPI = DiaryService;
