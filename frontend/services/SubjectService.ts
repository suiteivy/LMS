import { api } from "./api";

export interface SubjectData {
    id: string;
    title: string;
    description?: string;
    fee_amount?: number;
    institution_id: string;
    teacher_id?: string;
    class_id?: string;
    class_ids?: string[];
    level_ids?: string[] | null;
    teacher_ids?: string[];
    teachers?: {
        users: {
            first_name: string;
            last_name: string;
            full_name?: string;
        }
    };
}

export const SubjectAPI = {
    // Get all subjects
    getSubjects: async (params?: { page?: number; limit?: number; level_id?: string }): Promise<SubjectData[]> => {
        try {
            const response = await api.get("/subjects", { params });
            return Array.isArray(response.data) ? response.data : (response.data?.data || []);
        } catch (error) {
            console.error("Get subjects error", error);
            throw error;
        }
    },

    // Get subjects scoped to a specific class level (falls back to all-levels subjects too)
    getSubjectsByLevel: async (levelId: string): Promise<SubjectData[]> => {
        try {
            const response = await api.get("/subjects", { params: { level_id: levelId } });
            return Array.isArray(response.data) ? response.data : (response.data?.data || []);
        } catch (error) {
            console.error("Get subjects by level error", error);
            throw error;
        }
    },

    getSubjectsPaginated: async (params?: { page?: number; limit?: number; level_id?: string }): Promise<any> => {
        try {
            const response = await api.get("/subjects", { params });
            return response.data;
        } catch (error) {
            console.error("Get subjects paginated error", error);
            throw error;
        }
    },

    // Get subjects filtered by current user (teacher)
    getFilteredSubjects: async (): Promise<SubjectData[]> => {
        try {
            const response = await api.get("/subjects/filtered");
            return response.data;
        } catch (error) {
            console.error("Get filtered subjects error", error);
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
            return response.data?.data || response.data;
        } catch (error) {
            console.error("Create subject error", error);
            throw error;
        }
    },

    // Delete a subject
    deleteSubject: async (id: string): Promise<void> => {
        try {
            await api.delete(`/subjects/${id}`);
        } catch (error) {
            console.error("Delete subject error", error);
            throw error;
        }
    },

    // Update a subject
    updateSubject: async (id: string, data: Partial<SubjectData>): Promise<SubjectData> => {
        try {
            const response = await api.put(`/subjects/${id}`, data);
            return response.data;
        } catch (error) {
            console.error("Update subject error", error);
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
    },

    // Two-Level Subject Content: Topic Areas (Plain Label)
    getTopicAreas: async (subjectId: string): Promise<TopicAreaData[]> => {
        try {
            const response = await api.get(`/subjects/${subjectId}/topic-areas`);
            return response.data?.data || [];
        } catch (error) {
            console.error("Get topic areas error", error);
            throw error;
        }
    },

    createTopicArea: async (subjectId: string, data: { name: string; description?: string; sort_order?: number }): Promise<TopicAreaData> => {
        try {
            const response = await api.post(`/subjects/${subjectId}/topic-areas`, data);
            return response.data?.data;
        } catch (error) {
            console.error("Create topic area error", error);
            throw error;
        }
    },

    updateTopicArea: async (id: string, data: { name?: string; description?: string; sort_order?: number }): Promise<TopicAreaData> => {
        try {
            const response = await api.put(`/subjects/topic-areas/${id}`, data);
            return response.data?.data;
        } catch (error) {
            console.error("Update topic area error", error);
            throw error;
        }
    },

    deleteTopicArea: async (id: string): Promise<void> => {
        try {
            await api.delete(`/subjects/topic-areas/${id}`);
        } catch (error) {
            console.error("Delete topic area error", error);
            throw error;
        }
    },

    // Two-Level Subject Content: Topics (Plain Label)
    getTopics: async (topicAreaId: string): Promise<TopicData[]> => {
        try {
            const response = await api.get(`/subjects/topic-areas/${topicAreaId}/topics`);
            return response.data?.data || [];
        } catch (error) {
            console.error("Get topics error", error);
            throw error;
        }
    },

    createTopic: async (topicAreaId: string, data: { name: string; description?: string; sort_order?: number }): Promise<TopicData> => {
        try {
            const response = await api.post(`/subjects/topic-areas/${topicAreaId}/topics`, data);
            return response.data?.data;
        } catch (error) {
            console.error("Create topic error", error);
            throw error;
        }
    },

    updateTopic: async (id: string, data: { name?: string; description?: string; sort_order?: number }): Promise<TopicData> => {
        try {
            const response = await api.put(`/subjects/topics/${id}`, data);
            return response.data?.data;
        } catch (error) {
            console.error("Update topic error", error);
            throw error;
        }
    },

    deleteTopic: async (id: string): Promise<void> => {
        try {
            await api.delete(`/subjects/topics/${id}`);
        } catch (error) {
            console.error("Delete topic error", error);
            throw error;
        }
    }
};

export interface TopicAreaData {
    id: string;
    institution_id: string;
    subject_id: string;
    name: string;
    description?: string;
    sort_order?: number;
    created_at?: string;
    topics?: TopicData[];
}

export interface TopicData {
    id: string;
    institution_id: string;
    topic_area_id: string;
    name: string;
    description?: string;
    sort_order?: number;
    created_at?: string;
}
