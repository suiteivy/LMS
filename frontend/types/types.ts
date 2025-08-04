/*
 *
 *  Type definitions for dashboard components
 */

import { ReactNode } from "react";

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

export type StatsClickHandler = (stat: StatsData) => void;
export type UserClickHandler = (user: User) => void;
export type TableRowClickHandler = (row: TableData) => void;
export type QuickActionClickHandler = (action: string) => void;
