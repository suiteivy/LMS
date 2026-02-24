import { api } from './api';

export interface ClassItem {
    id: string;
    name: string;
    grade_level?: string;
    capacity?: number;
    teacher_id?: string;
    institution_id?: string;
    student_count?: number;
    created_at?: string;
}

export interface ClassStudent {
    enrollment_id: string;
    student_id: string;
    enrolled_at: string;
    full_name: string;
    email: string;
    grade_level: string;
}

export interface AutoAssignResult {
    assigned: number;
    total_unassigned_before?: number;
    message: string;
    classes?: { class_name: string; total_students: number }[];
}

export const ClassService = {
    async getClasses(): Promise<ClassItem[]> {
        const res = await api.get('/classes');
        return res.data;
    },

    async createClass(data: {
        name: string;
        grade_level?: string;
        capacity?: number;
        teacher_id?: string;
    }): Promise<ClassItem> {
        const res = await api.post('/classes', data);
        return res.data;
    },

    async updateClass(id: string, data: Partial<ClassItem>): Promise<ClassItem> {
        const res = await api.put(`/classes/${id}`, data);
        return res.data;
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

    async autoAssign(gradeLevel: string): Promise<AutoAssignResult> {
        const res = await api.post('/classes/auto-assign', { grade_level: gradeLevel });
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
