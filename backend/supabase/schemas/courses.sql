create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  teacher_id uuid references users(id),
  institution_id uuid references institutions(id),
  fee_amount numeric(10, 2) not null,
  created_at timestamp default current_timestamp
);
