// Library utilities and helper functions
import { FrontendBook, FrontendBorrowedBook } from '@/services/LibraryService';
import { Alert } from 'react-native';

// Additional types for utility functions
export interface DaysInfo {
  days: number;
  isOverdue: boolean;
}

export interface BorrowingLimits {
  maxBooks: number;
  maxDays: number;
}

export interface BookValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BorrowValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BookReportData {
  summary: {
    totalBooks: number;
    totalBorrowed: number;
    totalOverdue: number;
    totalReturned: number;
    utilizationRate: string;
  };
  mostBorrowedBooks: Array<{ title: string; count: number }>;
  categoryDistribution: Record<string, number>;
}

export interface BookData {
  title?: string;
  author?: string;
  isbn?: string;
  quantity?: number;
}

export interface BorrowData {
  dueDate?: string | Date;
}


// Additional types for utility functions
export interface DaysInfo {
  days: number;
  isOverdue: boolean;
}

export interface BorrowingLimits {
  maxBooks: number;
  maxDays: number;
}

export interface BookValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BorrowValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BookReportData {
  summary: {
    totalBooks: number;
    totalBorrowed: number;
    totalOverdue: number;
    totalReturned: number;
    utilizationRate: string;
  };
  mostBorrowedBooks: Array<{ title: string; count: number }>;
  categoryDistribution: Record<string, number>;
}

export interface BookData {
  title?: string;
  author?: string;
  isbn?: string;
  quantity?: number;
}

export interface BorrowData {
  dueDate?: string | Date;
}

/**
 * Library utility functions and constants
 */
export class LibraryUtils {
  
  /**
   * Calculate if a book is overdue
   * @param {Date | string} dueDate - Due date of the book
   * @returns {boolean} True if overdue
   */
  static isOverdue(dueDate: Date | string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  /**
   * Calculate days until due or days overdue
   * @param {Date | string} dueDate - Due date of the book
   * @returns {DaysInfo} { days: number, isOverdue: boolean }
   */
  static getDaysInfo(dueDate: Date | string): DaysInfo {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      days: Math.abs(diffDays),
      isOverdue: diffDays < 0,
    };
  }

  /**
   * Format date for display
   * @param {Date | string | null} date - Date to format
   * @returns {string} Formatted date string
   */
  static formatDate(date: Date | string | null): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format date for API (YYYY-MM-DD)
   * @param {Date} date - Date to format
   * @returns {string} API formatted date string
   */
  static formatDateForAPI(date: Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Get status color based on borrow status
   * @param {string} status - Borrow status
   * @returns {string} Color code
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case 'borrowed': return '#2563EB'; // blue
      case 'overdue': return '#EF4444';  // red
      case 'returned': return '#10B981'; // green
      default: return '#6B7280';         // gray
    }
  }

  /**
   * Get status background color
   * @param {string} status - Borrow status
   * @returns {string} Background color code
   */
  static getStatusBgColor(status: string): string {
    switch (status) {
      case 'borrowed': return '#DBEAFE'; // blue bg
      case 'overdue': return '#FEE2E2';  // red bg
      case 'returned': return '#D1FAE5'; // green bg
      default: return '#F3F4F6';         // gray bg
    }
  }

  /**
   * Validate ISBN format
   * @param {string} isbn - ISBN to validate
   * @returns {boolean} True if valid
   */
  static validateISBN(isbn: string): boolean {
    if (!isbn) return false;
    // Remove hyphens and spaces
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    // Check for ISBN-10 or ISBN-13
    return /^\d{10}$/.test(cleanISBN) || /^\d{13}$/.test(cleanISBN);
  }

  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @param {() => void} onConfirm - Callback for confirm action
   * @param {string} confirmText - Confirm button text
   * @param {string} cancelText - Cancel button text
   */
  static showConfirmDialog(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ): void {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel' },
        { text: confirmText, onPress: onConfirm }
      ]
    );
  }

  /**
   * Calculate fine amount (if applicable)
   * @param {Date | string} dueDate - Due date
   * @param {Date | string | null} returnDate - Return date (optional)
   * @param {number} finePerDay - Fine per day (default: 1)
   * @returns {number} Fine amount
   */
  static calculateFine(dueDate: Date | string, returnDate: Date | string | null = null, finePerDay: number = 1): number {
    const compareDate = returnDate ? new Date(returnDate) : new Date();
    const { days, isOverdue } = this.getDaysInfo(dueDate);
    
    if (!isOverdue) return 0;
    return days * finePerDay;
  }

  /**
   * Get borrowing limits by role (default values)
   * @param {string} role - User role
   * @returns {BorrowingLimits} Borrowing limits
   */
  static getBorrowingLimits(role: string): BorrowingLimits {
    const limits: Record<string, BorrowingLimits> = {
      student: { maxBooks: 3, maxDays: 14 },
      teacher: { maxBooks: 10, maxDays: 30 },
      admin: { maxBooks: 20, maxDays: 60 },
      staff: { maxBooks: 5, maxDays: 21 }
    };
    
    return limits[role?.toLowerCase()] || limits.student;
  }

  /**
   * Search books by multiple criteria
   * @param {FrontendBook[]} books - Array of books
   * @param {string} query - Search query
   * @returns {FrontendBook[]} Filtered books
   */
  static searchBooks(books: FrontendBook[], query: string): FrontendBook[] {
    if (!query) return books;
    
    const searchTerm = query.toLowerCase();
    
    return books.filter(book =>
      book.title?.toLowerCase().includes(searchTerm) ||
      book.author?.toLowerCase().includes(searchTerm) ||
      book.isbn?.includes(searchTerm) ||
      book.category?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Sort books by specified criteria
   * @param {FrontendBook[]} books - Array of books
   * @param {keyof FrontendBook} sortBy - Sort criteria
   * @param {'asc' | 'desc'} order - Sort order
   * @returns {FrontendBook[]} Sorted books
   */
static sortBooks(
  books: FrontendBook[],
  sortBy: keyof FrontendBook = 'title',
  order: 'asc' | 'desc' = 'asc'
): FrontendBook[] {
  return [...books].sort((a, b) => {
    let aValue = a[sortBy] ?? ""; // default to empty string if undefined
    let bValue = b[sortBy] ?? "";

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (order === "desc") {
      return aValue < bValue ? 1 : -1;
    }
    return aValue > bValue ? 1 : -1;
  });
}

  /**
   * Filter borrowed books by status
   * @param {FrontendBorrowedBook[]} borrowedBooks - Array of borrowed books
   * @param {string} status - Status to filter by
   * @returns {FrontendBorrowedBook[]} Filtered borrowed books
   */
  static filterBorrowedBooks(borrowedBooks: FrontendBorrowedBook[], status: string): FrontendBorrowedBook[] {
    if (!status || status === 'all') return borrowedBooks;
    return borrowedBooks.filter(book => book.status === status);
  }

  /**
   * Generate book report data
   * @param {FrontendBook[]} books - Array of books
   * @param {FrontendBorrowedBook[]} borrowedBooks - Array of borrowed books
   * @returns {BookReportData} Report data
   */
  static generateBookReport(books: FrontendBook[], borrowedBooks: FrontendBorrowedBook[]): BookReportData {
    const totalBooks = books.reduce((sum, book) => sum + book.quantity, 0);
    const totalBorrowed = borrowedBooks.filter(b => b.status === 'borrowed').length;
    const totalOverdue = borrowedBooks.filter(b => b.status === 'overdue').length;
    const totalReturned = borrowedBooks.filter(b => b.status === 'returned').length;
    
    // Most borrowed books
    const borrowCounts: Record<string, number> = {};
    borrowedBooks.forEach(borrow => {
      const title = borrow.bookTitle;
      borrowCounts[title] = (borrowCounts[title] || 0) + 1;
    });
    
    const mostBorrowedBooks = Object.entries(borrowCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([title, count]) => ({ title, count: count as number }));
    
    // Categories distribution
    const categoryDistribution: Record<string, number> = {};
    books.forEach(book => {
      const category = book.category || 'General';
      categoryDistribution[category] = (categoryDistribution[category] || 0) + book.quantity;
    });
    
    return {
      summary: {
        totalBooks,
        totalBorrowed,
        totalOverdue,
        totalReturned,
        utilizationRate: ((totalBorrowed / totalBooks) * 100).toFixed(1)
      },
      mostBorrowedBooks,
      categoryDistribution
    };
  }
}

/**
 * Library validation functions
 */
export class LibraryValidation {
  
  /**
   * Validate book data
   * @param {BookData} bookData - Book data to validate
   * @returns {BookValidationResult} { isValid: boolean, errors: Array }
   */
  static validateBook(bookData: BookData): BookValidationResult {
    const errors: string[] = [];
    
    if (!bookData.title?.trim()) {
      errors.push('Title is required');
    }
    
    if (!bookData.author?.trim()) {
      errors.push('Author is required');
    }
    
    if (!bookData.isbn?.trim()) {
      errors.push('ISBN is required');
    } else if (!LibraryUtils.validateISBN(bookData.isbn)) {
      errors.push('Invalid ISBN format');
    }
    
    if (!bookData.quantity || bookData.quantity < 1) {
      errors.push('Quantity must be at least 1');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate borrow request
   * @param {BorrowData} borrowData - Borrow request data
   * @param {FrontendBorrowedBook[]} userBorrowedBooks - User's current borrowed books
   * @param {BorrowingLimits} userLimits - User's borrowing limits
   * @returns {BorrowValidationResult} { isValid: boolean, errors: Array }
   */
  static validateBorrowRequest(borrowData: BorrowData, userBorrowedBooks: FrontendBorrowedBook[], userLimits: BorrowingLimits): BorrowValidationResult {
    const errors: string[] = [];
    
    // Check if user has reached borrow limit
    const activeBorrows = userBorrowedBooks.filter(b => 
      b.status === 'borrowed' || b.status === 'overdue'
    ).length;
    
    if (activeBorrows >= userLimits.maxBooks) {
      errors.push(`You have reached your borrowing limit of ${userLimits.maxBooks} books`);
    }
    
    // Check for overdue books
    const overdueBooks = userBorrowedBooks.filter(b => b.status === 'overdue');
    if (overdueBooks.length > 0) {
      errors.push('You have overdue books that must be returned first');
    }
    
    // Validate due date
    if (!borrowData.dueDate) {
      errors.push('Due date is required');
    } else {
      const dueDate = new Date(borrowData.dueDate);
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + userLimits.maxDays);
      
      if (dueDate > maxDate) {
        errors.push(`Due date cannot exceed ${userLimits.maxDays} days from today`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Default configuration values
 */
export const LIBRARY_CONFIG = {
  DEFAULT_BORROW_PERIOD: 14, // days
  MAX_RENEWALS: 2,
  FINE_PER_DAY: 1, // currency units
  REMINDER_DAYS_BEFORE: 3, // days before due date
  MAX_OVERDUE_DAYS: 30,
  
  BOOK_CATEGORIES: [
    'Fiction',
    'Non-Fiction',
    'Science',
    'Technology',
    'History',
    'Biography',
    'Reference',
    'Textbook',
    'Journal',
    'Magazine'
  ] as const,
  
  USER_ROLES: {
    STUDENT: 'student',
    TEACHER: 'teacher',
    ADMIN: 'admin',
    STAFF: 'staff'
  } as const,
  
  BORROW_STATUS: {
    BORROWED: 'borrowed',
    OVERDUE: 'overdue',
    RETURNED: 'returned'
  } as const
} as const;

export type BookCategory = typeof LIBRARY_CONFIG.BOOK_CATEGORIES[number];
export type UserRole = typeof LIBRARY_CONFIG.USER_ROLES[keyof typeof LIBRARY_CONFIG.USER_ROLES];
export type BorrowStatus = typeof LIBRARY_CONFIG.BORROW_STATUS[keyof typeof LIBRARY_CONFIG.BORROW_STATUS];