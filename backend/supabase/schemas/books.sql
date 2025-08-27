create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  isbn text,
  total_quantity int not null default 1,
  available_quantity int not null default 1,
  institution_id uuid references public.institutions(id),
  created_at timestamp default current_timestamp
);