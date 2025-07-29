create table grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references users(id),
  course_id uuid references courses(id),
  total_grade numeric,
  feedback text,
  graded_by uuid references users(id),
  created_at timestamp default current_timestamp
);
