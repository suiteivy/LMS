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

  getTargetClasses: async (params: {
    grade_level?: number;
    form_level?: number;
    source_class_id?: string;
  }): Promise<{
    classes: Array<{
      id: string;
      grade_level?: number;
      form_level?: number;
      stream?: string;
      display_name?: string;
      name: string;
      capacity?: number;
      current_enrollment: number;
    }>;
    has_multiple_classes: boolean;
    is_senior_secondary: boolean;
    tracks: any[];
  }> => {
    const res = await api.get('/promotions/target-classes', { params });
    return res.data?.data;
  },

  promoteIndividual: async (payload: {
    student_id: string;
    to_class_id: string;
    track_id?: string;
    elective_subject_ids?: string[];
    cycle_id?: string;
    reason?: string;
  }) => {
    const res = await api.post('/promotions/individual', payload);
    return res.data;
  },

  promoteClass: async (payload: {
    from_class_id: string;
    to_class_id?: string;
    reshuffle?: boolean;
    student_ids?: string[];
    track_id?: string;
    elective_subject_ids?: string[];
    student_tracks?: Record<string, { track_id?: string; elective_subject_ids?: string[] }>;
  }) => {
    const res = await api.post('/promotions/promote-class', payload);
    return res.data;
  },
};
