import { api } from "./api";

export class StudentService {
    static async getFinance() {
        // Calls the new student-specific endpoint
        const response = await api.get('/student/me/finance');
        return response.data;
    }

    static async getTimetable() {
        const response = await api.get('/student/me/timetable');
        return response.data;
    }
}
