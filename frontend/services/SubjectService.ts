import { api } from "./api";

export interface SubjectData {
    id: string;
    title: string;
    description?: string;
    fee_amount?: number;
    institution_id: string;
    teacher_id?: string;
    class_id?: string;
    teachers?: {
        users: {
            full_name: string;
        }
    };
}

export const SubjectAPI = {
    // Get all subjects
    getSubjects: async (): Promise<SubjectData[]> => {
        try {
            const response = await api.get("/subjects");
            return response.data;
        } catch (error) {
            console.error("Get subjects error", error);
            throw error;
        }
    },

    // Get subjects by class
    getSubjectsByClass: async (classId: string): Promise<SubjectData[]> => {
        try {
            const response = await api.get(`/subjects/class/${classId}`);
            return response.data;
        } catch (error) {
            console.error("Get subjects by class error", error);
            throw error;
        }
    },

    // Create a new subject
    createSubject: async (data: Partial<SubjectData>): Promise<SubjectData> => {
        try {
            const response = await api.post("/subjects", data);
            return response.data;
        } catch (error) {
            console.error("Create subject error", error);
            throw error;
        }
    },

    // Enroll student in a subject
    enrollStudent: async (subjectId: string): Promise<any> => {
        try {
            const response = await api.post("/subjects/enroll", { subject_id: subjectId.toString() });
            return response.data;
        } catch (error) {
            console.error("Enroll student error", error);
            throw error;
        }
    }
};
