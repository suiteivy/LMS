import { useState } from "react";
import { AxiosError } from "axios";
import { api } from "./api";
import { supabase } from "@/libs/supabase";
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
} from "@/types/types";

/**
 * Library API Wrapper
 * Handles all library-related API calls with proper error handling and token management
 */
export class LibraryAPI {
  /**
   * Get authorization header with JWT token
   * @returns {Promise<Record<string, string>>}
   */
  static async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("No authentication token found");
      }
      return {
        Authorization: `Bearer ${token}`,
      };
    } catch (error) {
      console.error("Error getting auth headers:", error);
      throw error;
    }
  }

  /**
   * Add a new book to the library
   * @param {AddBookRequest} bookData
   * @returns {Promise<BackendBook>}
   */
  static async addBook(bookData: AddBookRequest): Promise<BackendBook> {
    try {
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.post<BackendBook>("/library/books", bookData, {
        headers,
      });
      return response.data;
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
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.get<BackendBook[]>("/library/books", {
        headers,
      });
      return response.data;
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
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.put<BackendBook>(
        `/library/books/${bookId}`,
        updateData,
        {
          headers,
        }
      );
      return response.data;
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
      const headers = await LibraryAPI.getAuthHeaders();
      await api.delete(`/library/books/${bookId}`, {
        headers,
      });
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
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.post<BackendBorrowedBook>(
        "/library/borrow",
        {
          bookId,
          days,
        },
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error borrowing book:", error);
      throw error;
    }
  }

  /**
   * Return a borrowed book
   * @param {string} borrowId
   * @param {string} returnedAt
   * @returns {Promise<BackendBorrowedBook>}
   */
  static async returnBook(
    borrowId: string,
    returnedAt: string = new Date().toISOString()
  ): Promise<BackendBorrowedBook> {
    try {
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.post<BackendBorrowedBook>(
        `/library/return/${borrowId}`,
        {
          returned_at: returnedAt,
        } as ReturnBookRequest,
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error returning book:", error);
      throw error;
    }
  }

  /**
   * Get borrowing history for a student
   * @param {string} studentId - Student ID
   * @returns {Promise<BackendBorrowedBook[]>} Borrowing history
   */
  static async getBorrowingHistory(
    studentId: string
  ): Promise<BackendBorrowedBook[]> {
    try {
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.get<BackendBorrowedBook[]>(
        `/library/history/${studentId}`,
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching borrowing history:", error);
      throw error;
    }
  }

  /**
   * Get all borrowed books (for admin/librarian view)
   * @returns {Promise<BackendBorrowedBook[]>} List of all borrowed books
   */
  static async getAllBorrowedBooks(): Promise<BackendBorrowedBook[]> {
    try {
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.get<BackendBorrowedBook[]>(
        "/library/borrowed",
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching borrowed books:", error);
      throw error;
    }
  }

  /**
   * Send reminder to student about overdue book
   * @param {string} borrowId - Borrow record ID
   * @returns {Promise<{ message: string }>} Reminder sent confirmation
   */
  static async sendReminder(borrowId: string): Promise<{ message: string }> {
    try {
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.post<{ message: string }>(
        `/library/reminder/${borrowId}`,
        {},
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error sending reminder:", error);
      throw error;
    }
  }

  /**
   * Extend due date for a borrowed book
   * @param {string} borrowId - Borrow record ID
   * @param {string} newDueDate - New due date (YYYY-MM-DD format)
   * @returns {Promise<BackendBorrowedBook>}
   */
  static async extendDueDate(
    borrowId: string,
    newDueDate: string
  ): Promise<BackendBorrowedBook> {
    try {
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.put<BackendBorrowedBook>(
        `/library/extend/${borrowId}`,
        {
          new_due_date: newDueDate,
        } as ExtendDueDateRequest,
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error extending due date:", error);
      throw error;
    }
  }

  /**
   * Reject a borrow request
   * @param {string} borrowId
   * @returns {Promise<any>}
   */
  static async rejectBorrowRequest(borrowId: string): Promise<any> {
    try {
      const headers = await LibraryAPI.getAuthHeaders();
      const response = await api.post(
        `/library/reject/${borrowId}`,
        {},
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error("Error rejecting borrow request:", error);
      throw error;
    }
  }

  /**
   * Update borrow status (waiting -> ready_for_pickup -> borrowed)
   * @param {string} borrowId
   * @param {string} status
   * @returns {Promise<BackendBorrowedBook>}
   */
  static async updateBorrowStatus(
    borrowId: string,
    status: 'ready_for_pickup' | 'borrowed'
  ): Promise<BackendBorrowedBook> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await api.put<BackendBorrowedBook>(
        `/library/status/${borrowId}`,
        { status },
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error("Error updating borrow status:", error);
      throw error;
    }
  }

  /**
   * Transform backend book data to frontend format
   * @param {BackendBook} backendBook
   * @returns {FrontendBook}
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
   * @param {BackendBorrowedBook} backendBorrow
   * @returns {FrontendBorrowedBook}
   */
  static transformBorrowedBookData(
    backendBorrow: any // Using any to avoid strict type mismatch during migration
  ): FrontendBorrowedBook {
    return {
      id: backendBorrow.id,
      bookTitle: backendBorrow.library_items?.title || "Unknown Book",
      author: backendBorrow.library_items?.author || "Unknown Author",
      isbn: backendBorrow.library_items?.isbn || "N/A",
      borrowerId: backendBorrow.user_id,
      borrowerName: backendBorrow.users?.full_name || "Unknown",
      borrowerDisplayId: backendBorrow.user_id,
      borrowerEmail: backendBorrow.users?.email || "",
      borrowerPhone: backendBorrow.users?.phone || undefined,
      borrowDate: new Date(backendBorrow.borrow_date || backendBorrow.created_at),
      dueDate: new Date(backendBorrow.due_date),
      returnDate: backendBorrow.return_date
        ? new Date(backendBorrow.return_date)
        : undefined,
      status: backendBorrow.status,
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
