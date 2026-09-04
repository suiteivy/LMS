import { useState } from "react";
import { AxiosError } from "axios";
import { api } from "./api";
import {
  AddBookRequest,
  BackendBook,
  BackendBorrowedBook,
  BorrowBookRequest,
  ExtendDueDateRequest,
  FrontendBook,
  FrontendBorrowedBook,
  ReturnBookRequest,
  UpdateBookRequest,
  LibrarianStaffItem,
  LibrarianAuditLogItem,
} from "@/types/types";

export interface IssueBookParams {
  bookId: string;
  studentId?: string;
  teacherId?: string;
  borrowerId?: string;
  borrowerType?: 'student' | 'teacher';
  notes?: string;
  days?: number;
  dueDate?: string;
}

export interface CirculationFilters {
  overdueOnly?: boolean;
  currentlyBorrowed?: boolean;
  borrowerId?: string;
  bookId?: string;
  librarianId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Library API Wrapper
 * Handles all library-related API calls with proper error handling and token management
 */
export class LibraryAPI {
  /**
   * Add a new book to the library
   * @param {AddBookRequest} bookData
   * @returns {Promise<BackendBook>}
   */
  static async addBook(bookData: AddBookRequest): Promise<BackendBook> {
    try {
      const response = await api.post<{ message: string; book: BackendBook }>("/library/books", bookData);
      return response.data.book;
    } catch (error) {
      console.error("Error adding book:", error);
      throw error;
    }
  }

  /**
   * Get all books in the library
   * @returns {Promise<BackendBook[]>}
   */
  static async getBooks(): Promise<BackendBook[]> {
    try {
      const response = await api.get<BackendBook[]>("/library/books");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("Error fetching books:", error);
      throw error;
    }
  }

  /**
   * Update book information
   * @param {string} bookId
   * @param {UpdateBookRequest} updateData
   * @returns {Promise<BackendBook>}
   */
  static async updateBook(
    bookId: string,
    updateData: UpdateBookRequest
  ): Promise<BackendBook> {
    try {
      const response = await api.put<{ message: string; book: BackendBook }>(
        `/library/books/${bookId}`,
        updateData
      );
      return response.data.book;
    } catch (error) {
      console.error("Error updating book:", error);
      throw error;
    }
  }

  /**
   * Delete a book from the library
   * @param {string} bookId
   * @returns {Promise<void>}
   */
  static async deleteBook(bookId: string): Promise<void> {
    try {
      await api.delete(`/library/books/${bookId}`);
    } catch (error) {
      console.error("Error deleting book:", error);
      throw error;
    }
  }

  static async borrowBook(
    bookId: string,
    days: number = 14
  ): Promise<BackendBorrowedBook> {
    try {
      const response = await api.post<{ message: string; borrow: BackendBorrowedBook; due_date: string }>(
        "/library/borrow",
        {
          bookId,
          days,
        }
      );
      return response.data.borrow;
    } catch (error) {
      console.error("Error borrowing book:", error);
      throw error;
    }
  }

  /**
   * Issue a book to a student or teacher (Librarian/Main Admin only)
   */
  static async issueBook(
    params: IssueBookParams | string,
    studentId?: string,
    notes: string = "",
    days: number = 14
  ): Promise<any> {
    try {
      const payload = typeof params === 'string'
        ? { bookId: params, studentId, notes, days }
        : params;
      const response = await api.post("/library/issue", payload);
      return response.data;
    } catch (error) {
      console.error("Error issuing book:", error);
      throw error;
    }
  }

  /**
   * Return a borrowed book (Librarian/Main Admin only)
   */
  static async returnBook(
    borrowId: string,
    notes?: string,
    condition?: string
  ): Promise<any> {
    try {
      const response = await api.post(`/library/return/${borrowId}`, {
        notes,
        condition,
      });
      return response.data;
    } catch (error) {
      console.error("Error returning book:", error);
      throw error;
    }
  }

  /**
   * Get borrowing history for a student or own history
   */
  static async getBorrowingHistory(
    studentId?: string
  ): Promise<BackendBorrowedBook[]> {
    try {
      const url = studentId ? `/library/history/${studentId}` : "/library/history";
      const response = await api.get<BackendBorrowedBook[]>(url);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("Error fetching borrowing history:", error);
      throw error;
    }
  }

  /**
   * Get borrowing history for a parent's linked student
   */
  static async getParentStudentBorrowingHistory(
    studentId: string
  ): Promise<BackendBorrowedBook[]> {
    try {
      const response = await api.get<BackendBorrowedBook[]>(`/parent/student/${studentId}/library`);
      return response.data;
    } catch (error) {
      console.error("Error fetching parent-student borrowing history:", error);
      throw error;
    }
  }

  /**
   * Get all borrowed books (Circulation overview with filters)
   */
  static async getAllBorrowedBooks(
    filters?: CirculationFilters
  ): Promise<BackendBorrowedBook[]> {
    try {
      const response = await api.get<BackendBorrowedBook[]>(
        "/library/borrowed",
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching borrowed books:", error);
      throw error;
    }
  }

  /**
   * Get list of staff and their librarian designation status (Main Admin only)
   */
  static async getLibrariansList(): Promise<LibrarianStaffItem[]> {
    try {
      const response = await api.get<LibrarianStaffItem[]>("/library/librarians");
      return response.data;
    } catch (error) {
      console.error("Error fetching librarians list:", error);
      throw error;
    }
  }

  /**
   * Toggle or set librarian designation for a user (Main Admin only)
   */
  static async toggleLibrarianDesignation(
    userId: string,
    action?: 'grant' | 'revoke',
    reason?: string
  ): Promise<{ message: string; is_librarian: boolean; user_id: string }> {
    try {
      const response = await api.post<{ message: string; is_librarian: boolean; user_id: string }>(
        "/library/librarians/toggle",
        { userId, action, reason }
      );
      return response.data;
    } catch (error) {
      console.error("Error toggling librarian designation:", error);
      throw error;
    }
  }

  /**
   * Get librarian designation audit trail (Librarian/Admin only)
   */
  static async getLibrarianAuditLogs(): Promise<LibrarianAuditLogItem[]> {
    try {
      const response = await api.get<LibrarianAuditLogItem[]>("/library/librarians/audit");
      return response.data;
    } catch (error) {
      console.error("Error fetching librarian audit logs:", error);
      throw error;
    }
  }

  /**
   * Check current user's librarian and admin designation
   */
  static async getMyDesignation(): Promise<{
    isLibrarian: boolean;
    isMainAdmin: boolean;
    role: string;
    userId: string;
  }> {
    try {
      const response = await api.get<{
        isLibrarian: boolean;
        isMainAdmin: boolean;
        role: string;
        userId: string;
      }>("/library/me/designation");
      return response.data;
    } catch (error) {
      console.error("Error fetching user designation:", error);
      throw error;
    }
  }

  /**
   * Send reminder to student about overdue book
   */
  static async sendReminder(borrowId: string): Promise<{ message: string }> {
    try {
      const response = await api.post<{ message: string }>(
        `/library/reminder/${borrowId}`,
        {}
      );
      return response.data;
    } catch (error) {
      console.error("Error sending reminder:", error);
      throw error;
    }
  }

  /**
   * Extend due date for a borrowed book
   */
  static async extendDueDate(
    borrowId: string,
    newDueDate: string
  ): Promise<any> {
    try {
      const response = await api.put(
        `/library/extend/${borrowId}`,
        {
          new_due_date: newDueDate,
        } as ExtendDueDateRequest
      );
      return response.data;
    } catch (error) {
      console.error("Error extending due date:", error);
      throw error;
    }
  }

  /**
   * Reject a borrow request
   */
  static async rejectBorrowRequest(borrowId: string): Promise<any> {
    try {
      const response = await api.post(`/library/reject/${borrowId}`, {});
      return response.data;
    } catch (error) {
      console.error("Error rejecting borrow request:", error);
      throw error;
    }
  }

  /**
   * Update borrow status
   */
  static async updateBorrowStatus(
    borrowId: string,
    status: "borrowed" | "returned" | "overdue"
  ): Promise<BackendBorrowedBook> {
    try {
      const response = await api.put<{ message: string; borrow: BackendBorrowedBook }>(
        `/library/status/${borrowId}`,
        {
          status,
        }
      );
      return response.data.borrow;
    } catch (error) {
      console.error("Error updating borrow status:", error);
      throw error;
    }
  }

  /**
   * Transform backend book data to frontend format
   */
  static transformBookData(backendBook: BackendBook): FrontendBook {
    return {
      id: backendBook.id,
      title: backendBook.title,
      author: backendBook.author,
      isbn: backendBook.isbn,
      category: backendBook.category || "General",
      quantity: backendBook.total_quantity,
      available: backendBook.available_quantity,
      institutionId: backendBook.institution_id,
      createdAt: backendBook.created_at,
    };
  }

  /**
   * Transform backend borrowed book data to frontend format
   */
  static transformBorrowedBookData(
    backendBorrow: BackendBorrowedBook
  ): FrontendBorrowedBook {
    const student = backendBorrow.students;
    const teacher = backendBorrow.teachers;
    const user = student?.users || teacher?.users || backendBorrow.users;

    return {
      id: backendBorrow.id,
      bookTitle: backendBorrow.books?.title || "Unknown Book",
      author: backendBorrow.books?.author || "Unknown Author",
      isbn: backendBorrow.books?.isbn || "N/A",

      borrowerId: user?.email || backendBorrow.student_id || backendBorrow.id,
      borrowerName: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.full_name || "Unknown"),
      borrowerFirstName: user?.first_name,
      borrowerLastName: user?.last_name,
      borrowerDisplayId: backendBorrow.student_id,
      borrowerEmail: user?.email || "",
      borrowerPhone: user?.phone,
      borrowerType: student ? 'student' : (teacher ? 'teacher' : 'user'),
      
      gradeLevel: student?.grade_level,
      formLevel: student?.form_level,
      department: teacher?.department,
      position: teacher?.position,

      borrowDate: new Date(backendBorrow.borrowed_at || (backendBorrow as any).created_at),
      dueDate: new Date(backendBorrow.due_date),
      returnDate: backendBorrow.returned_at
        ? new Date(backendBorrow.returned_at)
        : undefined,
      status: backendBorrow.status,
      notes: backendBorrow.notes,
      issuedBy: backendBorrow.issued_by,
      returnedBy: backendBorrow.returned_by,
      returnNotes: backendBorrow.return_notes,
      issuerName: backendBorrow.issuer?.full_name,
      returnerName: backendBorrow.returner?.full_name,
    };
  }
}

/**
 * Custom hook for library operations with loading states
 */
export const useLibraryAPI = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const executeWithLoading = async <T>(
    apiCall: () => Promise<T>
  ): Promise<T> => {
    setError(null);
    setLoading(true);
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    executeWithLoading,
    clearError: (): void => setError(null),
  };
};
