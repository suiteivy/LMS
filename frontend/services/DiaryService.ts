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
    assignment_id?: string | null;
    assignment?: {
        id: string;
        title: string;
        description: string;
        due_date: string;
        total_points?: number;
        attachment_url?: string | null;
        attachment_name?: string | null;
        grades_released?: boolean;
        subject_name: string;
        due_date_formatted: string;
        status: 'Pending' | 'Submitted' | 'Graded' | 'Overdue';
        grade?: number | null;
        feedback?: string | null;
        subject?: {
            id: string;
            title: string;
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
