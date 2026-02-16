import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL + '/api/timetable';

// Types
export interface TimetableEntry {
    id: string;
    class_id: string;
    subject_id: string;
    day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    start_time: string;
    end_time: string;
    room_number?: string;
    institution_id: string;
    subjects?: {
        title: string;
        teacher_id: string;
        teachers?: {
            users: {
                full_name: string;
            }
        }
    };
    classes?: {
        name: string;
    };
}

export interface CreateTimetableDto {
    class_id: string;
    subject_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    room_number?: string;
}

const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export const TimetableAPI = {
    // Admin: Create entry
    createEntry: async (data: CreateTimetableDto) => {
        const headers = await getAuthHeader();
        try {
            const response = await axios.post(`${API_URL}`, data, { headers });
            return response.data;
        } catch (error: any) {
            console.error("Create timetable error", error.response?.data || error.message);
            throw error.response?.data || { error: 'Failed to create timetable entry' };
        }
    },

    // Get Class Timetable
    getClassTimetable: async (classId: string) => {
        const headers = await getAuthHeader();
        try {
            const response = await axios.get(`${API_URL}/class/${classId}`, { headers });
            return response.data;
        } catch (error: any) {
            console.error("Get class timetable error", error.response?.data || error.message);
            throw error.response?.data || { error: 'Failed to fetch timetable' };
        }
    },

    // Get Teacher Timetable
    getTeacherTimetable: async (teacherId?: string) => {
        const headers = await getAuthHeader();
        try {
            const url = teacherId ? `${API_URL}/teacher/${teacherId}` : `${API_URL}/teacher`;
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (error: any) {
            console.error("Get teacher timetable error", error.response?.data || error.message);
            throw error.response?.data || { error: 'Failed to fetch timetable' };
        }
    },

    // Update Entry
    updateEntry: async (id: string, data: Partial<CreateTimetableDto>) => {
        const headers = await getAuthHeader();
        try {
            const response = await axios.put(`${API_URL}/${id}`, data, { headers });
            return response.data;
        } catch (error: any) {
            console.error("Update timetable error", error.response?.data || error.message);
            throw error.response?.data || { error: 'Failed to update entry' };
        }
    },

    // Delete Entry
    deleteEntry: async (id: string) => {
        const headers = await getAuthHeader();
        try {
            const response = await axios.delete(`${API_URL}/${id}`, { headers });
            return response.data;
        } catch (error: any) {
            console.error("Delete timetable error", error.response?.data || error.message);
            throw error.response?.data || { error: 'Failed to delete entry' };
        }
    }
};
