-- ============================================================
-- LMS DATABASE SETUP - STEP 1: TABLES
-- ============================================================
-- Run this FIRST in Supabase SQL Editor
-- Creates all tables in the correct order (respecting foreign keys)
-- ============================================================

-- 1. Institutions (no dependencies)
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (depends on institutions)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('admin', 'student', 'teacher')) NOT NULL,
  institution_id UUID REFERENCES institutions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Courses (depends on users, institutions)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES users(id),
  institution_id UUID REFERENCES institutions(id),
  fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Assignments (depends on courses)
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Submissions (depends on assignments, users)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id),
  student_id UUID REFERENCES users(id),
  file_url TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  graded BOOLEAN DEFAULT FALSE,
  grade NUMERIC,
  feedback TEXT
);

-- 6. Attendance (depends on users, courses)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  login_date DATE NOT NULL,
  session_start TIMESTAMP,
  session_end TIMESTAMP,
  marked_by UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('login', 'manual')) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lessons (depends on courses)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  title TEXT NOT NULL,
  content TEXT,
  scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Grades (depends on users, courses)
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  total_grade NUMERIC,
  feedback TEXT,
  graded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Books (depends on institutions)
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  total_quantity INT NOT NULL DEFAULT 1,
  available_quantity INT NOT NULL DEFAULT 1,
  institution_id UUID REFERENCES institutions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Borrowed Books (depends on books, users, institutions)
CREATE TABLE IF NOT EXISTS borrowed_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date DATE,
  returned_at TIMESTAMP NULL,
  status TEXT DEFAULT 'borrowed',
  institution_id UUID REFERENCES institutions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DONE! Now run STEP 2: 02_rls_policies.sql
-- ============================================================
