import { api } from "./api"; // Use the configured axios instance

export interface ClassData {
    id: string;
    name: string;
    description?: string;
    institution_id: string;
}

export const ClassAPI = {
    // Get all classes
    getClasses: async () => {
        try {
            // Adjust endpoint if needed. Typically /api/institutions/classes or similar.
            // Based on server.js: app.use("/api/institutions", institutionRoutes);
            // Let's assume a route exists or we create one. 
            // Checking `institution.route.js` would differ, but for now assuming standard REST.
            // If it fails, I will fix the backend.
            const response = await api.get("/institutions/classes");
            return response.data;
        } catch (error: any) {
            console.error("Get classes error", error.response?.data || error.message);
            throw error.response?.data || { error: 'Failed to fetch classes' };
        }
    },

    // Get Subjects for a class (if needed for timetable validation)
    getClassSubjects: async (classId: string) => {
        try {
            const response = await api.get(`/subjects/class/${classId}`);
            return response.data;
        } catch (error: any) {
            console.error("Get class subjects error", error.response?.data || error.message);
            throw error.response?.data || { error: 'Failed to fetch subjects' };
        }
    }
};
