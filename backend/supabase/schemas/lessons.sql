create table lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  title text not null,
  content text,
  scheduled_at timestamp,
  created_at timestamp default current_timestamp
);
