# Architecture Overview

## System Context
The Learning Management System (LMS) is a cross-platform mobile application designed to facilitate interaction between Students, Teachers, and Administrators. It manages courses, enrollments, grading, attendance, and library resources.

## Tech Stack
- **Frontend**: React Native with Expo (Managed Workflow)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **State Management**: React Context API
- **Styling**: NativeWind (Tailwind CSS for React Native)

## High-Level Architecture
[Mobile App] <--> [Supabase Client] <--> [PostgreSQL Database]
                                     ^
                                     |
                                  [Auth]

## Key Modules
1.  **Authentication**: Role-based handling via Supabase Auth + Public Users table.
2.  **User Management**: Profiles for Students, Teachers, Admins, and Parents.
3.  **Academic**: Subjects, Classes, Enrollments, Grades, Attendance.
4.  **Admin Tools**: Finance, Library Management, System Analytics.

## Data Flow
- **Reads**: Direct Supabase queries with RLS policies ensuring data security.
- **Writes**: Direct Supabase mutations or Edge Functions for complex logic.
- **Real-time**: Supabase Subscriptions for live dashboard updates.
