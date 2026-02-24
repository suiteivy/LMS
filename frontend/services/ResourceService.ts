import { api } from "./api";
import { Database } from "@/types/database";

type Resource = Database['public']['Tables']['resources']['Row'] & {
    subject?: {
        title: string;
    } | null;
    Subject_title?: string; // For compatibility with existing frontend code
};

export const ResourceAPI = {
    // Get all resources (filtered by subject optional)
    getResources: async (subjectId?: string): Promise<Resource[]> => {
        try {
            const params = subjectId ? { subject_id: subjectId } : {};
            const response = await api.get("/resources", { params });

            // Transform to match frontend expectations if necessary
            return response.data.map((r: any) => ({
                ...r,
                Subject_title: r.subject?.title || "Unknown Subject"
            }));
        } catch (error) {
            console.error("Get resources error", error);
            throw error;
        }
    },

    // Create a new resource
    createResource: async (data: Partial<Resource>): Promise<Resource> => {
        try {
            const response = await api.post("/resources", data);
            return response.data;
        } catch (error) {
            console.error("Create resource error", error);
            throw error;
        }
    },

    // Delete a resource
    deleteResource: async (id: string): Promise<void> => {
        try {
            await api.delete(`/resources/${id}`);
        } catch (error) {
            console.error("Delete resource error", error);
            throw error;
        }
    }
};
