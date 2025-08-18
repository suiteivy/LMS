create or replace function public._validate_and_decrement_book()
returns trigger
language plpgsql
as $$
declare
  unpaid_ratio numeric := 1; -- default to fully paid if no fees found
  max_borrow int := 3; -- configurable if needed
  current_borrow_count int;
  overdue_count int;
begin
  -- Check if book is available
  if (select available_quantity from public.books where id = NEW.book_id) <= 0 then
    raise exception 'Book not available';
  end if;

  -- Payment threshold check (>= 50%)
  select case 
           when total_fee > 0 then (amount_paid / total_fee) 
           else 1 
         end
  into unpaid_ratio
  from public.fees
  where student_id = NEW.user_id;  -- match borrowed_books.user_id

  if unpaid_ratio < 0.5 then
    raise exception 'Payment below required threshold (50 percent)';
  end if;

  -- Check current borrow count (only unreturned)
  select count(*) into current_borrow_count
  from public.borrowed_books
  where user_id = NEW.user_id and returned_at is null;

  if current_borrow_count >= max_borrow then
    raise exception 'Borrow limit reached';
  end if;

  -- Check overdue
  select count(*) into overdue_count
  from public.borrowed_books
  where user_id = NEW.user_id
    and returned_at is null
    and due_date < current_date;

  if overdue_count > 0 then
    raise exception 'Overdue books must be returned before borrowing again';
  end if;

  -- Passed all checks, decrement stock
  update public.books
  set available_quantity = available_quantity - 1
  where id = NEW.book_id;

  return NEW;
end;
$$;

-- Attach to trigger
drop trigger if exists trg_borrow_validate_decrement on public.borrowed_books;
create trigger trg_borrow_validate_decrement
before insert on public.borrowed_books
for each row execute function public._validate_and_decrement_book();


-- Increment stock on return
create or replace function public._increment_book_available()
returns trigger
language plpgsql
as $$
begin
  if (TG_OP = 'UPDATE') then
    if (NEW.returned_at is not null and OLD.returned_at is null) then
      update public.books
      set available_quantity = available_quantity + 1
      where id = NEW.book_id;
    end if;
  end if;
  return NEW;
end;
$$;

-- Attach to trigger
drop trigger if exists trg_borrow_increment on public.borrowed_books;
create trigger trg_borrow_increment
after update on public.borrowed_books
for each row execute function public._increment_book_available();

