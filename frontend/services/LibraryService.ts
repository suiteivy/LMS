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
} from "@/types/types";

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
   * Return a borrowed book
   * @param {string} borrowId
   * @param {string} returnedAt
   * @returns {Promise<void>}
   */
  static async returnBook(
    borrowId: string,
    returnedAt: string = new Date().toISOString()
  ): Promise<void> {
    try {
      await api.post(
        `/library/return/${borrowId}`,
        {
          returned_at: returnedAt,
        } as ReturnBookRequest
      );
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
      const response = await api.get<BackendBorrowedBook[]>(
        `/library/history/${studentId}`
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
      const response = await api.get<BackendBorrowedBook[]>(
        "/library/borrowed"
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
   * @param {string} borrowId - Borrow record ID
   * @param {string} newDueDate - New due date (YYYY-MM-DD format)
   * @returns {Promise<BackendBorrowedBook>}
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
   * @param {string} borrowId
   * @returns {Promise<any>}
   */
  static async rejectBorrowRequest(borrowId: string): Promise<any> {
    try {
      const response = await api.post(
        `/library/reject/${borrowId}`,
        {}
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
      const response = await api.put<{ message: string; borrow: BackendBorrowedBook }>(
        `/library/status/${borrowId}`,
        { status }
      );
      return response.data.borrow;
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
    backendBorrow: BackendBorrowedBook
  ): FrontendBorrowedBook {
    return {
      id: backendBorrow.id,
      bookTitle: backendBorrow.books?.title || "Unknown Book",
      author: backendBorrow.books?.author || "Unknown Author",
      isbn: backendBorrow.books?.isbn || "N/A",

      // Use student_id if nested user info not available
      borrowerId: backendBorrow.students?.users?.email || backendBorrow.student_id,
      borrowerName: backendBorrow.students?.users?.full_name ||
        backendBorrow.users?.full_name ||
        "Unknown",
      borrowerDisplayId: backendBorrow.student_id,
      borrowerEmail: backendBorrow.students?.users?.email ||
        backendBorrow.users?.email ||
        "",
      borrowerPhone: backendBorrow.students?.users?.phone ||
        backendBorrow.users?.phone ||
        undefined,

      borrowDate: new Date(backendBorrow.borrowed_at || (backendBorrow as any).created_at),
      dueDate: new Date(backendBorrow.due_date),
      returnDate: backendBorrow.returned_at
        ? new Date(backendBorrow.returned_at)
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
