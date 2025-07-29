create table users (
  id uuid primary key references auth.users(id),
  full_name text not null,
  email text not null unique,
  role text check (role in ('admin', 'student', 'teacher')) not null,
  institution_id uuid references institutions(id),
  created_at timestamp default current_timestamp
);
