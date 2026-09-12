-- A staff member can give up their own password grant, but still cannot give themselves one.
--
-- 0011 forbade staff touching password_change_allowed at all. That was one rule too broad: when
-- somebody sets the password an admin issued them, the adapter clears both flags together — the
-- "you still owe a change" flag and the grant it just used — and the guard refused the whole
-- statement. Neither flag landed, so must_change_password stayed true and the account was sent
-- back to /set-password on every sign-in, for good. A new technician could never reach the app.
--
-- The direction is what matters. Handing back a grant you have just spent is the normal end of
-- the flow; issuing yourself one is the thing worth stopping, and it still is.
-- Run after 0017_branch_phone.sql.

create or replace function guard_profile_password_flags() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if is_admin() or auth.uid() is null then return new; end if;
  if new.id <> auth.uid() then return new; end if;   -- covered by the RLS policy anyway
  if current_profile_role() = 'staff' then
    -- Giving the grant up is allowed; granting it to yourself is not.
    if new.password_change_allowed is distinct from old.password_change_allowed
       and new.password_change_allowed is not false then
      raise exception 'Only an admin can allow a password change.' using errcode = '42501';
    end if;
    if old.must_change_password and not new.must_change_password
       and old.password_change_allowed is not true then
      raise exception 'Ask an admin to allow the change before setting a new password.' using errcode = '42501';
    end if;
  end if;
  -- Nobody promotes themselves, changes which branch they work at, or renames their own login.
  -- hourly_rate is kept in this list even though 0016 revoked the column privilege outright, so
  -- the rule survives if that grant is ever loosened again. It is money; two locks is right.
  if new.role is distinct from old.role
     or new.branch_id is distinct from old.branch_id
     or new.username is distinct from old.username
     or new.hourly_rate is distinct from old.hourly_rate
     or new.super_admin is distinct from old.super_admin then
    raise exception 'Only an admin can change that on an account.' using errcode = '42501';
  end if;
  return new;
end $fn$;
