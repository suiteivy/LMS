create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  course_id uuid references courses(id),
  login_date date not null,
  session_start timestamp,
  session_end timestamp,
  marked_by uuid references users(id),
  type text check (type in ('login', 'manual')) not null,
  created_at timestamp default current_timestamp
);
