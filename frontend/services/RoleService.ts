import { api } from "./api";

export interface FeatureItem {
  id: string;
  domain: string;
  action: string;
  name: string;
  description?: string;
  category?: string;
}

export type DataScope = 'all' | 'levels' | 'classes' | 'streams' | 'terms' | 'record_types' | 'own_records';

export interface RoleScope {
  id?: string;
  domain: string;
  scope_type: DataScope;
  scope_values: string[];
  hidden_fields: string[];
}

export interface RolePermissionItem {
  domain: string;
  action: string;
  legacyName?: string | null;
  description?: string | null;
}

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  data_scope?: DataScope;
  metadata?: {
    level_ids?: string[];
    class_ids?: string[];
    stream_ids?: string[];
    term_ids?: string[];
    actions?: Record<string, boolean>;
    template?: string;
    [key: string]: any;
  };
  isDefault: boolean;
  permissions: RolePermissionItem[] | string[];
  scopes?: RoleScope[];
}

export interface RoleTemplate {
  id: string;
  institution_id?: string | null;
  name: string;
  description: string;
  best_for?: string;
  permissions: Array<{ domain: string; action: string }> | string[];
  data_scope: DataScope;
  scope_config?: Record<string, any>;
  is_system?: boolean;
}

export interface PermissionOverride {
  id: string;
  domain: string;
  action: string;
  effect: 'allow' | 'deny';
  reason?: string;
  granted_by?: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  domain?: string;
  target_type?: string;
  target_id?: string;
  before_state?: any;
  after_state?: any;
  ip_address?: string;
  created_at: string;
  actor?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

export interface HelpContentItem {
  id?: string;
  key: string;
  language: string;
  title: string;
  body: string;
  example?: string;
}

export const RoleAPI = {
  // Get all roles with their permissions & scopes
  getRoles: async (): Promise<CustomRole[]> => {
    try {
      const response = await api.get("/roles");
      return response.data;
    } catch (error) {
      console.error("Get roles error:", error);
      throw error;
    }
  },

  // Get ready-made role templates
  getTemplates: async (): Promise<RoleTemplate[]> => {
    try {
      const response = await api.get("/roles/templates");
      return response.data;
    } catch (error) {
      console.error("Get templates error:", error);
      throw error;
    }
  },

  // Get feature registry (domains & actions)
  getFeatures: async (): Promise<FeatureItem[]> => {
    try {
      const response = await api.get("/roles/features");
      return response.data;
    } catch (error) {
      console.error("Get features error:", error);
      throw error;
    }
  },

  // Get plain-language help & guidance content
  getHelpContent: async (language: string = 'en'): Promise<HelpContentItem[]> => {
    try {
      const response = await api.get(`/roles/help?language=${language}`);
      return response.data;
    } catch (error) {
      console.error("Get help content error:", error);
      throw error;
    }
  },

  // Get system activity history audit logs
  getAuditLogs: async (limit: number = 50, offset: number = 0): Promise<{ logs: AuditLogRecord[]; total: number }> => {
    try {
      const response = await api.get(`/roles/audit?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error("Get audit logs error:", error);
      throw error;
    }
  },

  // Get effective merged permissions & scopes for any user
  getEffectivePermissions: async (userId: string): Promise<{ permissions: any; scopes: any }> => {
    try {
      const response = await api.get(`/roles/effective/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Get effective permissions error:", error);
      throw error;
    }
  },

  // Create a new custom role with granular permissions and scopes
  createRole: async (data: {
    name: string;
    description?: string;
    permissions?: Array<{ domain: string; action: string }> | string[];
    permission_names?: string[];
    scopes?: RoleScope[];
    data_scope?: DataScope;
    metadata?: Record<string, any>;
    created_from_template_id?: string;
  }): Promise<any> => {
    try {
      const response = await api.post("/roles", data);
      return response.data;
    } catch (error) {
      console.error("Create role error:", error);
      throw error;
    }
  },

  // Update a custom role & its permissions/scopes
  updateRole: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: Array<{ domain: string; action: string }> | string[];
      permission_names?: string[];
      scopes?: RoleScope[];
      data_scope?: DataScope;
      metadata?: Record<string, any>;
    }
  ): Promise<any> => {
    try {
      const response = await api.put(`/roles/${id}`, data);
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

  // Assign multi-roles to user (with optional time-bound dates)
  assignUserRoles: async (
    userIdOrData: string | { userId: string; roleIds: string[]; starts_at?: string; expires_at?: string },
    roleIdsArg?: string[],
    options?: { starts_at?: string; expires_at?: string }
  ): Promise<any> => {
    try {
      let uid = '';
      let rids: string[] = [];
      let sAt = options?.starts_at;
      let eAt = options?.expires_at;

      if (typeof userIdOrData === 'object' && userIdOrData !== null) {
        uid = userIdOrData.userId;
        rids = userIdOrData.roleIds;
        sAt = userIdOrData.starts_at;
        eAt = userIdOrData.expires_at;
      } else {
        uid = userIdOrData;
        rids = roleIdsArg || [];
      }

      const response = await api.post("/roles/assign", {
        userId: uid,
        role_ids: rids,
        starts_at: sAt,
        expires_at: eAt,
      });
      return response.data;
    } catch (error) {
      console.error("Assign user roles error:", error);
      throw error;
    }
  },

  // Get roles assigned to a user
  getUserRoles: async (userId: string): Promise<CustomRole[]> => {
    try {
      const response = await api.get(`/roles/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Get user roles error:", error);
      throw error;
    }
  },

  // Set account-level explicit override (Allow or Deny)
  setPermissionOverride: async (
    userId: string,
    domain: string,
    action: string,
    effect: 'allow' | 'deny',
    reason?: string
  ): Promise<any> => {
    try {
      const response = await api.post("/roles/override", {
        userId,
        domain,
        action,
        effect,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error("Set permission override error:", error);
      throw error;
    }
  },

  // Delete an explicit permission override
  deletePermissionOverride: async (overrideId: string): Promise<any> => {
    try {
      const response = await api.delete(`/roles/override/${overrideId}`);
      return response.data;
    } catch (error) {
      console.error("Delete permission override error:", error);
      throw error;
    }
  },
};
