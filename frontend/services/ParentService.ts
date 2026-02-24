import { api } from "./api";

export class ParentService {
    static async getLinkedStudents() {
        const response = await api.get('/parent/students');
        return response.data;
    }

    static async getStudentPerformance(studentId: string) {
        const response = await api.get(`/parent/student/${studentId}/performance`);
        return response.data;
    }

    static async getStudentAttendance(studentId: string) {
        const response = await api.get(`/parent/student/${studentId}/attendance`);
        return response.data;
    }

    static async getStudentFinance(studentId: string) {
        const response = await api.get(`/parent/student/${studentId}/finance`);
        return response.data;
    }
}
