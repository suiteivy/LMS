import { api } from "./api";

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

export const TimetableAPI = {
    // Admin: Create entry
    createEntry: async (data: CreateTimetableDto): Promise<TimetableEntry> => {
        try {
            const response = await api.post("/timetable", data);
            return response.data;
        } catch (error) {
            console.error("Create timetable error", error);
            throw error;
        }
    },

    // Get Class Timetable
    getClassTimetable: async (classId: string): Promise<TimetableEntry[]> => {
        try {
            const response = await api.get(`/timetable/class/${classId}`);
            return response.data;
        } catch (error) {
            console.error("Get class timetable error", error);
            throw error;
        }
    },

    // Get Teacher Timetable
    getTeacherTimetable: async (teacherId?: string): Promise<TimetableEntry[]> => {
        try {
            const url = teacherId ? `/timetable/teacher/${teacherId}` : `/timetable/teacher`;
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error("Get teacher timetable error", error);
            throw error;
        }
    },

    // Update Entry
    updateEntry: async (id: string, data: Partial<CreateTimetableDto>): Promise<TimetableEntry> => {
        try {
            const response = await api.put(`/timetable/${id}`, data);
            return response.data;
        } catch (error) {
            console.error("Update timetable error", error);
            throw error;
        }
    },

    // Delete Entry
    deleteEntry: async (id: string): Promise<void> => {
        try {
            await api.delete(`/timetable/${id}`);
        } catch (error) {
            console.error("Delete timetable error", error);
            throw error;
        }
    }
};
