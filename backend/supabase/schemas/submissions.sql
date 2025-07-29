create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id),
  student_id uuid references users(id),
  file_url text,
  submitted_at timestamp default current_timestamp,
  graded boolean default false,
  grade numeric,
  feedback text
);
