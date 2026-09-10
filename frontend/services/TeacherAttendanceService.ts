import { api } from './api';

export interface TeacherAttendance {
    id: string;
    teacher_id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    check_in_time?: string;
    notes?: string;
    teachers?: {
        id: string;
        users: {
            first_name: string;
            last_name: string;
            full_name?: string;
            avatar_url?: string;
        }
    }
}

export const AdminTeacherAttendanceAPI = {
    // Teacher Attendance (admin-only backend routes)
    getAttendance: async (date: string, pagination?: { page?: number; limit?: number }) => {
        const response = await api.get(`/attendance/teachers`, { params: { date, ...(pagination || {}) } });
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    },

    markAttendance: async (data: { teacher_id: string; date: string; status: string; notes?: string }) => {
        const response = await api.post('/attendance/teachers', data);
        return response.data;
    }
};

export const TeacherAttendanceAPI = {
    // Student Attendance
    getStudentAttendance: async (date: string, subjectId: string, pagination?: { page?: number; limit?: number }) => {
        const response = await api.get(`/attendance/students`, { params: { date, subject_id: subjectId, ...(pagination || {}) } });
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    },

    markStudentAttendance: async (data: {
        student_id: string;
        subject_id: string;
        class_id?: string;
        status: string;
        date?: string;
        notes?: string
    }) => {
        const response = await api.post('/attendance/students', data);
        return response.data;
    }
};
