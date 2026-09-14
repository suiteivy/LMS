import { api } from "./api";

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export type DataScope = 'all' | 'levels' | 'classes';

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  data_scope?: DataScope;
  metadata?: {
    level_ids?: string[];
    class_ids?: string[];
    actions?: Record<string, boolean>;
    template?: string;
    [key: string]: any;
  };
  isDefault: boolean;
  permissions: string[];
}

export interface RoleTemplate {
  id: string;
  title: string;
  description: string;
  permissions: string[];
  data_scope: DataScope;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'blank',
    title: 'Clean Slate',
    description: 'Start with no pre-selected permissions and configure from scratch.',
    permissions: [],
    data_scope: 'all'
  },
  {
    id: 'academic_coordinator',
    title: 'Academic Coordinator',
    description: 'Full academic management, timetables, and report card publishing.',
    permissions: [
      'academic:read',
      'academic:write',
      'academic:publish_reports',
      'timetables:read',
      'timetables:write',
      'timetables:publish',
      'classes:read',
      'attendance:read'
    ],
    data_scope: 'all'
  },
  {
    id: 'grade_head',
    title: 'Head of Year / Level Lead',
    description: 'Academic and attendance management scoped to assigned levels.',
    permissions: [
      'academic:read',
      'academic:write',
      'attendance:read',
      'attendance:write',
      'classes:read',
      'messages:read',
      'messages:write'
    ],
    data_scope: 'levels'
  },
  {
    id: 'assistant_bursar',
    title: 'Assistant Bursar',
    description: 'Finance and bursaries read/write access without core institution settings.',
    permissions: [
      'finance:read',
      'finance:write',
      'bursary:read',
      'bursary:write',
      'classes:read'
    ],
    data_scope: 'all'
  },
  {
    id: 'communications_officer',
    title: 'Communications Officer',
    description: 'Institution announcements, messaging hub, and directory viewing.',
    permissions: [
      'messages:read',
      'messages:write',
      'announcements:write',
      'users:read',
      'classes:read'
    ],
    data_scope: 'all'
  }
];

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
  createRole: async (
    name: string,
    description: string,
    permissionNames: string[],
    dataScope: 'all' | 'levels' | 'classes' = 'all',
    metadata: Record<string, any> = {}
  ): Promise<any> => {
    try {
      const response = await api.post("/roles", {
        name,
        description,
        permission_names: permissionNames,
        data_scope: dataScope,
        metadata
      });
      return response.data;
    } catch (error) {
      console.error("Create role error:", error);
      throw error;
    }
  },

  // Update a custom role & its permissions
  updateRole: async (
    id: string,
    name: string,
    description: string,
    permissionNames: string[],
    dataScope: 'all' | 'levels' | 'classes' = 'all',
    metadata: Record<string, any> = {}
  ): Promise<any> => {
    try {
      const response = await api.put(`/roles/${id}`, {
        name,
        description,
        permission_names: permissionNames,
        data_scope: dataScope,
        metadata
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
