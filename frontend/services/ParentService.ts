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

    /** Get approved bursaries for a linked student */
    static async getStudentBursaries(studentId: string) {
        const response = await api.get(`/parent/student/${studentId}/bursaries`);
        return response.data;
    }

    /** Get academic reports for a linked student */
    static async getStudentReports(studentId: string) {
        const response = await api.get(`/reports?studentId=${studentId}`);
        return response.data;
    }

    /** Update a linked student's profile (name, gender, dob, address, phone) */
    static async updateStudentProfile(studentId: string, data: {
        first_name?: string;
        last_name?: string;
        gender?: string;
        date_of_birth?: string;
        address?: string;
        phone?: string;
    }) {
        const response = await api.put(`/parent/student/${studentId}/profile`, data);
        return response.data;
    }
}

export const ParentAPI = ParentService;

