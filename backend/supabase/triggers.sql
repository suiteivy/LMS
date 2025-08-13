-- Trigger function: decrement available_quantity after borrow insert
create or replace function public._decrement_book_available()
returns trigger language plpgsql as $$
begin
  -- Only decrement on new borrowed row when not returned
  update public.books
  set available_quantity = available_quantity - 1
  where id = NEW.book_id and available_quantity > 0;
  return NEW;
end;
$$;




-- Trigger function: increment available_quantity after return (when returned_at set)
create or replace function public._increment_book_available()
returns trigger language plpgsql as $$
begin
  -- If returned_at set and previously null, increment
  if (TG_OP = 'UPDATE') then
    if (NEW.returned_at is not null and (OLD.returned_at is null)) then
      update public.books
      set available_quantity = available_quantity + 1
      where id = NEW.book_id;
    end if;
  end if;
  return NEW;
end;
$$;

-- Attach triggers
drop trigger if exists trg_borrow_decrement on public.borrowed_books;
create trigger trg_borrow_decrement
after insert on public.borrowed_books
for each row execute function public._decrement_book_available();

drop trigger if exists trg_borrow_increment on public.borrowed_books;
create trigger trg_borrow_increment
after update on public.borrowed_books
for each row execute function public._increment_book_available();