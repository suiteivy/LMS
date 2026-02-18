import { api } from "./api";

export class ExamService {
    static async createExam(examData: any) {
        const response = await api.post('/exams', examData);
        return response.data;
    }

    static async getExams(subjectId?: string) {
        const response = await api.get('/exams', { params: { subject_id: subjectId } });
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
}
