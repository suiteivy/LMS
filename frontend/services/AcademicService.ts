import { api } from "./api";

export class AcademicService {
    /**
     * Learning Materials
     */
    static async updateMaterials(subjectId: string, materials: any[]) {
        const response = await api.put('/academic/materials', { subject_id: subjectId, materials });
        return response.data;
    }

    /**
     * Assignments
     */
    static async createAssignment(assignmentData: any) {
        const response = await api.post('/academic/assignments', assignmentData);
        return response.data;
    }

    static async getAssignments(subjectId?: string) {
        const response = await api.get('/academic/assignments', { params: { subject_id: subjectId } });
        return response.data;
    }

    /**
     * Submissions & Grading
     */
    static async submitAssignment(submissionData: any) {
        const response = await api.post('/academic/submissions', submissionData);
        return response.data;
    }

    static async gradeSubmission(submissionId: string, grade: number, feedback: string) {
        const response = await api.put(`/academic/submissions/${submissionId}/grade`, { grade, feedback });
        return response.data;
    }

    /**
     * Announcements
     */
    static async createAnnouncement(announcementData: any) {
        const response = await api.post('/academic/announcements', announcementData);
        return response.data;
    }

    static async getAnnouncements(subjectId?: string) {
        const response = await api.get('/academic/announcements', { params: { subject_id: subjectId } });
        return response.data;
    }
}
