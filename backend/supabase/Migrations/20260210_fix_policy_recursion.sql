-- Fix recursive policies and broken helper functions

-- 1. Fix helper functions to use auth.uid() directly and avoid recursion
CREATE OR REPLACE FUNCTION current_user_student_id() RETURNS TEXT AS $$
    SELECT id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_teacher_id() RETURNS TEXT AS $$
    SELECT id FROM teachers WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 2. Drop the "old" recursive policies on subjects if they exist
-- These policies were likely checking assignments/submissions which checked subjects back
DROP POLICY IF EXISTS "Users can read associated subjects" ON subjects;
DROP POLICY IF EXISTS "Admins and teachers can read all subjects" ON subjects;
DROP POLICY IF EXISTS "Only admins and teachers can create subjects" ON subjects;
DROP POLICY IF EXISTS "Teacher can update own subjects" ON subjects;  -- Old name might vary slightly
DROP POLICY IF EXISTS "Admins can update any subject" ON subjects;
DROP POLICY IF EXISTS "Only admins and subject owners can delete subjects" ON subjects;

-- 3. Ensure the "new" clean policies are applied
-- (Re-applying what is in the bottom of schema.sql to be sure)

-- SELECT: Everyone can view subjects (Breaks the recursion by being open)
DROP POLICY IF EXISTS "Everyone can view subjects" ON subjects;
CREATE POLICY "Everyone can view subjects" ON subjects FOR SELECT USING (true);

-- INSERT: Admins can insert
DROP POLICY IF EXISTS "Admins can insert subjects" ON subjects;
CREATE POLICY "Admins can insert subjects" ON subjects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- UPDATE: Teachers can update own
DROP POLICY IF EXISTS "Teachers can update own subjects" ON subjects;
CREATE POLICY "Teachers can update own subjects" ON subjects FOR UPDATE USING (teacher_id = current_user_teacher_id());

-- 4. Clean up other recursive policies just in case
DROP POLICY IF EXISTS "Users can read assignments for their subjects" ON assignments;
-- Re-apply safe assignment policy (simplified from schema.sql part 2)
DROP POLICY IF EXISTS "View assignments" ON assignments;
CREATE POLICY "View assignments" ON assignments FOR SELECT USING (
  teacher_id = current_user_teacher_id() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  (
    -- Student check: safer to rely on simple subject link if possible, 
    -- but if we need enrollment check, ensure is_student_in_class is used and is SECURITY DEFINER
    EXISTS (
      SELECT 1 FROM subjects c
      WHERE c.id = assignments.subject_id
      AND is_student_in_class(c.class_id, current_user_student_id())
    )
  )
);
