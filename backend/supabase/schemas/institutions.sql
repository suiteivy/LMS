create table institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamp default current_timestamp
);
