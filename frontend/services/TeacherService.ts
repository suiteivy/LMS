// frontend/services/TeacherService.tsx
import { api } from './api';

export type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classId: string;
  schoolId: string;
  teacherId: string;
};

export type Student = {
  id: string;
  name: string;
  email: string;
  classId: string;
};

export type Class = {
  id: string;
  name: string;
  schoolId: string;
};

export const TeacherAPI = {
  getDashboardStats: async (): Promise<any> => {
    try {
      const response = await api.get("/teacher/dashboard/stats");
      return response.data;
    } catch (error) {
      console.error("Get dashboard stats error", error);
      throw error;
    }
  },

  getAnalytics: async (): Promise<any> => {
    try {
      const response = await api.get("/teacher/analytics");
      return response.data;
    } catch (error) {
      console.error("Get analytics error", error);
      throw error;
    }
  },

  fetchTeacherData: async (
    teacherId: string,
    schoolId: string,
    type: 'assignments' | 'students' | 'classes'
  ): Promise<Assignment[] | Student[] | Class[]> => {
    try {
      const response = await api.get(`/teachers/${teacherId}/${type}`, {
        params: { schoolId },
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      throw new Error(`Failed to fetch ${type}`);
    }
  },

  createAssignment: async (assignmentData: {
    title: string;
    description: string;
    dueDate: string;
    classId: string;
    teacherId: string;
    schoolId: string;
  }): Promise<Assignment> => {
    try {
      const response = await api.post(`/assignments`, assignmentData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw new Error('Failed to create assignment');
    }
  },

  updateTeacherProfile: async (
    teacherId: string,
    profileData: {
      name?: string;
      bio?: string;
    }
  ): Promise<void> => {
    try {
      await api.patch(`/teachers/${teacherId}`, profileData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      throw new Error('Failed to update teacher profile');
    }
  },

  getStudentPerformance: async (): Promise<any> => {
    try {
      const response = await api.get("/teacher/students/performance");
      return response.data;
    } catch (error) {
      console.error("Get student performance error", error);
      throw error;
    }
  },

  getStudentDetails: async (studentId: string): Promise<any> => {
    try {
      const response = await api.get(`/teacher/students/${studentId}/details`);
      return response.data;
    } catch (error) {
      console.error("Get student details error", error);
      throw error;
    }
  },

  getMyProfile: async (): Promise<any> => {
    try {
      const response = await api.get("/teacher/profile");
      return response.data;
    } catch (error) {
      console.error("Get teacher profile error", error);
      throw error;
    }
  },

  requestNameChange: async (requested_name: string, reason: string): Promise<any> => {
    try {
      const response = await api.post("/teacher/profile/request-name-change", {
        requested_name,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error("Request name change error", error);
      throw error;
    }
  },

  getStudentRankings: async (params?: { class_id?: string; subject_id?: string; role_mode?: string }): Promise<any> => {
    try {
      const response = await api.get("/teacher/rankings", { params });
      return response.data;
    } catch (error) {
      console.error("Get student rankings error", error);
      throw error;
    }
  },

  // HOD & Coverage Plans (J1)
  getHODSubjects: async (): Promise<any[]> => {
    try {
      const response = await api.get("/teacher/hod-subjects");
      return response.data;
    } catch (error) {
      console.error("Get HOD subjects error", error);
      throw error;
    }
  },

  getCoverageOversight: async (params?: { term?: string; academic_year?: string }): Promise<any> => {
    try {
      const response = await api.get("/teacher/coverage-plans/oversight", { params });
      return response.data;
    } catch (error) {
      console.error("Get coverage oversight error", error);
      throw error;
    }
  },

  getCoveragePlans: async (params: { subject_id: string; term?: string; academic_year?: string }): Promise<any> => {
    try {
      const response = await api.get("/teacher/coverage-plans", { params });
      return response.data;
    } catch (error) {
      console.error("Get coverage plans error", error);
      throw error;
    }
  },

  createCoveragePlan: async (payload: any): Promise<any> => {
    try {
      const response = await api.post("/teacher/coverage-plans", payload);
      return response.data;
    } catch (error) {
      console.error("Create coverage plan error", error);
      throw error;
    }
  },

  updateCoveragePlan: async (id: string, payload: any): Promise<any> => {
    try {
      const response = await api.put(`/teacher/coverage-plans/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Update coverage plan error", error);
      throw error;
    }
  },

  deleteCoveragePlan: async (id: string): Promise<any> => {
    try {
      const response = await api.delete(`/teacher/coverage-plans/${id}`);
      return response.data;
    } catch (error) {
      console.error("Delete coverage plan error", error);
      throw error;
    }
  },

  // Record of Work (J2)
  getRecordOfWork: async (params?: { subject_id?: string; class_id?: string; week_number?: number }): Promise<any[]> => {
    try {
      const response = await api.get("/teacher/record-of-work", { params });
      return response.data;
    } catch (error) {
      console.error("Get record of work error", error);
      throw error;
    }
  },

  createRecordOfWork: async (payload: any): Promise<any> => {
    try {
      const response = await api.post("/teacher/record-of-work", payload);
      return response.data;
    } catch (error) {
      console.error("Create record of work error", error);
      throw error;
    }
  },

  updateRecordOfWork: async (id: string, payload: any): Promise<any> => {
    try {
      const response = await api.put(`/teacher/record-of-work/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Update record of work error", error);
      throw error;
    }
  },

  deleteRecordOfWork: async (id: string): Promise<any> => {
    try {
      const response = await api.delete(`/teacher/record-of-work/${id}`);
      return response.data;
    } catch (error) {
      console.error("Delete record of work error", error);
      throw error;
    }
  },

  detectLessonDateInfo: async (date: string): Promise<{
    date: string;
    week_number: number;
    term: string | null;
    term_id: string | null;
    is_cancelled: boolean;
    cancellation_event: string | null;
  }> => {
    try {
      const response = await api.get("/teacher/record-of-work/detect-date", { params: { date } });
      return response.data;
    } catch (error) {
      console.error("Detect lesson date info error", error);
      throw error;
    }
  },
};

export const TeacherService = TeacherAPI;
export default TeacherAPI;


