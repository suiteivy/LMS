-- Performance indexes migration
-- Adds indexes for the most frequently-queried columns that currently lack them.
-- All use IF NOT EXISTS to be safely re-runnable.

-- ─── users ──────────────────────────────────────────────────────────────────────
-- Nearly every controller filters by institution_id
CREATE INDEX IF NOT EXISTS idx_users_institution_id
  ON public.users (institution_id);

-- Auth lookups, master admin search
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON public.users (email);

-- Composite: institution + role (used in master_admin, auth)
CREATE INDEX IF NOT EXISTS idx_users_institution_role
  ON public.users (institution_id, role);

-- ─── enrollments ────────────────────────────────────────────────────────────────
-- Teacher analytics, grade entries, reports filter by subject + status
CREATE INDEX IF NOT EXISTS idx_enrollments_subject_status
  ON public.enrollments (subject_id, status);

-- Parent, reports, teacher filter by student
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id
  ON public.enrollments (student_id);

-- ─── class_enrollments ──────────────────────────────────────────────────────────
-- Teacher, class, attendance filter by class + status
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_status
  ON public.class_enrollments (class_id, status);

-- Teacher, parent filter by student
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id
  ON public.class_enrollments (student_id);

-- ─── subjects ───────────────────────────────────────────────────────────────────
-- Teacher controller fetches subjects by teacher_id
CREATE INDEX IF NOT EXISTS idx_subjects_teacher_id
  ON public.subjects (teacher_id);

-- Nearly every controller filters subjects by institution_id
CREATE INDEX IF NOT EXISTS idx_subjects_institution_id
  ON public.subjects (institution_id);

-- ─── subject_teachers ───────────────────────────────────────────────────────────
-- Junction table: teacher lookups
CREATE INDEX IF NOT EXISTS idx_subject_teachers_teacher_id
  ON public.subject_teachers (teacher_id);

-- ─── notifications ──────────────────────────────────────────────────────────────
-- Dashboard unread count query: user_id + is_read
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON public.notifications (user_id, is_read);

-- ─── grade_entries ──────────────────────────────────────────────────────────────
-- Primary filter pattern in gradeEntries controller
CREATE INDEX IF NOT EXISTS idx_grade_entries_institution_subject
  ON public.grade_entries (institution_id, subject_id);

-- Student lookup in reports, grade queries
CREATE INDEX IF NOT EXISTS idx_grade_entries_student_id
  ON public.grade_entries (student_id);

-- Term-based filtering
CREATE INDEX IF NOT EXISTS idx_grade_entries_term_id
  ON public.grade_entries (term_id);

-- ─── submissions ────────────────────────────────────────────────────────────────
-- Teacher analytics, performance queries
CREATE INDEX IF NOT EXISTS idx_submissions_student_id
  ON public.submissions (student_id);

-- Teacher analytics join on assignment
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id
  ON public.submissions (assignment_id);

-- ─── assignments ────────────────────────────────────────────────────────────────
-- Teacher analytics fetch by subject
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id
  ON public.assignments (subject_id);

-- ─── attendance ─────────────────────────────────────────────────────────────────
-- Daily attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_institution_date
  ON public.attendance (institution_id, date);

-- ─── parent_students ────────────────────────────────────────────────────────────
-- Absence notification, parent controller
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id
  ON public.parent_students (student_id);

-- ─── timetables ─────────────────────────────────────────────────────────────────
-- Teacher dashboard fetches by subject
CREATE INDEX IF NOT EXISTS idx_timetables_subject_id
  ON public.timetables (subject_id);

-- Institution scoping
CREATE INDEX IF NOT EXISTS idx_timetables_institution_id
  ON public.timetables (institution_id);

-- ─── fee_structures ─────────────────────────────────────────────────────────────
-- Finance controller filters by institution + status
CREATE INDEX IF NOT EXISTS idx_fee_structures_institution_status
  ON public.fee_structures (institution_id, status);

-- ─── payments ───────────────────────────────────────────────────────────────────
-- Finance controller filters by institution
CREATE INDEX IF NOT EXISTS idx_payments_institution_id
  ON public.payments (institution_id);
