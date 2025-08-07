-- Special policy to allow new user registration
-- This policy allows unauthenticated users to insert into the users table during sign-up

-- First, we need a policy that allows inserting into users table during sign-up
create policy "Allow public sign-up"
on users for insert
with check (auth.role() = 'anon');

-- Create a trigger function to ensure new users can only set role to 'student' during sign-up
create or replace function public.check_user_role_on_signup()
returns trigger as $$
begin
  -- If the user is not authenticated (during sign-up) or not an admin
  if (auth.role() = 'anon' or not exists (select 1 from users where id = auth.uid() and role = 'admin')) then
    -- Force the role to be 'student' for new sign-ups
    new.role := 'student';
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to enforce the role restriction
create trigger enforce_user_role_on_signup
before insert on users
for each row
execute function public.check_user_role_on_signup();