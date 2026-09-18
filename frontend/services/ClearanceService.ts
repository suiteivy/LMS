import { api } from './api';

export interface ClearanceProcess {
  id: string;
  institution_id: string;
  user_id: string;
  user_role: 'student' | 'teacher' | 'admin';
  initiated_by: 'admin' | 'self' | 'parent';
  initiator_user_id: string;
  reason_category: string;
  reason_details?: Record<string, any>;
  current_step: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  library_cleared: boolean;
  library_checked_at?: string | null;
  library_notes?: string | null;
  finance_cleared: boolean;
  finance_checked_at?: string | null;
  finance_notes?: string | null;
  property_cleared: boolean;
  property_checked_at?: string | null;
  property_notes?: string | null;
  allow_user_continuation: boolean;
  admin_override: boolean;
  override_reason?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url?: string | null;
  };
  initiator?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  completer?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface EligibilityResult {
  user_id: string;
  full_name?: string;
  email?: string;
  role?: string;
  valid: boolean;
  error?: string;
  has_active_process?: boolean;
  active_clearance?: any;
}

export interface CategoryStatusResult {
  user_id: string;
  role: string;
  library: {
    cleared: boolean;
    unreturned_count: number;
    items: Array<{
      id: string;
      borrowed_at: string;
      due_date: string;
      status: string;
      book?: { title: string; isbn?: string };
    }>;
  };
  finance: {
    cleared: boolean;
    balance: number;
  };
  property: {
    cleared: boolean;
    notes?: string | null;
  };
  all_cleared: boolean;
}

export const ClearanceService = {
  async checkEligibility(userIds: string[], reasonCategory: string): Promise<{ eligible: boolean; results: EligibilityResult[] }> {
    const res = await api.post('/clearance/check-eligibility', {
      user_ids: userIds,
      reason_category: reasonCategory,
    });
    return res.data;
  },

  async checkCategoryStatus(userId: string): Promise<CategoryStatusResult> {
    const res = await api.post('/clearance/category-status', { user_id: userId });
    return res.data;
  },

  async getActiveClearance(userId?: string): Promise<{ active: boolean; clearance: ClearanceProcess | null }> {
    const res = await api.get('/clearance/active', {
      params: userId ? { user_id: userId } : undefined,
    });
    return res.data;
  },

  async initiateClearance(data: {
    user_ids: string[];
    reason_category: string;
    reason_details?: Record<string, any>;
    allow_user_continuation?: boolean;
  }): Promise<{ message: string; process: ClearanceProcess; resumed?: boolean }> {
    const res = await api.post('/clearance/initiate', data);
    return res.data;
  },

  async updateStep(id: string, data: {
    current_step?: number;
    reason_details?: Record<string, any>;
    library_cleared?: boolean;
    library_notes?: string;
    finance_cleared?: boolean;
    finance_notes?: string;
    property_cleared?: boolean;
    property_notes?: string;
    admin_override?: boolean;
    override_reason?: string;
  }): Promise<{ message: string; process: ClearanceProcess }> {
    const res = await api.patch(`/clearance/${id}/step`, data);
    return res.data;
  },

  async finalizeClearance(id: string, data?: {
    admin_override?: boolean;
    override_reason?: string;
  }): Promise<{ message: string; process: ClearanceProcess }> {
    const res = await api.post(`/clearance/${id}/finalize`, data || {});
    return res.data;
  },

  async cancelClearance(id: string, cancellationReason?: string): Promise<{ message: string; process: ClearanceProcess }> {
    const res = await api.post(`/clearance/${id}/cancel`, {
      cancellation_reason: cancellationReason,
    });
    return res.data;
  },

  async listClearances(params?: {
    status?: string;
    reason_category?: string;
    user_role?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ clearances: ClearanceProcess[]; total: number; limit: number; offset: number }> {
    const res = await api.get('/clearance/list', { params });
    return res.data;
  },

  async getClearanceDetails(id: string): Promise<{ process: ClearanceProcess }> {
    const res = await api.get(`/clearance/${id}`);
    return res.data;
  },

  getClearancePdfUrl(id: string): string {
    return `/clearance/${id}/pdf`;
  },
};
