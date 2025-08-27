import apiClient from '../utils/apiClient'; 

export interface BorrowRecord {
  id: string;
  bookTitle: string;
  borrowDate: string;
  dueDate: string;
  returned: boolean;
}

export const fetchBorrowHistory = async (studentId: string): Promise<BorrowRecord[]> => {
  const response = await apiClient.get(`/students/${studentId}/borrow-history`);
  return response.data;
};