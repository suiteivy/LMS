import { api } from './api';

export type PromotionCycleStatus = 'draft' | 'reviewed' | 'completed' | 'completed_with_errors';

export interface PromotionCycle {
  id: string;
  name: string;
  term_id: string;
  from_class_id: string;
  to_class_id: string;
  min_average_percentage: number;
  min_attendance_percentage: number;
  status: PromotionCycleStatus;
  previewed_at?: string | null;
  executed_at?: string | null;
  created_at?: string;
}

export interface PromotionDecision {
  id: string;
  cycle_id: string;
  student_id: string;
  average_percentage: number | null;
  attendance_percentage: number | null;
  eligible: boolean;
  status: 'pending' | 'promoted' | 'retained' | 'failed';
  reason: string;
}

export const PromotionAPI = {
  getCycles: async (status?: string): Promise<PromotionCycle[]> => {
    const res = await api.get('/promotions/cycles', { params: status ? { status } : undefined });
    return res.data?.data || [];
  },

  createCycle: async (payload: {
    name: string;
    term_id: string;
    from_class_id: string;
    to_class_id: string;
    min_average_percentage?: number;
    min_attendance_percentage?: number;
  }): Promise<PromotionCycle> => {
    const res = await api.post('/promotions/cycles', payload);
    return res.data?.data;
  },

  previewCycle: async (cycleId: string, save_decisions = true) => {
    const res = await api.post(`/promotions/cycles/${cycleId}/preview`, { save_decisions });
    return res.data?.data;
  },

  getDecisions: async (cycleId: string): Promise<PromotionDecision[]> => {
    const res = await api.get(`/promotions/cycles/${cycleId}/decisions`);
    return res.data?.data || [];
  },

  executeCycle: async (cycleId: string) => {
    const res = await api.post(`/promotions/cycles/${cycleId}/execute`);
    return res.data?.data;
  },
};
