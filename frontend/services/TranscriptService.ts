import { api } from './api';

export interface TranscriptConfig {
  id?: string;
  institution_id?: string;
  report_classification: 'term' | 'year' | 'overall';
  show_fee_balance: boolean;
  show_pending_section: boolean;
  show_compulsory_elective: boolean;
  show_summary_averages: boolean;
  summary_format: 'auto' | 'numeric' | 'descriptor_distribution';
  show_key_legend: boolean;
  show_teacher_remarks: boolean;
  show_attendance: boolean;
  overall_layout_mode: 'period_grouped' | 'consolidated_subjects';
  updated_at?: string;
}

export interface TranscriptConfigsResponse {
  term: TranscriptConfig;
  year: TranscriptConfig;
  overall: TranscriptConfig;
}

export interface AvailablePeriodTerm {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface AvailablePeriodYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  terms: AvailablePeriodTerm[];
}

export const TranscriptService = {
  /**
   * Fetch all configurations for term, year, and overall classifications.
   */
  async getConfigurations(): Promise<TranscriptConfigsResponse> {
    const res = await api.get('/transcripts/configurations');
    return res.data.data;
  },

  /**
   * Update configuration for a specific classification (Admin only).
   */
  async updateConfiguration(
    classification: 'term' | 'year' | 'overall',
    data: Partial<TranscriptConfig>
  ): Promise<TranscriptConfig> {
    const res = await api.put(`/transcripts/configurations/${classification}`, data);
    return res.data.data;
  },

  /**
   * Fetch available academic years and terms for a student.
   */
  async getAvailablePeriods(studentId?: string): Promise<{ student_id: string; academic_years: AvailablePeriodYear[] }> {
    const res = await api.get('/transcripts/periods', {
      params: studentId ? { student_id: studentId } : {},
    });
    return res.data.data;
  },

  /**
   * Fetch structured transcript data.
   */
  async getTranscriptData(params: {
    student_id?: string;
    classification: 'term' | 'year' | 'overall';
    period_id?: string;
    class_id?: string;
  }): Promise<any> {
    const res = await api.get('/transcripts/data', { params });
    return res.data.data;
  },

  /**
   * Request vector PDF binary as Blob.
   */
  async compileTranscriptPdfBlob(params: {
    student_id?: string;
    classification: 'term' | 'year' | 'overall';
    period_id?: string;
    class_id?: string;
  }): Promise<Blob> {
    const res = await api.post('/transcripts/compile-pdf', params, {
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Request base64-encoded vector PDF for in-app preview modal.
   */
  async compileTranscriptPdfBase64(params: {
    student_id?: string;
    classification: 'term' | 'year' | 'overall';
    period_id?: string;
    class_id?: string;
  }): Promise<{ base64: string; size_bytes: number; transcript_data: any }> {
    const res = await api.post('/transcripts/compile-base64', params);
    return res.data.data;
  },
};
