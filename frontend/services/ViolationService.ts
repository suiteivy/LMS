import { api } from './api';

export type ViolationSeverity = 'minor' | 'moderate' | 'major' | 'critical';

export type ViolationActionTaken =
  | 'verbal_warning'
  | 'written_warning'
  | 'detention'
  | 'suspension'
  | 'expulsion'
  | 'parent_conference'
  | 'counseling'
  | 'community_service'
  | 'other';

export type ViolationStatus = 'active' | 'resolved' | 'appealed' | 'expunged';

export interface StudentViolation {
  id: string;
  institution_id: string;
  student_id: string;
  title: string;
  description?: string | null;
  severity: ViolationSeverity;
  action_taken: ViolationActionTaken;
  action_details?: Record<string, any>;
  suspension_start_date?: string | null;
  suspension_end_date?: string | null;
  recorded_by: string;
  status: ViolationStatus;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
  recorded_by_user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  resolved_by_user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

export const ViolationService = {
  async recordViolation(data: {
    student_id: string;
    title: string;
    description?: string;
    severity?: ViolationSeverity;
    action_taken?: ViolationActionTaken;
    action_details?: Record<string, any>;
    suspension_start_date?: string;
    suspension_end_date?: string;
  }): Promise<{ message: string; data: StudentViolation }> {
    const res = await api.post('/violations', data);
    return res.data;
  },

  async getStudentViolations(studentId: string): Promise<{
    data: StudentViolation[];
    student?: { id: string; full_name?: string; enrollment_status?: string };
  }> {
    const res = await api.get(`/violations/student/${studentId}`);
    return res.data;
  },

  async getMyViolations(): Promise<{ data: StudentViolation[] }> {
    const res = await api.get('/violations/my');
    return res.data;
  },

  async resolveViolation(
    id: string,
    data: { status: ViolationStatus; resolution_notes?: string }
  ): Promise<{ message: string; data: StudentViolation }> {
    const res = await api.patch(`/violations/${id}/resolve`, data);
    return res.data;
  },

  getViolationPdfUrl(id: string): string {
    return `/violations/${id}/pdf`;
  },

  getStudentSummaryPdfUrl(studentId: string): string {
    return `/violations/student/${studentId}/summary-pdf`;
  },
};
