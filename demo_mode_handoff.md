# Handoff: Frontend Demo Mode Write Intercepts & Seeding Fixes

This document outlines the current progress, the issues identified with database demo-cloning, and the proposed path forward for the next session.

---

## 1. What Has Been Completed
We have implemented client-side intercepts for all write actions (POST/PUT/PATCH/DELETE) across all dashboards (Teacher, Student, Parent) when `isDemo` is active.

### Intercepted Screens & Components
- **Teacher Dashboard**:
  - `attendance.tsx` (Save Attendance checks `isDemo` and toasts)
  - `submissions.tsx` (Intercepts grade submissions, updates state, and toasts)
  - `assignments.tsx` (Intercepts create, edit, and delete assignment actions)
  - `announcements.tsx` (Intercepts create and delete announcement actions)
  - `resources.tsx` (Intercepts resource uploads and deletions)
  - `diary.tsx` (Intercepts diary entry saves and deletions)
  - `exams.tsx` (Intercepts exam scheduling)
  - `exam-results.tsx` (Intercepts student score entries and saves)
- **Student Dashboard**:
  - `assignments.tsx` (Intercepts assignment file uploads, marks status as completed)
- **Parent Dashboard**:
  - `messages.tsx` (Intercepts message sends and marks read)
  - `finance.tsx` (Intercepts fee payment evidence submissions and appends to pending transactions list)
- **Global Contexts**:
  - `NotificationContext.tsx` & `notifications.tsx` (Intercepts all notification mark-as-read, delete, and clear operations)

---

## 2. Seed Script Fixes (Completed)
We fixed issues in `backend/seed.js` related to columns missing or mismatched with the DB schema:
- Renamed `grade_by` back to `graded_by` in `exam_results`.
- Removed the nonexistent `subject_id` field from `diary_entries`.

---

## 3. The Current Problem: Dynamic Demo Data / Session Matching
The backend cloning approach is failing because user sessions do not map dynamically to the hardcoded database seed IDs (e.g., `teacherId`, `studentId`, etc. vary per authenticated user session). As a result, the dashboards fetch no data for new users even if data has been cloned under template IDs.

### Proposed Solution
Instead of cloning templates on the backend:
1. **Dynamic Tagging**: Log into any existing institution normally, and tag the session with `isDemo: true`.
2. **Local ID Mapping**: Generate and map unique virtual IDs on the client-side/frontend using the current session context so the user sees valid template data mapped specifically to their logged-in user context.

---

## 4. Next Steps for New Chat
1. Read the modified frontend files to review the demo mode checks:
   - [NotificationContext.tsx](file:///c:/Users/mbugu/Desktop/Code/React/Cloudora_LMS/frontend/contexts/NotificationContext.tsx)
   - [attendance.tsx](file:///c:/Users/mbugu/Desktop/Code/React/Cloudora_LMS/frontend/app/(teacher)/management/attendance.tsx)
   - [assignments.tsx](file:///c:/Users/mbugu/Desktop/Code/React/Cloudora_LMS/frontend/app/(teacher)/management/assignments.tsx)
   - [finance.tsx](file:///c:/Users/mbugu/Desktop/Code/React/Cloudora_LMS/frontend/app/(parent)/finance.tsx)
2. Transition the authentication/authorization context flow so that checking the "Demo" options associates the logged-in session context with standard template records dynamically mapped on client fetch request results.

---

## 5. Solutions to Database Seeding Issues

### Duplicate Key Violations on `attendance`
* **Why it happens**: The seed script uses `.insert()` for attendance records. If the seed script is executed multiple times, inserting identical dates for the same `student_id`, `subject_id`, and `date` violates the unique table constraints.
* **Solution**: Truncate/clear the relevant table records first before running the seed inserts, or use Supabase `.upsert(records, { onConflict: 'student_id,subject_id,date' })` instead of `.insert()`.

### Column Mismatch/Schema Cache Errors (e.g. `grade_by` or `subject_id`)
* **Why it happens**: PostgREST caches database schemas. When you change/migrate schemas, the PostgREST schema cache needs to be reloaded to recognize new columns.
* **Solution**: In the Supabase SQL editor, execute the following to reload the schema cache:
  ```sql
  NOTIFY pgrst, 'reload schema';
  ```
  Or restart/reset your local Supabase CLI instance (`supabase db reset` or `supabase db start`).

### Seeding Institution Match
* **Configuration**: The demo mode session should link to the institution named **"Cloudora School"** (ID: `b5bd788c-8297-4a96-b8b3-157814504fba`) regardless of the active role.

### Seeding Expansion for All Roles
To fully accommodate all roles (Teacher, Student, Parent, Admin, Bursar) with complete field data:
1. **Users & Profiles seeding**: The script should seed corresponding `auth.users` / `public.users` table records with correct role settings:
   - Teacher (`TEACHER_USER_ID`)
   - Student (`PRIMARY_STUDENT_USER_ID`)
   - Parent (`PARENT_USER_ID`)
   - Admin (`ADMIN_USER_ID`)
   - Bursar (`BURSAR_USER_ID`)
2. **Dependent Tables**: Insert matching profiles in `teachers`, `students`, `parents`, and `bursaries` linked to those user IDs and `'b5bd788c-8297-4a96-b8b3-157814504fba'`.
3. **Core entity linkages**: Populate `enrollments`, `classes`, `subjects`, `fee_structures`, and `bursaries` completely so that student/parent finance screens show full data instead of blank values.
4. **Data Verification**: Ensure that the database has a clear set of matching constraint-compliant test data for all modules (Library, Bursary, Finance, Attendance, Submissions, Exams).

### Core Entity Seeding Requirements (To Resolve Foreign Key Violations)
Because deleting the template data deletes parent tables, the seed script must insert the core template entities **first** before attempting to insert attendance, assignments, and reports.

Execute this SQL block in Supabase to recreate the template hierarchy before running the JS seed:
```sql
-- Disable triggers temporarily to prevent foreign key errors during execution
SET session_replication_role = 'replica';

-- 1. Insert Institution
INSERT INTO institutions (id, name, status)
VALUES ('b5bd788c-8297-4a96-b8b3-157814504fba', 'Cloudora School', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Users
INSERT INTO users (id, full_name, role) VALUES 
('a9270c4b-0f35-4d3b-87b8-4dc3da990587', 'Sarah Chemutai', 'teacher'),
('c6306d7b-ad5e-4f5b-8118-47fcd462bd25', 'Kelson Otieno', 'student'),
('5392d979-e70a-4017-a340-502ea5706d41', 'James Mwangi', 'parent'),
('b14cbc73-e3bf-4c0f-962a-b754a5979a84', 'Admin User', 'admin')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Teacher & Student Core Profiles
INSERT INTO teachers (id, user_id, institution_id)
VALUES ('TCH-MOMENTUM-001', 'a9270c4b-0f35-4d3b-87b8-4dc3da990587', 'b5bd788c-8297-4a96-b8b3-157814504fba')
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, user_id, institution_id)
VALUES ('c6306d7b-ad5e-4f5b-8118-47fcd462bd25', 'c6306d7b-ad5e-4f5b-8118-47fcd462bd25', 'b5bd788c-8297-4a96-b8b3-157814504fba')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Classes & Subjects
INSERT INTO classes (id, display_name, institution_id) VALUES 
('417561a5-48c5-4c45-b736-97d49e74bd35', 'Form 3 Math', 'b5bd788c-8297-4a96-b8b3-157814504fba'),
('dfe26cde-0bdc-4c14-98f2-093a71199a26', 'Form 3 English', 'b5bd788c-8297-4a96-b8b3-157814504fba')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subjects (id, title, class_id, teacher_id, institution_id) VALUES 
('a9aca035-bf32-4876-85ec-ea0b7bc972fb', 'Mathematics', '417561a5-48c5-4c45-b736-97d49e74bd35', 'TCH-MOMENTUM-001', 'b5bd788c-8297-4a96-b8b3-157814504fba'),
('db224c36-093b-4d92-9bed-61b720a991c8', 'English', 'dfe26cde-0bdc-4c14-98f2-093a71199a26', 'TCH-MOMENTUM-001', 'b5bd788c-8297-4a96-b8b3-157814504fba')
ON CONFLICT (id) DO NOTHING;

-- Restore normal trigger behavior
SET session_replication_role = 'origin';
```
