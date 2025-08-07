-- Migration for course filtering API endpoints

-- Ensure RLS is enabled on all relevant tables
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignments ENABLE ROW LEVEL SECURITY;

-- Create or replace policy for students to view courses they're enrolled in
DROP POLICY IF EXISTS "Students can view enrolled courses" ON courses;
CREATE POLICY "Students can view enrolled courses"
ON courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'student'
  )
  AND (
    EXISTS (
      SELECT 1 FROM attendance
      WHERE user_id = auth.uid() AND course_id = courses.id
    )
    OR EXISTS (
      SELECT 1 FROM submissions
      WHERE student_id = auth.uid() 
      AND assignment_id IN (
        SELECT id FROM assignments WHERE course_id = courses.id
      )
    )
  )
);

-- Create or replace policy for teachers to view their courses
DROP POLICY IF EXISTS "Teachers can view their courses" ON courses;
CREATE POLICY "Teachers can view their courses"
ON courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'teacher'
  )
  AND teacher_id = auth.uid()
);

-- Create or replace policy for admins to view all courses
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
CREATE POLICY "Admins can view all courses"
ON courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create index to improve performance of course filtering
CREATE INDEX IF NOT EXISTS idx_attendance_user_course ON attendance(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_institution ON courses(institution_id);