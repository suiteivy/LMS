export interface TeacherPayment {
  id: string;
  teacher_id: string;
  amount_paid: number;
  created_at: string;
}

export const fetchTeacherEarnings = async (teacherId: string): Promise<TeacherPayment[]> => {
    const response = await fetch(`/api/bursary/teacher/earnings/${teacherId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch earnings data');
    }
    return response.json();
};