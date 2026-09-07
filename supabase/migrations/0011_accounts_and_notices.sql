-- The account and notification machinery the app has been calling for and the schema never had.
--
-- Three things were missing outright, each of which breaks something a user does every day:
--
--   1. Nothing created a profile when somebody registered. Supabase Auth makes the auth.users
--      row; profiles is ours, and no trigger filled it in. A customer could sign up, receive a
--      session, and land in an app that could not tell what role they had.
--   2. Staff sign in with a username rather than an email. profiles had no username column, and
--      the adapter queried one.
--   3. "Staff cannot change their own password without an admin" had nowhere to be recorded.
--
-- And one thing was possible but not permitted: a customer approving a quote could not tell the
-- workshop, because inserting a notification for somebody else is staff-only - correctly, or a
-- customer could write into any employee's notifications.
-- Run after 0010_cart_line_uniqueness.sql.

-- ---------------------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------------------

-- Stored lowercase, so "S.Patel" and "s.patel" are the same person rather than two accounts.
alter table profiles add column if not exists username text;
alter table profiles add column if not exists must_change_password boolean not null default false;
-- Staff cannot change their own password unless an admin has opened the window. Customers and
-- admins always can, which the trigger below sets when the account is created.
alter table profiles add column if not exists password_change_allowed boolean not null default false;

create unique index if not exists profiles_username_key on profiles (lower(username)) where username is not null;

create or replace function normalise_username() returns trigger
language plpgsql as $fn$
begin
  new.username := nullif(lower(btrim(new.username)), '');
  return new;
end $fn$;

drop trigger if exists trg_normalise_username on profiles;
create trigger trg_normalise_username before insert or update of username on profiles
  for each row execute function normalise_username();

-- Registering makes a customer. Not because the form says so - the form is on the attacker's
-- machine - but because this runs inside the database and ignores anything the client sent about
-- roles. A staff or admin account is made by an admin, afterwards, which is an authorised update
-- to an existing row rather than something a stranger can ask for at sign-up.
create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  insert into profiles (id, full_name, email, phone, role, password_change_allowed)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    'customer',
    true
  )
  on conflict (id) do nothing;
  return new;
end $fn$;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user after insert on auth.users
  for each row execute function handle_new_auth_user();

-- Signing in by username has to happen before there is a session, and profiles is readable only
-- to the account itself and to staff - as it should be, or the sign-in form becomes a way to
-- list everyone who works here and their email addresses. This answers exactly one question, for
-- exactly one username, and returns nothing else about the account.
create or replace function email_for_username(p_username text) returns text
language sql stable security definer set search_path = public as $fn$
  select email from profiles
  where username = lower(btrim(p_username)) and not archived and status = 'active'
$fn$;

revoke all on function email_for_username(text) from public;
grant execute on function email_for_username(text) to anon, authenticated;

-- A staff member must not be able to open their own password window, and must not be able to
-- clear the flag that says they still owe a change.
create or replace function guard_profile_password_flags() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if is_admin() or auth.uid() is null then return new; end if;
  if new.id <> auth.uid() then return new; end if;   -- covered by the RLS policy anyway
  if current_profile_role() = 'staff' then
    if new.password_change_allowed is distinct from old.password_change_allowed then
      raise exception 'Only an admin can allow a password change.' using errcode = '42501';
    end if;
    if old.must_change_password and not new.must_change_password
       and old.password_change_allowed is not true then
      raise exception 'Ask an admin to allow the change before setting a new password.' using errcode = '42501';
    end if;
  end if;
  -- Nobody promotes themselves, changes which branch they work at, or renames their own login.
  if new.role is distinct from old.role
     or new.branch_id is distinct from old.branch_id
     or new.username is distinct from old.username
     or new.hourly_rate is distinct from old.hourly_rate
     or new.super_admin is distinct from old.super_admin then
    raise exception 'Only an admin can change that on an account.' using errcode = '42501';
  end if;
  return new;
end $fn$;

drop trigger if exists trg_guard_profile_password_flags on profiles;
create trigger trg_guard_profile_password_flags before update on profiles
  for each row execute function guard_profile_password_flags();

-- The first admin. 0005 made promotion to admin require an existing super admin, which is right
-- for anything coming through the app and impossible on a new database: there is no super admin
-- to do the promoting, so the account that sets the shop up cannot be created at all. Until 0011
-- that never surfaced, because nothing created a profile automatically and the first admin
-- arrived as an INSERT, which this BEFORE UPDATE trigger never saw. Now every account has a
-- profile the moment it is registered, so making one an admin is an update, and it was refused.
--
-- auth.uid() is null only when there is no signed-in user at all: a psql session, a migration, or
-- the service role key. Whoever holds those can drop this trigger anyway, so it is not what is
-- keeping anybody out - the check that matters is the one on requests from the app, and that is
-- unchanged.
create or replace function prevent_unauthorised_admin_promotion() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return new; end if;
  if new.role = 'admin' and old.role <> 'admin' and not is_super_admin() then
    raise exception 'Only a super admin can promote an account to admin.' using errcode = '42501';
  end if;
  return new;
end $fn$;

-- ---------------------------------------------------------------------------------------
-- Letting the customer's answer reach the shop
-- ---------------------------------------------------------------------------------------
-- Approving a quote and answering an offer are the two steps that belong to the customer, and
-- both leave somebody in the shop waiting. Notifications are staff-insert-only, which is right:
-- without that, anyone could write into any employee's bell. So the recipients are worked out
-- here, from the record, and the caller only gets to say it about a record that is theirs.
create or replace function notify_shop_about_repair(
  p_reference text, p_title text, p_body text, p_link text default null
) returns integer
language plpgsql security definer set search_path = public as $fn$
declare
  r repairs;
  sent integer := 0;
begin
  select * into r from repairs where reference = p_reference;
  if not found then return 0; end if;
  -- Only about your own repair. Staff and admins have an insert policy already and do not need
  -- to come through here.
  if r.customer_id is distinct from auth.uid() then
    raise exception 'You can only send an update about your own repair.' using errcode = '42501';
  end if;

  insert into notifications (profile_id, title, body, reference, link)
  select p.id, p_title, p_body, p_reference, p_link
  from profiles p
  where not p.archived and p.status = 'active'
    and (
      -- Whoever is holding it, or the branch counter when nobody is yet.
      (r.technician_id is not null and p.id = r.technician_id)
      or (r.technician_id is null and p.role = 'staff' and p.branch_id = r.branch_id)
      or p.role = 'admin'
    );
  get diagnostics sent = row_count;
  return sent;
end $fn$;

create or replace function notify_shop_about_trade_in(
  p_reference text, p_title text, p_body text, p_link text default null
) returns integer
language plpgsql security definer set search_path = public as $fn$
declare
  t trade_in_requests;
  sent integer := 0;
begin
  select * into t from trade_in_requests where reference = p_reference;
  if not found then return 0; end if;
  if t.customer_id is distinct from auth.uid() then
    raise exception 'You can only send an update about your own sale.' using errcode = '42501';
  end if;

  insert into notifications (profile_id, title, body, reference, link)
  select p.id, p_title, p_body, p_reference, p_link
  from profiles p
  where not p.archived and p.status = 'active'
    and ((p.role = 'staff' and p.branch_id is not distinct from t.branch_id) or p.role = 'admin');
  get diagnostics sent = row_count;
  return sent;
end $fn$;

revoke all on function notify_shop_about_repair(text, text, text, text) from public;
revoke all on function notify_shop_about_trade_in(text, text, text, text) from public;
grant execute on function notify_shop_about_repair(text, text, text, text) to authenticated;
grant execute on function notify_shop_about_trade_in(text, text, text, text) to authenticated;
