import { api } from "./api";
import { Database } from "@/types/database";

export type Resource = Database['public']['Tables']['resources']['Row'] & {
    subject?: {
        title: string;
    } | null;
    class?: {
        name: string;
    } | null;
    Subject_title?: string;
    Class_name?: string;
    target_audience?: 'everyone' | 'staff_only';
    class_id?: string | null;
};

export const ResourceAPI = {
    // Get all resources (filtered by subject/class/audience optional)
    getResources: async (filterOptions?: { subjectId?: string; classId?: string; targetAudience?: 'everyone' | 'staff_only' }, pagination?: { page?: number; limit?: number }): Promise<Resource[]> => {
        try {
            const params = {
                ...(filterOptions?.subjectId ? { subject_id: filterOptions.subjectId } : {}),
                ...(filterOptions?.classId ? { class_id: filterOptions.classId } : {}),
                ...(filterOptions?.targetAudience ? { target_audience: filterOptions.targetAudience } : {}),
                ...(pagination || {}),
            };
            const response = await api.get("/resources", { params });
            const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);

            // Transform to match frontend expectations if necessary
            return list.map((r: any) => ({
                ...r,
                Subject_title: r.subject?.title || "General Resource",
                Class_name: r.class?.display_name || r.class?.name || null
            }));
        } catch (error) {
            console.error("Get resources error", error);
            throw error;
        }
    },

    getResourcesPaginated: async (subjectId?: string, pagination?: { page?: number; limit?: number }): Promise<any> => {
        try {
            const params = {
                ...(subjectId ? { subject_id: subjectId } : {}),
                ...(pagination || {}),
            };
            const response = await api.get("/resources", { params });
            return response.data;
        } catch (error) {
            console.error("Get resources paginated error", error);
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
    },

    // Approve a resource (Admin only)
    approveResource: async (id: string): Promise<Resource> => {
        try {
            const response = await api.patch(`/resources/${id}/approve`);
            return response.data;
        } catch (error) {
            console.error("Approve resource error", error);
            throw error;
        }
    },
};
