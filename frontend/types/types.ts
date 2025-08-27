/*
 *
 *  Type definitions for dashboard components
 */

import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { TextInputProps } from "react-native";

/*
 * User-related types
 */

export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "inactive";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinDate: string;
  avatar?: string;
  lastActive?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  avatar?: string;
}

/*
 * Dashboard stats
 */
export type StatsColor =
  | "blue"
  | "green"
  | "purple"
  | "yellow"
  | "red"
  | "gray";

export interface StatsData {
  title: string;
  value: string;
  icon: string;
  color: StatsColor;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  description?: string;
}

export interface CourseFormData {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  level: string;
  language: string;
  price: string;
  duration: string;
  maxStudents: string;
  startDate: string;
  tags: string[];
  prerequisites: string;
  learningOutcomes: string[];
  courseImage: string | null;
  isPublic: boolean;
  allowDiscussions: boolean;
  certificateEnabled: boolean;
}

// ----------------------
// Table-related types
// ----------------------

export interface TableColumn {
  key: string;
  title: string;
  width?: "flex-1" | "flex-2" | "flex-3" | string;
  sortable?: boolean;
  render?: (value: any, row: TableData) => ReactNode;
  align?: "left" | "center" | "right";
}

export interface TableData {
  [key: string]: any;
}

export interface BaseComponentProps {
  className?: string;
  testID?: string;
}

export interface ImageUploadProps {
  imageUri: string | null;
  onImageSelect: (uri: string | null) => void;
}

export interface SettingsToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export interface IconInputProps extends TextInputProps {
  iconName: keyof typeof Ionicons.glyphMap;
}

export interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export interface LearningOutcomesProps {
  outcomes: string[];
  onUpdateOutcome: (index: number, value: string) => void;
  onAddOutcome: () => void;
  onRemoveOutcome: (index: number) => void;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced" | "all";
  instructor: {
    name: string;
    avatar?: string;
  };
  price: number;
  originalPrice?: number;
  duration: string;
  studentsCount: number;
  rating: number;
  reviewsCount: number;
  image: string;
  tags: string[];
  isEnrolled: boolean;
  progress?: number;
  lastAccessed?: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
  isLocked: boolean;
  type: "video" | "reading" | "quiz" | "assignment";
}

// interfaces for bursary features
export interface Payment {
  id: string;
  student_id: string;
  student_name: string;
  amount: number;
  payment_date: string;
  payment_method: "cash" | "bank_transfer" | "mobile_money";
  status: "pending" | "completed" | "failed";
  reference_number?: string;
  notes?: string;
}

export interface TeacherPayout {
  id: string;
  teacher_id: string;
  teacher_name: string;
  amount: number;
  hours_taught: number;
  rate_per_hour: number;
  period_start: string;
  period_end: string;
  status: "pending" | "paid" | "processing";
  payment_date?: string;
}

export interface FeeStructure {
  id: string;
  course_id: string;
  course_name: string;
  base_fee: number;
  registration_fee: number;
  material_fee: number;
  teacher_rate: number;
  bursary_percentage: number;
  effective_date: string;
  is_active: boolean;
}

export interface AdminDashboardProps extends BaseComponentProps {
  statsData?: StatsData[];
  recentUsers?: User[];
  allUsers?: User[];
  payments?: Payment[];
  teacherPayouts?: TeacherPayout[];
  feeStructures?: FeeStructure[];
  statsLoading?: boolean;
  usersLoading?: boolean;
  tableLoading?: boolean;
  paymentsLoading?: boolean;
  payoutsLoading?: boolean;
  feeStructuresLoading?: boolean;
  onStatsPress?: (stat: StatsData) => void;
  onUserPress?: (user: User) => void;
  onViewAllUsersPress?: () => void;
  onRefresh?: () => void;
  showRecentUsers?: boolean;
  showUsersTable?: boolean;
  showPaymentManagement?: boolean;
  showTeacherPayouts?: boolean;
  showFeeStructure?: boolean;
  maxRecentUsers?: number;
}

// Book data structure
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  quantity: number;
  available: number;
}

// Props accepted by this component
export interface AddUpdateDeleteBooksFormProps {
  books?: Book[]; // all library books
  onAddBook?: (book: Omit<Book, "id">) => void; // handler to add a book
  onUpdateBook?: (id: string, book: Partial<Book>) => void; // handler to update
  onDeleteBook?: (id: string) => void; // handler to delete
}

// Defines a borrowed book record
export interface BorrowedBook {
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

// export interface BorrowedBooks {
//   id: string;
//   bookTitle: string;
//   author: string;
//   isbn: string;
//   borrowerName: string;
//   borrowerEmail: string;
//   borrowerPhone?: string;
//   borrowerId: string;
//   borrowDate: Date;
//   dueDate: Date;
//   returnDate?: Date;
//   status: "borrowed" | "overdue" | "returned";
//   fineAmount?: number;
//   renewalCount?: number;
//   maxRenewals?: number;
// }
// export interface Book {
//   id: string;
//   title: string;
//   author: string;
//   isbn: string;
//   category: string;
//   quantity: number;
//   available: number;
// }

// export interface BorrowedBook {
//   id: string;
//   bookTitle: string;
//   author: string;
//   isbn: string;
//   borrowerName: string;
//   borrowerEmail: string;
//   borrowDate: Date;
//   dueDate: Date;
//   status: "borrowed" | "overdue" | "returned";
// }

export interface UserRoles {
  id: string;
  name: string;
  description: string;
  maxBooks: number;
  borrowDuration: number;
  canRenew: boolean;
  maxRenewals: number;
  finePerDay: number;
  isActive: boolean;
}

// Props for the BorrowedBooksOverview component
export interface BorrowedBooksOverviewProps {
  borrowedBooks?: BorrowedBook[];
  onReturnBook?: (borrowId: string) => void;
  onExtendDueDate?: (borrowId: string, newDueDate: Date) => void;
  onSendReminder?: (borrowId: string) => void;
}

export type StatsClickHandler = (stat: StatsData) => void;
export type UserClickHandler = (user: User) => void;
export type TableRowClickHandler = (row: TableData) => void;
export type QuickActionClickHandler = (action: string) => void;
