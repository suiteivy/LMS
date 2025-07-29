create table assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  title text not null,
  description text,
  due_date timestamp,
  created_at timestamp default current_timestamp
);
