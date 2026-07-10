import { api } from './api';

export interface ClassItem {
    id: string;
    name?: string;
    category_id?: string | null;
    level_id?: string | null;
    stream_id?: string | null;
    grade_level?: number;
    form_level?: number;
    stream?: string;
    display_name?: string;
    class_type?: string;
    capacity?: number;
    teacher_id?: string;
    institution_id?: string;
    student_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ClassStudent {
    enrollment_id: string;
    student_id: string;
    enrolled_at: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    email: string;
    grade_level?: number | string;
    form_level?: number;
}

export interface AutoAssignResult {
    assigned: number;
    total_unassigned_before?: number;
    message: string;
    classes?: { class_name: string; total_students: number }[];
}

export interface ClassOptionItem {
    value: number;
    label: string;
    category_id?: string;
    level_id?: string;
    class_type?: string;
}

export interface ClassDomainCategory {
    id: string;
    name: string;
    description?: string | null;
    sort_order?: number;
}

export interface ClassDomainLevel {
    id: string;
    category_id: string;
    level_number: number;
    name?: string | null;
    sort_order?: number;
    class_type?: string;
}

export interface ClassDomainStream {
    id: string;
    level_id: string | null;
    code: string;
    label: string;
    name?: string | null;
    sort_order?: number;
}

export interface ClassOptions {
    institution_id: string;
    institution_name?: string | null;
    school_category_name?: string | null;
    class_type: string;
    class_types?: string[];
    level_options: ClassOptionItem[];
    stream_options: ClassDomainStream[];
    categories: ClassDomainCategory[];
    levels: ClassDomainLevel[];
    streams: ClassDomainStream[];
}

export const ClassService = {
    async getClasses(): Promise<ClassItem[]> {
        const res = await api.get('/classes');
        return res.data;
    },

    async getClassOptions(): Promise<ClassOptions> {
        const res = await api.get('/classes/options');
        return res.data;
    },

    async createClass(data: {
        class_type?: string;
        stream?: string;
        category_id?: string;
        level_id?: string;
        stream_id?: string;
        grade_level?: number | null;
        form_level?: number | null;
        capacity?: number;
        teacher_id?: string;
    }): Promise<ClassItem> {
        const res = await api.post('/classes', data);
        return res.data;
    },

    async updateClass(id: string, data: Partial<ClassItem> & { class_type?: string }): Promise<ClassItem> {
        const res = await api.put(`/classes/${id}`, data);
        return res.data;
    },

    async createDomainCategory(data: { name: string; description?: string; sort_order?: number }): Promise<ClassDomainCategory> {
        const res = await api.post('/classes/domain/categories', data);
        return res.data;
    },

    async createDomainLevel(data: { category_id: string; level_number: number; name?: string; sort_order?: number }): Promise<ClassDomainLevel> {
        const res = await api.post('/classes/domain/levels', data);
        return res.data;
    },

    async createDomainStream(data: { level_id: string; code: string; name?: string; sort_order?: number }): Promise<ClassDomainStream> {
        const res = await api.post('/classes/domain/streams', data);
        return res.data;
    },

    async archiveDomainCategory(id: string): Promise<void> {
        await api.delete(`/classes/domain/categories/${id}`);
    },

    async archiveDomainLevel(id: string): Promise<void> {
        await api.delete(`/classes/domain/levels/${id}`);
    },

    async archiveDomainStream(id: string): Promise<void> {
        await api.delete(`/classes/domain/streams/${id}`);
    },

    async deleteClass(id: string): Promise<void> {
        await api.delete(`/classes/${id}`);
    },

    async getClassStudents(classId: string): Promise<ClassStudent[]> {
        const res = await api.get(`/classes/${classId}/students`);
        return res.data;
    },

    async enrollStudent(classId: string, studentId: string): Promise<void> {
        await api.post(`/classes/${classId}/enroll`, { student_id: studentId });
    },

    async removeStudent(classId: string, studentId: string): Promise<void> {
        await api.delete(`/classes/${classId}/students/${studentId}`);
    },

    async autoAssign(payload: { grade_level?: number; form_level?: number }): Promise<AutoAssignResult> {
        const res = await api.post('/classes/auto-assign', payload);
        return res.data;
    },

    // Legacy: get subjects for a class
    async getClassSubjects(classId: string): Promise<any[]> {
        const res = await api.get(`/subjects/class/${classId}`);
        return res.data;
    },
};

// Keep backward-compatible export
export const ClassAPI = ClassService;
