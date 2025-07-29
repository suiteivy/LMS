-- Enable RLS
alter table users enable row level security;
alter table courses enable row level security;
alter table assignments enable row level security;
alter table submissions enable row level security;
alter table attendance enable row level security;

-- Sample policy: Students see their own submissions
create policy "Students can view their submissions"
on submissions for select
using (auth.uid() = student_id);

-- Teachers can insert assignments
create policy "Teachers can insert assignments"
on assignments for insert
using (exists (
  select 1 from users
  where id = auth.uid() and role = 'teacher'
));
