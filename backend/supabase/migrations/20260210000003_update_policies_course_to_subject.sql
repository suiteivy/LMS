-- Migration: Update RLS Policies for Course to Subject Rename
-- This script drops policies that refer to the old nomenclature and creates them with the new names.

-- 1. COURSES -> SUBJECTS
DROP POLICY IF EXISTS "Users can read associated courses" ON subjects;
CREATE POLICY "Users can read associated subjects"
ON subjects FOR SELECT
USING (
  teacher_id = current_user_teacher_id()
  OR EXISTS (
    SELECT 1 FROM submissions
    WHERE student_id = current_user_student_id() AND assignment_id IN (
      SELECT id FROM assignments WHERE subject_id = subjects.id
    )
  )
  OR EXISTS (
    SELECT 1 FROM attendance
    WHERE student_id = current_user_student_id() AND subject_id = subjects.id
  )
);

DROP POLICY IF EXISTS "Admins and teachers can read all courses" ON subjects;
CREATE POLICY "Admins and teachers can read all subjects"
ON subjects FOR SELECT
USING (public.get_current_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS "Only admins and teachers can create courses" ON subjects;
CREATE POLICY "Only admins and teachers can create subjects"
ON subjects FOR INSERT
WITH CHECK (public.get_current_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS "Teachers can update own courses" ON subjects;
CREATE POLICY "Teachers can update own subjects"
ON subjects FOR UPDATE
USING (teacher_id = current_user_teacher_id());

DROP POLICY IF EXISTS "Admins can update any course" ON subjects;
CREATE POLICY "Admins can update any subject"
ON subjects FOR UPDATE
USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "Only admins and subject owners can delete courses" ON subjects;
CREATE POLICY "Only admins and subject owners can delete subjects"
ON subjects FOR DELETE
USING (
  teacher_id = current_user_teacher_id()
  OR public.get_current_user_role() = 'admin'
);

-- 2. ASSIGNMENTS
DROP POLICY IF EXISTS "Users can read assignments for their courses" ON assignments;
CREATE POLICY "Users can read assignments for their subjects"
ON assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = assignments.subject_id
    AND (
      teacher_id = current_user_teacher_id()
      OR EXISTS (
        SELECT 1 FROM submissions
        WHERE student_id = current_user_student_id() AND assignment_id IN (
          SELECT id FROM assignments WHERE subject_id = subjects.id
        )
      )
      OR EXISTS (
        SELECT 1 FROM attendance
        WHERE student_id = current_user_student_id() AND subject_id = subjects.id
      )
    )
  )
);

DROP POLICY IF EXISTS "Teachers can create assignments for their courses" ON assignments;
CREATE POLICY "Teachers can create assignments for their subjects"
ON assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = assignments.subject_id AND teacher_id = current_user_teacher_id()
  )
);

DROP POLICY IF EXISTS "Teachers can update assignments for their courses" ON assignments;
CREATE POLICY "Teachers can update assignments for their subjects"
ON assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = assignments.subject_id AND teacher_id = current_user_teacher_id()
  )
);

DROP POLICY IF EXISTS "Teachers can delete assignments for their courses" ON assignments;
CREATE POLICY "Teachers can delete assignments for their subjects"
ON assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = assignments.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- 3. SUBMISSIONS
DROP POLICY IF EXISTS "Teachers can read submissions for their courses" ON submissions;
CREATE POLICY "Teachers can read submissions for their subjects"
ON submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN subjects ON assignments.subject_id = subjects.id
    WHERE assignments.id = submissions.assignment_id
    AND subjects.teacher_id = current_user_teacher_id()
  )
);

DROP POLICY IF EXISTS "Teachers can update submissions for grading" ON submissions;
CREATE POLICY "Teachers can update submissions for grading"
ON submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN subjects ON assignments.subject_id = subjects.id
    WHERE assignments.id = submissions.assignment_id
    AND subjects.teacher_id = current_user_teacher_id()
  )
);

-- 4. ATTENDANCE
DROP POLICY IF EXISTS "Teachers can read attendance for their courses" ON attendance;
CREATE POLICY "Teachers can read attendance for their subjects"
ON attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = attendance.subject_id AND teacher_id = current_user_teacher_id()
  )
);

DROP POLICY IF EXISTS "Teachers can mark attendance for their courses" ON attendance;
CREATE POLICY "Teachers can mark attendance for their subjects"
ON attendance FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = attendance.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- 5. LESSONS
DROP POLICY IF EXISTS "Users can read lessons for their courses" ON lessons;
CREATE POLICY "Users can read lessons for their subjects"
ON lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = lessons.subject_id
    AND (
      teacher_id = current_user_teacher_id()
      OR EXISTS (
        SELECT 1 FROM submissions
        WHERE student_id = current_user_student_id() AND assignment_id IN (
          SELECT id FROM assignments WHERE subject_id = subjects.id
        )
      )
      OR EXISTS (
        SELECT 1 FROM attendance
        WHERE student_id = current_user_student_id() AND subject_id = subjects.id
      )
    )
  )
);

DROP POLICY IF EXISTS "Teachers can create lessons for their courses" ON lessons;
CREATE POLICY "Teachers can create lessons for their subjects"
ON lessons FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = lessons.subject_id AND teacher_id = current_user_teacher_id()
  )
);

DROP POLICY IF EXISTS "Teachers can update lessons for their courses" ON lessons;
CREATE POLICY "Teachers can update lessons for their subjects"
ON lessons FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = lessons.subject_id AND teacher_id = current_user_teacher_id()
  )
);

DROP POLICY IF EXISTS "Teachers can delete lessons for their courses" ON lessons;
CREATE POLICY "Teachers can delete lessons for their subjects"
ON lessons FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = lessons.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- 6. GRADES
DROP POLICY IF EXISTS "Teachers can read grades for their courses" ON grades;
CREATE POLICY "Teachers can read grades for their subjects"
ON grades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = grades.subject_id AND teacher_id = current_user_teacher_id()
  )
);

DROP POLICY IF EXISTS "Teachers can create grades for their courses" ON grades;
CREATE POLICY "Teachers can create grades for their subjects"
ON grades FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = grades.subject_id AND teacher_id = current_user_teacher_id()
  )
);

DROP POLICY IF EXISTS "Teachers can update grades for their courses" ON grades;
CREATE POLICY "Teachers can update grades for their subjects"
ON grades FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = grades.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- 7. RESOURCES
DROP POLICY IF EXISTS "View resources" ON resources;
CREATE POLICY "View resources" ON resources FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  EXISTS (
      SELECT 1 FROM subjects c
      WHERE c.id = resources.subject_id
      AND (
          c.teacher_id = current_user_teacher_id() OR
          is_student_in_class(c.class_id, current_user_student_id())
      )
  )
);

DROP POLICY IF EXISTS "Manage resources" ON resources;
CREATE POLICY "Manage resources" ON resources FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  EXISTS (
      SELECT 1 FROM subjects c
      WHERE c.id = resources.subject_id
      AND c.teacher_id = current_user_teacher_id()
  )
);

-- 8. View Assignments (from Part 3 refactor)
DROP POLICY IF EXISTS "View assignments" ON assignments;
CREATE POLICY "View assignments" ON assignments FOR SELECT USING (
  teacher_id = current_user_teacher_id() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  (
    EXISTS (
      SELECT 1 FROM subjects c
      WHERE c.id = assignments.subject_id
      AND is_student_in_class(c.class_id, current_user_student_id())
    )
  )
);
