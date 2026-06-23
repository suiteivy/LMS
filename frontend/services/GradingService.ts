import { api } from './api';

export const GradingAPI = {
  // Assessment Types
  getAssessmentTypes: async () => {
    const res = await api.get('/assessment-types');
    return res.data.data;
  },
  createAssessmentType: async (data: any) => {
    const res = await api.post('/assessment-types', data);
    return res.data.data;
  },
  updateAssessmentType: async (id: string, data: any) => {
    const res = await api.put(`/assessment-types/${id}`, data);
    return res.data.data;
  },
  deleteAssessmentType: async (id: string) => {
    const res = await api.delete(`/assessment-types/${id}`);
    return res.data;
  },

  // Academic Years
  getAcademicYears: async () => {
    const res = await api.get('/academic-years/years');
    return res.data.data;
  },
  createAcademicYear: async (data: any) => {
    const res = await api.post('/academic-years/years', data);
    return res.data.data;
  },
  updateAcademicYear: async (id: string, data: any) => {
    const res = await api.put(`/academic-years/years/${id}`, data);
    return res.data.data;
  },
  deleteAcademicYear: async (id: string) => {
    const res = await api.delete(`/academic-years/years/${id}`);
    return res.data;
  },

  // Active Term Resolution (date-driven)
  getActiveTerm: async () => {
    try {
      const res = await api.get('/academic-years/active-term');
      return res.data?.data || {
        active_term: null,
        next_upcoming_term: null,
        has_active_term: false,
      };
    } catch {
      const res = await api.get('/academic-years/terms');
      const terms: any[] = Array.isArray(res.data?.data) ? res.data.data : [];

      const parseDateOnly = (value: any) => {
        if (!value) return null;
        const str = String(value).trim();
        const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        const y = Number(match[1]);
        const m = Number(match[2]);
        const d = Number(match[3]);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
      };

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const parsed = (terms
        .map((t) => {
          const start = parseDateOnly(t.start_date ?? t.startDate);
          const end = parseDateOnly(t.end_date ?? t.endDate);
          if (!start || !end) return null;
          return {
            ...t,
            __start: start,
            __end: end,
          };
        })
        .filter(Boolean) as any[])
        .sort((a, b) => a.__start.getTime() - b.__start.getTime());

      const active = parsed.find((t) => t.__start <= today && today <= t.__end) || null;
      const next = active ? null : parsed.find((t) => t.__start > today) || null;

      return {
        active_term: active,
        next_upcoming_term: next,
        has_active_term: !!active,
      };
    }
  },

  // Terms
  getTerms: async (yearId?: string) => {
    const params = yearId ? { academic_year_id: yearId } : {};
    const res = await api.get('/academic-years/terms', { params });
    return res.data.data;
  },
  createTerm: async (data: any) => {
    const res = await api.post('/academic-years/terms', data);
    return res.data.data;
  },
  updateTerm: async (id: string, data: any) => {
    const res = await api.put(`/academic-years/terms/${id}`, data);
    return res.data.data;
  },
  deleteTerm: async (id: string) => {
    const res = await api.delete(`/academic-years/terms/${id}`);
    return res.data;
  },
  setCurrentTerm: async (termId: string) => {
    const res = await api.put('/academic-years/terms/set-current', { term_id: termId });
    return res.data.data;
  },
  setTermLockState: async (termId: string, locked: boolean) => {
    const res = await api.put(`/academic-years/terms/${termId}/lock`, { locked });
    return res.data.data;
  },

  // Grading Scales
  getGradingScales: async () => {
    const res = await api.get('/grading-scales');
    return res.data.data;
  },
  createGradingScale: async (data: any) => {
    const res = await api.post('/grading-scales', data);
    return res.data.data;
  },
  updateGradingScale: async (id: string, data: any) => {
    const res = await api.put(`/grading-scales/${id}`, data);
    return res.data.data;
  },
  deleteGradingScale: async (id: string) => {
    const res = await api.delete(`/grading-scales/${id}`);
    return res.data;
  },
  bulkCreateGradingScale: async (data: any) => {
    const res = await api.post('/grading-scales/bulk', data);
    return res.data.data;
  },
  getDefaultScale: async () => {
    const res = await api.get('/grading-scales/default');
    return res.data.data;
  },

  // Grade Entries
  getGradeEntries: async (params?: any) => {
    const res = await api.get('/grade-entries', { params });
    return res.data.data;
  },
  createGradeEntry: async (data: any) => {
    const res = await api.post('/grade-entries', data);
    return res.data.data;
  },
  updateGradeEntry: async (id: string, data: any) => {
    const res = await api.put(`/grade-entries/${id}`, data);
    return res.data.data;
  },
  deleteGradeEntry: async (id: string) => {
    const res = await api.delete(`/grade-entries/${id}`);
    return res.data;
  },
  bulkCreateGradeEntries: async (data: any) => {
    const res = await api.post('/grade-entries/bulk', data);
    return res.data.data;
  },
  bulkImportGrades: async (data: any) => {
    const res = await api.post('/grade-entries/import', data);
    return res.data.data;
  },
  syncAssignmentGrades: async (data: any) => {
    const res = await api.post('/grade-entries/sync/assignments', data);
    return res.data.data;
  },
  syncExamGrades: async (data: any) => {
    const res = await api.post('/grade-entries/sync/exams', data);
    return res.data.data;
  },
  getGradeSummary: async (params: any) => {
    const res = await api.get('/grade-entries/summary', { params });
    return res.data.data;
  },
  getStudentGradingScale: async (studentId: string) => {
    const res = await api.get('/grade-entries/student-scale', { params: { student_id: studentId } });
    return res.data.data;
  },
  getPerformanceTrends: async (params: { student_id?: string; class_id?: string; subject_id?: string }) => {
    const res = await api.get('/grade-entries/performance-trends', { params });
    return res.data.data;
  },

  // Report Cards
  getReportCards: async (params?: any) => {
    const res = await api.get('/report-cards', { params });
    return res.data.data;
  },
  getReportCard: async (id: string) => {
    const res = await api.get(`/report-cards/${id}`);
    return res.data.data;
  },
  generateStudentReportCard: async (data: any) => {
    const res = await api.post('/report-cards/generate', data);
    return res.data.data;
  },
  generateClassReportCards: async (data: any) => {
    const res = await api.post('/report-cards/generate-class', data);
    return res.data.data;
  },
  updateReportCardRemarks: async (id: string, data: any) => {
    const res = await api.put(`/report-cards/${id}/remarks`, data);
    return res.data.data;
  },
  publishReportCard: async (id: string) => {
    const res = await api.put(`/report-cards/${id}/publish`);
    return res.data.data;
  },
  bulkPublishReportCards: async (data: any) => {
    const res = await api.post('/report-cards/bulk-publish', data);
    return res.data.data;
  },
  releaseReportCard: async (id: string) => {
    const res = await api.put(`/report-cards/${id}/release`);
    return res.data.data;
  },
  bulkReleaseReportCards: async (data: any) => {
    const res = await api.post('/report-cards/bulk-release', data);
    return res.data.data;
  },
  checkCompleteness: async (params: any) => {
    const res = await api.get('/report-cards/completeness', { params });
    return res.data.data;
  },
  getReportCardSummary: async (params: any) => {
    const res = await api.get('/report-cards/summary', { params });
    return res.data.data;
  },
  exportReportCardPDF: async (params: any) => {
    const res = await api.get('/report-cards/export/pdf', { params });
    return res.data.data;
  },
};
