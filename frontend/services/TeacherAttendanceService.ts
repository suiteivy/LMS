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
            full_name: string;
            avatar_url?: string;
        }
    }
}

export const TeacherAttendanceAPI = {
    // Teacher Attendance
    getAttendance: async (date: string) => {
        const response = await api.get(`/attendance/teachers?date=${date}`);
        return response.data;
    },

    markAttendance: async (data: { teacher_id: string; date: string; status: string; notes?: string }) => {
        const response = await api.post('/attendance/teachers', data);
        return response.data;
    },

    // Student Attendance
    getStudentAttendance: async (date: string, subjectId: string) => {
        const response = await api.get(`/attendance/students`, { params: { date, subject_id: subjectId } });
        return response.data;
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
