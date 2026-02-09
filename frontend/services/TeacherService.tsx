// frontend/services/teacherService.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classId: string;
  schoolId: string;
  teacherId: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
  classId: string;
};

type Class = {
  id: string;
  name: string;
  schoolId: string;
};

export const fetchTeacherData = async (
  teacherId: string,
  schoolId: string,
  type: 'assignments' | 'students' | 'classes'
): Promise<Assignment[] | Student[] | Class[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/teachers/${teacherId}/${type}`, {
      params: { schoolId },
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if needed
        // 'Authorization': `Bearer ${token}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    throw new Error(`Failed to fetch ${type}`);
  }
};

export const createAssignment = async (assignmentData: {
  title: string;
  description: string;
  dueDate: string;
  classId: string;
  teacherId: string;
  schoolId: string;
}): Promise<Assignment> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/assignments`, assignmentData, {
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw new Error('Failed to create assignment');
  }
};

export const updateTeacherProfile = async (
  teacherId: string,
  profileData: {
    name?: string;
    bio?: string;
  }
): Promise<void> => {
  try {
    await axios.patch(`${API_BASE_URL}/teachers/${teacherId}`, profileData, {
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    throw new Error('Failed to update teacher profile');
  }
};