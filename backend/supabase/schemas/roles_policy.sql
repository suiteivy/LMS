-- ==========================================
-- HELPER FUNCTION FOR RLS POLICIES
-- ==========================================
-- This function allows policies to check the current user's role
-- without causing infinite recursion on the users table.
-- It uses SECURITY DEFINER to bypass RLS when querying the users table.

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- ==========================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- USERS TABLE POLICIES
-- ==========================================

-- SELECT: Users can read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- SELECT: Admins and teachers can read all user data
CREATE POLICY "Admins and teachers can read all user data"
ON users FOR SELECT
USING (public.get_current_user_role() IN ('admin', 'teacher'));

-- INSERT: Only admins can create users
CREATE POLICY "Only admins can create users"
ON users FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Users can update their own data
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- UPDATE: Only admins can update any user's data
CREATE POLICY "Admins can update any user"
ON users FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Only admins can delete users
CREATE POLICY "Only admins can delete users"
ON users FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- COURSES TABLE POLICIES
-- ==========================================

-- SELECT: Users can read associated courses
CREATE POLICY "Users can read associated courses"
ON courses FOR SELECT
USING (
  auth.uid() = teacher_id
  OR EXISTS (
    SELECT 1 FROM submissions
    WHERE student_id = auth.uid() AND assignment_id IN (
      SELECT id FROM assignments WHERE course_id = courses.id
    )
  )
  OR EXISTS (
    SELECT 1 FROM attendance
    WHERE user_id = auth.uid() AND course_id = courses.id
  )
);

-- SELECT: Admins and teachers can read all courses
CREATE POLICY "Admins and teachers can read all courses"
ON courses FOR SELECT
USING (public.get_current_user_role() IN ('admin', 'teacher'));

-- INSERT: Only admins and teachers can create courses
CREATE POLICY "Only admins and teachers can create courses"
ON courses FOR INSERT
WITH CHECK (public.get_current_user_role() IN ('admin', 'teacher'));

-- UPDATE: Teachers can update own courses
CREATE POLICY "Teachers can update own courses"
ON courses FOR UPDATE
USING (auth.uid() = teacher_id);

-- UPDATE: Admins can update any course
CREATE POLICY "Admins can update any course"
ON courses FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Only admins and course owners can delete courses
CREATE POLICY "Only admins and course owners can delete courses"
ON courses FOR DELETE
USING (
  auth.uid() = teacher_id
  OR public.get_current_user_role() = 'admin'
);

-- ==========================================
-- ASSIGNMENTS TABLE POLICIES
-- ==========================================

-- SELECT: Users can read assignments for their courses
CREATE POLICY "Users can read assignments for their courses"
ON assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = assignments.course_id
    AND (
      teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM submissions
        WHERE student_id = auth.uid() AND assignment_id IN (
          SELECT id FROM assignments WHERE course_id = courses.id
        )
      )
      OR EXISTS (
        SELECT 1 FROM attendance
        WHERE user_id = auth.uid() AND course_id = courses.id
      )
    )
  )
);

-- INSERT: Teachers can create assignments for their courses
CREATE POLICY "Teachers can create assignments for their courses"
ON assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = assignments.course_id AND teacher_id = auth.uid()
  )
);

-- INSERT: Admins can create any assignment
CREATE POLICY "Admins can create any assignment"
ON assignments FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Teachers can update assignments for their courses
CREATE POLICY "Teachers can update assignments for their courses"
ON assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = assignments.course_id AND teacher_id = auth.uid()
  )
);

-- UPDATE: Admins can update any assignment
CREATE POLICY "Admins can update any assignment"
ON assignments FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Teachers can delete assignments for their courses
CREATE POLICY "Teachers can delete assignments for their courses"
ON assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = assignments.course_id AND teacher_id = auth.uid()
  )
);

-- DELETE: Admins can delete any assignment
CREATE POLICY "Admins can delete any assignment"
ON assignments FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- SUBMISSIONS TABLE POLICIES
-- ==========================================

-- SELECT: Students can read own submissions
CREATE POLICY "Students can read own submissions"
ON submissions FOR SELECT
USING (auth.uid() = student_id);

-- SELECT: Teachers can read submissions for their courses
CREATE POLICY "Teachers can read submissions for their courses"
ON submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN courses ON assignments.course_id = courses.id
    WHERE assignments.id = submissions.assignment_id
    AND courses.teacher_id = auth.uid()
  )
);

-- SELECT: Admins can read all submissions
CREATE POLICY "Admins can read all submissions"
ON submissions FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- INSERT: Students can create own submissions
CREATE POLICY "Students can create own submissions"
ON submissions FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- UPDATE: Students can update own submissions
CREATE POLICY "Students can update own submissions"
ON submissions FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (graded = false);

-- UPDATE: Teachers can update submissions for grading
CREATE POLICY "Teachers can update submissions for grading"
ON submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN courses ON assignments.course_id = courses.id
    WHERE assignments.id = submissions.assignment_id
    AND courses.teacher_id = auth.uid()
  )
);

-- UPDATE: Admins can update any submission
CREATE POLICY "Admins can update any submission"
ON submissions FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- ATTENDANCE TABLE POLICIES
-- ==========================================

-- SELECT: Students can read own attendance
CREATE POLICY "Students can read own attendance"
ON attendance FOR SELECT
USING (auth.uid() = user_id);

-- SELECT: Teachers can read attendance for their courses
CREATE POLICY "Teachers can read attendance for their courses"
ON attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = attendance.course_id AND teacher_id = auth.uid()
  )
);

-- SELECT: Admins can read all attendance
CREATE POLICY "Admins can read all attendance"
ON attendance FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- INSERT: Students can mark own attendance
CREATE POLICY "Students can mark own attendance"
ON attendance FOR INSERT
WITH CHECK (auth.uid() = user_id AND type = 'login');

-- INSERT: Teachers can mark attendance for their courses
CREATE POLICY "Teachers can mark attendance for their courses"
ON attendance FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = attendance.course_id AND teacher_id = auth.uid()
  )
);

-- INSERT: Admins can mark any attendance
CREATE POLICY "Admins can mark any attendance"
ON attendance FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Admins can update any attendance
CREATE POLICY "Admins can update any attendance"
ON attendance FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Admins can delete any attendance
CREATE POLICY "Admins can delete any attendance"
ON attendance FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- LESSONS TABLE POLICIES
-- ==========================================

-- SELECT: Users can read lessons for their courses
CREATE POLICY "Users can read lessons for their courses"
ON lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = lessons.course_id
    AND (
      teacher_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM submissions
        WHERE student_id = auth.uid() AND assignment_id IN (
          SELECT id FROM assignments WHERE course_id = courses.id
        )
      )
      OR EXISTS (
        SELECT 1 FROM attendance
        WHERE user_id = auth.uid() AND course_id = courses.id
      )
    )
  )
);

-- INSERT: Teachers can create lessons for their courses
CREATE POLICY "Teachers can create lessons for their courses"
ON lessons FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = lessons.course_id AND teacher_id = auth.uid()
  )
);

-- INSERT: Admins can create any lesson
CREATE POLICY "Admins can create any lesson"
ON lessons FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Teachers can update lessons for their courses
CREATE POLICY "Teachers can update lessons for their courses"
ON lessons FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = lessons.course_id AND teacher_id = auth.uid()
  )
);

-- UPDATE: Admins can update any lesson
CREATE POLICY "Admins can update any lesson"
ON lessons FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Teachers can delete lessons for their courses
CREATE POLICY "Teachers can delete lessons for their courses"
ON lessons FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = lessons.course_id AND teacher_id = auth.uid()
  )
);

-- DELETE: Admins can delete any lesson
CREATE POLICY "Admins can delete any lesson"
ON lessons FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- GRADES TABLE POLICIES
-- ==========================================

-- SELECT: Students can read own grades
CREATE POLICY "Students can read own grades"
ON grades FOR SELECT
USING (auth.uid() = student_id);

-- SELECT: Teachers can read grades for their courses
CREATE POLICY "Teachers can read grades for their courses"
ON grades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = grades.course_id AND teacher_id = auth.uid()
  )
);

-- SELECT: Admins can read all grades
CREATE POLICY "Admins can read all grades"
ON grades FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- INSERT: Teachers can create grades for their courses
CREATE POLICY "Teachers can create grades for their courses"
ON grades FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = grades.course_id AND teacher_id = auth.uid()
  )
);

-- INSERT: Admins can create any grade
CREATE POLICY "Admins can create any grade"
ON grades FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Teachers can update grades for their courses
CREATE POLICY "Teachers can update grades for their courses"
ON grades FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE id = grades.course_id AND teacher_id = auth.uid()
  )
);

-- UPDATE: Admins can update any grade
CREATE POLICY "Admins can update any grade"
ON grades FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Admins can delete any grade
CREATE POLICY "Admins can delete any grade"
ON grades FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- INSTITUTIONS TABLE POLICIES
-- ==========================================

-- SELECT: Everyone can read institutions
CREATE POLICY "Everyone can read institutions"
ON institutions FOR SELECT
USING (true);

-- INSERT: Only admins can insert institutions
CREATE POLICY "Only admins can insert institutions"
ON institutions FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Only admins can update institutions
CREATE POLICY "Only admins can update institutions"
ON institutions FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Only admins can delete institutions
CREATE POLICY "Only admins can delete institutions"
ON institutions FOR DELETE
USING (public.get_current_user_role() = 'admin');
