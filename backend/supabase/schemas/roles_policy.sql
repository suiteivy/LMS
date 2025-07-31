-- Enable Row Level Security (RLS) on all tables
alter table users enable row level security;
alter table courses enable row level security;
alter table assignments enable row level security;
alter table submissions enable row level security;
alter table attendance enable row level security;
alter table lessons enable row level security;
alter table grades enable row level security;
alter table institutions enable row level security;

-- ==========================================
-- USERS TABLE POLICIES
-- ==========================================

-- Everyone can read their own user data
create policy "Users can read own data"
on users for select
using (auth.uid() = id);

-- Admin and teachers can read all user data
create policy "Admins and teachers can read all user data"
on users for select
using (exists (
  select 1 from users
  where id = auth.uid() and role in ('admin', 'teacher')
));

-- Only admins can create new users
create policy "Only admins can create users"
on users for insert
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Users can update their own data (except role)
create policy "Users can update own data"
on users for update
using (auth.uid() = id)
with check (role = (select role from users where id = auth.uid()));

-- Only admins can update roles
create policy "Only admins can update roles"
on users for update
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Only admins can delete users
create policy "Only admins can delete users"
on users for delete
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- ==========================================
-- COURSES TABLE POLICIES
-- ==========================================

-- Everyone can read courses they're associated with
create policy "Users can read associated courses"
on courses for select
using (
  auth.uid() = teacher_id
  or exists (
    select 1 from submissions
    where student_id = auth.uid() and assignment_id in (
      select id from assignments where course_id = courses.id
    )
  )
  or exists (
    select 1 from attendance
    where user_id = auth.uid() and course_id = courses.id
  )
);

-- Admin and teachers can read all courses
create policy "Admins and teachers can read all courses"
on courses for select
using (exists (
  select 1 from users
  where id = auth.uid() and role in ('admin', 'teacher')
));

-- Only admins and teachers can create courses
create policy "Only admins and teachers can create courses"
on courses for insert
using (exists (
  select 1 from users
  where id = auth.uid() and role in ('admin', 'teacher')
));

-- Teachers can only update their own courses
create policy "Teachers can update own courses"
on courses for update
using (auth.uid() = teacher_id);

-- Admins can update any course
create policy "Admins can update any course"
on courses for update
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Only admins and course owners can delete courses
create policy "Only admins and course owners can delete courses"
on courses for delete
using (
  auth.uid() = teacher_id
  or exists (
    select 1 from users
    where id = auth.uid() and role = 'admin'
  )
);

-- ==========================================
-- ASSIGNMENTS TABLE POLICIES
-- ==========================================

-- Everyone can read assignments for their courses
create policy "Users can read assignments for their courses"
on assignments for select
using (
  exists (
    select 1 from courses
    where id = assignments.course_id
    and (
      teacher_id = auth.uid()
      or exists (
        select 1 from submissions
        where student_id = auth.uid() and assignment_id in (
          select id from assignments where course_id = courses.id
        )
      )
      or exists (
        select 1 from attendance
        where user_id = auth.uid() and course_id = courses.id
      )
    )
  )
);

-- Teachers can create assignments for their courses
create policy "Teachers can create assignments for their courses"
on assignments for insert
using (
  exists (
    select 1 from courses
    where id = assignments.course_id and teacher_id = auth.uid()
  )
);

-- Admins can create any assignment
create policy "Admins can create any assignment"
on assignments for insert
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Teachers can update assignments for their courses
create policy "Teachers can update assignments for their courses"
on assignments for update
using (
  exists (
    select 1 from courses
    where id = assignments.course_id and teacher_id = auth.uid()
  )
);

-- Admins can update any assignment
create policy "Admins can update any assignment"
on assignments for update
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Teachers can delete assignments for their courses
create policy "Teachers can delete assignments for their courses"
on assignments for delete
using (
  exists (
    select 1 from courses
    where id = assignments.course_id and teacher_id = auth.uid()
  )
);

-- Admins can delete any assignment
create policy "Admins can delete any assignment"
on assignments for delete
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- ==========================================
-- SUBMISSIONS TABLE POLICIES
-- ==========================================

-- Students can read their own submissions
create policy "Students can read own submissions"
on submissions for select
using (auth.uid() = student_id);

-- Teachers can read submissions for their courses
create policy "Teachers can read submissions for their courses"
on submissions for select
using (
  exists (
    select 1 from assignments
    join courses on assignments.course_id = courses.id
    where assignments.id = submissions.assignment_id
    and courses.teacher_id = auth.uid()
  )
);

-- Admins can read all submissions
create policy "Admins can read all submissions"
on submissions for select
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Students can create their own submissions
create policy "Students can create own submissions"
on submissions for insert
with check (auth.uid() = student_id);

-- Students can update their own submissions
create policy "Students can update own submissions"
on submissions for update
using (auth.uid() = student_id)
with check (graded = false); -- Cannot update after grading

-- Teachers can update submissions for their courses (for grading)
create policy "Teachers can update submissions for grading"
on submissions for update
using (
  exists (
    select 1 from assignments
    join courses on assignments.course_id = courses.id
    where assignments.id = submissions.assignment_id
    and courses.teacher_id = auth.uid()
  )
);

-- Admins can update any submission
create policy "Admins can update any submission"
on submissions for update
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- ==========================================
-- ATTENDANCE TABLE POLICIES
-- ==========================================

-- Students can read their own attendance
create policy "Students can read own attendance"
on attendance for select
using (auth.uid() = user_id);

-- Teachers can read attendance for their courses
create policy "Teachers can read attendance for their courses"
on attendance for select
using (
  exists (
    select 1 from courses
    where id = attendance.course_id and teacher_id = auth.uid()
  )
);

-- Admins can read all attendance
create policy "Admins can read all attendance"
on attendance for select
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Students can mark their own attendance (login type)
create policy "Students can mark own attendance"
on attendance for insert
with check (auth.uid() = user_id and type = 'login');

-- Teachers can mark attendance for their courses (manual type)
create policy "Teachers can mark attendance for their courses"
on attendance for insert
using (
  exists (
    select 1 from courses
    where id = attendance.course_id and teacher_id = auth.uid()
  )
);

-- Admins can mark any attendance
create policy "Admins can mark any attendance"
on attendance for insert
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- ==========================================
-- LESSONS TABLE POLICIES
-- ==========================================

-- Everyone can read lessons for their courses
create policy "Users can read lessons for their courses"
on lessons for select
using (
  exists (
    select 1 from courses
    where id = lessons.course_id
    and (
      teacher_id = auth.uid()
      or exists (
        select 1 from submissions
        where student_id = auth.uid() and assignment_id in (
          select id from assignments where course_id = courses.id
        )
      )
      or exists (
        select 1 from attendance
        where user_id = auth.uid() and course_id = courses.id
      )
    )
  )
);

-- Teachers can create lessons for their courses
create policy "Teachers can create lessons for their courses"
on lessons for insert
using (
  exists (
    select 1 from courses
    where id = lessons.course_id and teacher_id = auth.uid()
  )
);

-- Admins can create any lesson
create policy "Admins can create any lesson"
on lessons for insert
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Teachers can update lessons for their courses
create policy "Teachers can update lessons for their courses"
on lessons for update
using (
  exists (
    select 1 from courses
    where id = lessons.course_id and teacher_id = auth.uid()
  )
);

-- Admins can update any lesson
create policy "Admins can update any lesson"
on lessons for update
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- ==========================================
-- GRADES TABLE POLICIES
-- ==========================================

-- Students can read their own grades
create policy "Students can read own grades"
on grades for select
using (auth.uid() = student_id);

-- Teachers can read grades for their courses
create policy "Teachers can read grades for their courses"
on grades for select
using (
  exists (
    select 1 from courses
    where id = grades.course_id and teacher_id = auth.uid()
  )
);

-- Admins can read all grades
create policy "Admins can read all grades"
on grades for select
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Teachers can create/update grades for their courses
create policy "Teachers can create grades for their courses"
on grades for insert
using (
  exists (
    select 1 from courses
    where id = grades.course_id and teacher_id = auth.uid()
  )
);

-- Admins can create any grade
create policy "Admins can create any grade"
on grades for insert
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- Teachers can update grades for their courses
create policy "Teachers can update grades for their courses"
on grades for update
using (
  exists (
    select 1 from courses
    where id = grades.course_id and teacher_id = auth.uid()
  )
);

-- Admins can update any grade
create policy "Admins can update any grade"
on grades for update
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));

-- ==========================================
-- INSTITUTIONS TABLE POLICIES
-- ==========================================

-- Everyone can read institutions
create policy "Everyone can read institutions"
on institutions for select
using (true);

-- Only admins can create/update/delete institutions
create policy "Only admins can manage institutions"
on institutions for all
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'admin'
));
