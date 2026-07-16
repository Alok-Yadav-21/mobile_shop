-- Super admin flag + last-activity tracking for the Users management page.
-- Run after 0004_role_crud_policies.sql.

alter table profiles add column if not exists super_admin boolean not null default false;
alter table profiles add column if not exists last_active_at timestamptz;

-- Only a super admin may promote another account to admin or create a new admin account
-- (account creation itself still requires a server-side Supabase Admin API call — see
-- src/services/adapter/supabase.js UserAPI.create). This is enforced again in the RLS
-- update policy so a compromised/careless client can't bypass the UI-level check.
create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select super_admin from profiles where id = auth.uid() and role = 'admin'), false);
$$;

drop policy if exists "profiles: self update" on profiles;
create policy "profiles: self update" on profiles for update
  using (id = auth.uid() or is_admin())
  with check (
    id = auth.uid()
    or is_admin()
  );

-- Postgres RLS can't easily express "role column may only become 'admin' when the actor is
-- a super admin" as a single using()/with check() clause without a trigger, so enforce it
-- with one: any UPDATE that sets role = 'admin' on a row that wasn't already 'admin' requires
-- the acting user to be a super admin.
create or replace function prevent_unauthorised_admin_promotion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'admin' and old.role <> 'admin' and not is_super_admin() then
    raise exception 'Only a super admin can promote an account to admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_unauthorised_admin_promotion on profiles;
create trigger trg_prevent_unauthorised_admin_promotion
  before update on profiles
  for each row execute function prevent_unauthorised_admin_promotion();
