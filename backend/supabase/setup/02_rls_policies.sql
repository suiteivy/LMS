-- ============================================================
-- LMS DATABASE SETUP - STEP 2: RLS POLICIES
-- ============================================================
-- Run this SECOND in Supabase SQL Editor (after 01_tables.sql)
-- Sets up Row Level Security for all tables
-- ============================================================

-- Helper function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowed_books ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS POLICIES
-- ============================================================
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins/teachers read all users" ON users FOR SELECT USING (public.get_current_user_role() IN ('admin', 'teacher'));
CREATE POLICY "Allow signup insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update any user" ON users FOR UPDATE USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Admins delete users" ON users FOR DELETE USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- INSTITUTIONS POLICIES
-- ============================================================
CREATE POLICY "Everyone reads institutions" ON institutions FOR SELECT USING (true);
CREATE POLICY "Admins manage institutions" ON institutions FOR ALL USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- COURSES POLICIES
-- ============================================================
CREATE POLICY "Users read enrolled courses" ON courses FOR SELECT USING (
  auth.uid() = teacher_id OR 
  EXISTS (SELECT 1 FROM attendance WHERE user_id = auth.uid() AND course_id = courses.id)
);
CREATE POLICY "Admins/teachers read all courses" ON courses FOR SELECT USING (public.get_current_user_role() IN ('admin', 'teacher'));
CREATE POLICY "Admins/teachers create courses" ON courses FOR INSERT WITH CHECK (public.get_current_user_role() IN ('admin', 'teacher'));
CREATE POLICY "Teachers update own courses" ON courses FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Admins update any course" ON courses FOR UPDATE USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Admins/owners delete courses" ON courses FOR DELETE USING (auth.uid() = teacher_id OR public.get_current_user_role() = 'admin');

-- ============================================================
-- ASSIGNMENTS POLICIES
-- ============================================================
CREATE POLICY "Users read course assignments" ON assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM courses WHERE id = assignments.course_id AND (teacher_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM attendance WHERE user_id = auth.uid() AND course_id = courses.id)))
);
CREATE POLICY "Teachers manage own assignments" ON assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE id = assignments.course_id AND teacher_id = auth.uid())
);
CREATE POLICY "Admins manage all assignments" ON assignments FOR ALL USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- SUBMISSIONS POLICIES
-- ============================================================
CREATE POLICY "Students read own submissions" ON submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers read course submissions" ON submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = submissions.assignment_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "Admins read all submissions" ON submissions FOR SELECT USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Students create own submissions" ON submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own ungraded" ON submissions FOR UPDATE USING (auth.uid() = student_id AND graded = false);
CREATE POLICY "Teachers grade submissions" ON submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = submissions.assignment_id AND c.teacher_id = auth.uid())
);

-- ============================================================
-- ATTENDANCE POLICIES
-- ============================================================
CREATE POLICY "Students read own attendance" ON attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers read course attendance" ON attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM courses WHERE id = attendance.course_id AND teacher_id = auth.uid())
);
CREATE POLICY "Admins read all attendance" ON attendance FOR SELECT USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Students mark own login" ON attendance FOR INSERT WITH CHECK (auth.uid() = user_id AND type = 'login');
CREATE POLICY "Teachers mark attendance" ON attendance FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM courses WHERE id = attendance.course_id AND teacher_id = auth.uid())
);
CREATE POLICY "Admins manage attendance" ON attendance FOR ALL USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- LESSONS POLICIES
-- ============================================================
CREATE POLICY "Users read course lessons" ON lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM courses WHERE id = lessons.course_id AND (teacher_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM attendance WHERE user_id = auth.uid() AND course_id = courses.id)))
);
CREATE POLICY "Teachers manage own lessons" ON lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE id = lessons.course_id AND teacher_id = auth.uid())
);
CREATE POLICY "Admins manage all lessons" ON lessons FOR ALL USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- GRADES POLICIES
-- ============================================================
CREATE POLICY "Students read own grades" ON grades FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers read course grades" ON grades FOR SELECT USING (
  EXISTS (SELECT 1 FROM courses WHERE id = grades.course_id AND teacher_id = auth.uid())
);
CREATE POLICY "Admins read all grades" ON grades FOR SELECT USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Teachers manage course grades" ON grades FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE id = grades.course_id AND teacher_id = auth.uid())
);
CREATE POLICY "Admins manage all grades" ON grades FOR ALL USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- BOOKS POLICIES
-- ============================================================
CREATE POLICY "Everyone reads books" ON books FOR SELECT USING (true);
CREATE POLICY "Admins manage books" ON books FOR ALL USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- BORROWED BOOKS POLICIES
-- ============================================================
CREATE POLICY "Users read own borrowed" ON borrowed_books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all borrowed" ON borrowed_books FOR SELECT USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Admins manage borrowed" ON borrowed_books FOR ALL USING (public.get_current_user_role() = 'admin');

-- ============================================================
-- DONE! Now run STEP 3: 03_create_admin.sql
-- ============================================================
