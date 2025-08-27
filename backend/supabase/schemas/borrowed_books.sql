create table if not exists public.borrowed_books (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references public.books(id) not null,
  user_id uuid references public.users(id) not null,
  borrowed_at timestamp default current_timestamp,
  due_date date,
  returned_at timestamp null,
  status text default 'borrowed', -- 'borrowed' | 'returned' | 'overdue'
  institution_id uuid references public.institutions(id),
  created_at timestamp default current_timestamp
);