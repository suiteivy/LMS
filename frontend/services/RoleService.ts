import { api } from "./api";

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  permissions: string[];
}

export const RoleAPI = {
  // Get all roles with their permissions
  getRoles: async (): Promise<CustomRole[]> => {
    try {
      const response = await api.get("/roles");
      return response.data;
    } catch (error) {
      console.error("Get roles error:", error);
      throw error;
    }
  },

  // Get all system permissions
  getPermissions: async (): Promise<Permission[]> => {
    try {
      const response = await api.get("/roles/permissions");
      return response.data;
    } catch (error) {
      console.error("Get permissions error:", error);
      throw error;
    }
  },

  // Create a new custom role
  createRole: async (name: string, description: string, permissionNames: string[]): Promise<any> => {
    try {
      const response = await api.post("/roles", {
        name,
        description,
        permission_names: permissionNames
      });
      return response.data;
    } catch (error) {
      console.error("Create role error:", error);
      throw error;
    }
  },

  // Update a custom role & its permissions
  updateRole: async (id: string, name: string, description: string, permissionNames: string[]): Promise<any> => {
    try {
      const response = await api.put(`/roles/${id}`, {
        name,
        description,
        permission_names: permissionNames
      });
      return response.data;
    } catch (error) {
      console.error("Update role error:", error);
      throw error;
    }
  },

  // Delete a custom role
  deleteRole: async (id: string): Promise<any> => {
    try {
      const response = await api.delete(`/roles/${id}`);
      return response.data;
    } catch (error) {
      console.error("Delete role error:", error);
      throw error;
    }
  },

  // Assign custom roles to a user
  assignUserRoles: async (userId: string, roleIds: string[]): Promise<any> => {
    try {
      const response = await api.post("/roles/assign", {
        userId,
        role_ids: roleIds
      });
      return response.data;
    } catch (error) {
      console.error("Assign user roles error:", error);
      throw error;
    }
  },

  // Get custom roles assigned to a user
  getUserRoles: async (userId: string): Promise<CustomRole[]> => {
    try {
      const response = await api.get(`/roles/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Get user roles error:", error);
      throw error;
    }
  }
};
