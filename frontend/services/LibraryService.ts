import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosError } from "axios";
import { api } from "./api";

// Types for API responses and requests
export interface BackendBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  total_quantity: number;
  available_quantity: number;
  category?: string;
  institution_id: string;
  created_at: string;
}

export interface FrontendBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  quantity: number;
  available: number;
  institutionId: string;
  createdAt?: string;
}

export interface BackendBorrowedBook {
  id: string;
  book: {
    title: string;
    author: string;
    isbn?: string;
  };
  student_id: string;
  student?: {
    name: string;
    email: string;
  };
  borrowed_at: string;
  due_date: string;
  returned_at?: string;
  status: "borrowed" | "overdue" | "returned";
}

export interface FrontendBorrowedBook {
  id: string;
  bookTitle: string;
  author: string;
  isbn: string;
  borrowerId: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: "borrowed" | "overdue" | "returned";
}

export interface AddBookRequest {
  title: string;
  author: string;
  isbn: string;
  total_quantity: number;
  institution_id: string;
  category?: string;
}

export interface UpdateBookRequest {
  title?: string;
  author?: string;
  isbn?: string;
  total_quantity?: number;
  category?: string;
}

export interface BorrowBookRequest {
  due_date: string;
}

export interface ReturnBookRequest {
  returned_at: string;
}

export interface ExtendDueDateRequest {
  new_due_date: string;
}

export interface APIError {
  message: string;
  status: number;
}

/**
 * Library API Wrapper
 * Handles all library-related API calls with proper error handling and token management
 */
export class LibraryAPI {
  /**
   * Get authorization header with JWT token
   * @returns {Promise<Record<string, string>>} Authorization headers
   */
  static async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const token = await AsyncStorage.getItem("authToken");
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
   * @param {AddBookRequest} bookData - Book information
   * @returns {Promise<BackendBook>} Created book data
   */
  static async addBook(bookData: AddBookRequest): Promise<BackendBook> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await api.post<BackendBook>("/library/books", bookData, {
        headers,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding book:", error);
      this.handleAPIError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Get all books in the library
   * @returns {Promise<BackendBook[]>} List of books
   */
  static async getBooks(): Promise<BackendBook[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await api.get<BackendBook[]>("/library/books", {
        headers,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching books:", error);
      this.handleAPIError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Update book information
   * @param {string} bookId - Book ID
   * @param {UpdateBookRequest} updateData - Data to update
   * @returns {Promise<BackendBook>} Updated book data
   */
  static async updateBook(
    bookId: string,
    updateData: UpdateBookRequest
  ): Promise<BackendBook> {
    try {
      const headers = await this.getAuthHeaders();
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
      this.handleAPIError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Delete a book from the library
   * @param {string} bookId - Book ID to delete
   * @returns {Promise<void>}
   */
  static async deleteBook(bookId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      await api.delete(`/library/books/${bookId}`, {
        headers,
      });
    } catch (error) {
      console.error("Error deleting book:", error);
      this.handleAPIError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Borrow a book
   * @param {string} bookId - Book ID to borrow
   * @param {string} dueDate - Due date for return (YYYY-MM-DD format)
   * @returns {Promise<BackendBorrowedBook>} Borrow record
   */
  static async borrowBook(
    bookId: string,
    dueDate: string
  ): Promise<BackendBorrowedBook> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await api.post<BackendBorrowedBook>(
        `/library/borrow/${bookId}`,
        {
          due_date: dueDate,
        } as BorrowBookRequest,
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error borrowing book:", error);
      this.handleAPIError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Return a borrowed book
   * @param {string} borrowId - Borrow record ID
   * @param {string} returnedAt - Return timestamp (ISO string)
   * @returns {Promise<BackendBorrowedBook>} Return confirmation
   */
  static async returnBook(
    borrowId: string,
    returnedAt: string = new Date().toISOString()
  ): Promise<BackendBorrowedBook> {
    try {
      const headers = await this.getAuthHeaders();
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
      this.handleAPIError(error as AxiosError);
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
      const headers = await this.getAuthHeaders();
      const response = await api.get<BackendBorrowedBook[]>(
        `/library/history/${studentId}`,
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching borrowing history:", error);
      this.handleAPIError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Get all borrowed books (for admin/librarian view)
   * @returns {Promise<BackendBorrowedBook[]>} List of all borrowed books
   */
  static async getAllBorrowedBooks(): Promise<BackendBorrowedBook[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await api.get<BackendBorrowedBook[]>(
        "/library/borrowed",
        {
          headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching borrowed books:", error);
      this.handleAPIError(error as AxiosError);
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
      const headers = await this.getAuthHeaders();
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
      this.handleAPIError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Extend due date for a borrowed book
   * @param {string} borrowId - Borrow record ID
   * @param {string} newDueDate - New due date (YYYY-MM-DD format)
   * @returns {Promise<BackendBorrowedBook>} Updated borrow record
   */
  static async extendDueDate(
    borrowId: string,
    newDueDate: string
  ): Promise<BackendBorrowedBook> {
    try {
      const headers = await this.getAuthHeaders();
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
      this.handleAPIError(error as AxiosError);
      throw error;
    }
  }

  /**
   * Handle API errors with user-friendly messages
   * @param {AxiosError} error - Axios error object
   */
  static handleAPIError(error: AxiosError): void {
    if (error.response) {
      const { status, data } = error.response;
      const errorData = data as any;

      switch (status) {
        case 400:
          console.error(
            "Bad Request:",
            errorData?.message || "Invalid request data"
          );
          break;
        case 401:
          console.error("Unauthorized:", "Please login again");
          // Could trigger logout here
          break;
        case 403:
          console.error(
            "Forbidden:",
            "You do not have permission for this action"
          );
          break;
        case 404:
          console.error("Not Found:", "Resource not found");
          break;
        case 500:
          console.error("Server Error:", "Something went wrong on the server");
          break;
        default:
          console.error(
            "API Error:",
            errorData?.message || "Unknown error occurred"
          );
      }
    } else if (error.request) {
      console.error("Network Error:", "No response received from server");
    } else {
      console.error("Error:", error.message);
    }
  }

  /**
   * Transform backend book data to frontend format
   * @param {BackendBook} backendBook - Book data from backend
   * @returns {FrontendBook} Frontend book format
   */
  static transformBookData(backendBook: BackendBook): FrontendBook {
    return {
      id: backendBook.id,
      title: backendBook.title,
      author: backendBook.author,
      isbn: backendBook.isbn,
      category: backendBook.category || "General", // Default if not provided
      quantity: backendBook.total_quantity,
      available: backendBook.available_quantity,
      institutionId: backendBook.institution_id,
      createdAt: backendBook.created_at,
    };
  }

  /**
   * Transform backend borrowed book data to frontend format
   * @param {BackendBorrowedBook} backendBorrow - Borrow data from backend
   * @returns {FrontendBorrowedBook} Frontend borrowed book format
   */
  static transformBorrowedBookData(
    backendBorrow: BackendBorrowedBook
  ): FrontendBorrowedBook {
    return {
      id: backendBorrow.id,
      bookTitle: backendBorrow.book.title,
      author: backendBorrow.book.author,
      isbn: backendBorrow.book.isbn || "",
      borrowerId: backendBorrow.student_id,
      borrowerName: backendBorrow.student?.name || "Unknown",
      borrowerEmail: backendBorrow.student?.email || "",
      borrowDate: new Date(backendBorrow.borrowed_at),
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
    setLoading(true);
    setError(null);
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
