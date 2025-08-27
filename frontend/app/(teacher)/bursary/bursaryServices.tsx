export interface PaymentRecord {
  id: string;
  date: Date;
  amount: number;
  status: 'pending' | 'completed';
  reference: string;
}

export const fetchTeacherEarnings = async (teacherId: string): Promise<{
  currentMonth: number;
  totalBalance: number;
  pending: number;
  payments: PaymentRecord[];
}> => {

    const response = await fetch(`/api/teachers/${teacherId}/earnings`);
    if (!response.ok) {
      throw new Error('Failed to fetch earnings data');
    }
    return response.json();
};