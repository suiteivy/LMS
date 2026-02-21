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

  getEarnings: async (): Promise<any> => {
    try {
      const response = await api.get("/teacher/earnings");
      return response.data;
    } catch (error) {
      console.error("Get earnings error", error);
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
};
