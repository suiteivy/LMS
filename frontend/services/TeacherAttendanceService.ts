import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const API_URL = process.env.EXPO_PUBLIC_API_URL + '/api/attendance/teachers';

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
    // Get attendance for a date
    getAttendance: async (date: string) => {
        // Using generic api wrapper if possible but let's stick to axios for consistency with my other services if they used it, 
        // actually looking at previous file `FundsService` I used axios directly.
        // But `api.ts` exists. Let's use `api` wrapper if it handles token.
        // `api.ts` usually handles token.
        const response = await api.get(`/attendance/teachers?date=${date}`);
        return response.data;
    },

    // Mark attendance
    markAttendance: async (data: { teacher_id: string; date: string; status: string; notes?: string }) => {
        const response = await api.post('/attendance/teachers', data);
        return response.data;
    },

    // Bulk mark (optional, but good for admin)
    bulkMark: async (data: { date: string; records: { teacher_id: string; status: string }[] }) => {
        const response = await api.post('/attendance/teachers/bulk', data);
        return response.data;
    }
};
