import { api } from "./api";

export class ExamService {
    static async createExam(examData: any) {
        const response = await api.post('/exams', examData);
        return response.data;
    }

    static async getExams(params?: { subject_id?: string; student_id?: string; exam_period_id?: string }) {
        const response = await api.get('/exams', { params });
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    }

    static async updateExam(examId: string, examData: any) {
        const response = await api.put(`/exams/${examId}`, examData);
        return response.data;
    }

    static async deleteExam(examId: string) {
        const response = await api.delete(`/exams/${examId}`);
        return response.data;
    }

    static async getExamById(examId: string) {
        const response = await api.get(`/exams/${examId}`);
        return response.data;
    }

    static async recordExamResult(resultData: any) {
        const response = await api.post('/exams/results', resultData);
        return response.data;
    }

    static async getExamResults(examId?: string, studentId?: string) {
        const response = await api.get('/exams/results', { params: { exam_id: examId, student_id: studentId } });
        return response.data;
    }

    static async getExamRoster(examId: string) {
        const response = await api.get(`/exams/${examId}/roster`);
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    }

    // Exam Periods
    static async getExamPeriods(params?: { status?: string; term?: string; academic_year?: string; subject_id?: string; class_id?: string }) {
        const response = await api.get('/exams/periods', { params });
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    }

    static async createExamPeriod(data: any) {
        const response = await api.post('/exams/periods', data);
        return response.data;
    }

    static async updateExamPeriod(id: string, data: any) {
        const response = await api.put(`/exams/periods/${id}`, data);
        return response.data;
    }

    static async deleteExamPeriod(id: string) {
        const response = await api.delete(`/exams/periods/${id}`);
        return response.data;
    }
}
