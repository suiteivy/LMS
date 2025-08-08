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
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
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
  type: 'video' | 'reading' | 'quiz' | 'assignment';
}


export interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  change: string;
}

export interface Courses {
  id: number;
  title: string;
  students: number;
  completion: number;
  revenue: string;
  status: 'active' | 'draft';
  lastUpdated: string;
}

export interface Activity {
  type: 'enrollment' | 'completion' | 'question' | 'review';
  message: string;
  time: string;
}

export interface Event {
  title: string;
  date: string;
  type: 'live' | 'deadline' | 'meeting';
}

export type StatsClickHandler = (stat: StatsData) => void;
export type UserClickHandler = (user: User) => void;
export type TableRowClickHandler = (row: TableData) => void;
export type QuickActionClickHandler = (action: string) => void;
