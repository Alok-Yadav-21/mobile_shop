-- A colleague's pay is nobody else's business.
--
-- profiles is readable by any staff member — it has to be, since rotas, repair assignment and
-- the counter all need to look each other up. But row-level security is exactly that: it decides
-- which rows you get, never which columns. hourly_rate sat on that table, so any staff member
-- could read every colleague's rate straight off PostgREST with one request.
--
-- The mock adapter had always stripped it (redactUser in src/lib/authz.js). Nothing stripped it
-- here, and no policy could have: hiding a column takes a column privilege.
--
-- Note on how this has to be written. `revoke select (hourly_rate)` on its own does nothing when
-- a table-wide `grant select` is already in place — Supabase grants that to anon/authenticated on
-- every table — because a table grant covers all columns and a column revoke only removes
-- column-specific grants. The blanket grant has to come off first, and the columns that are
-- readable granted back by name.
--
-- visible_pay_rates already exists for this and answers correctly — your own rate, or everyone's
-- if you are an admin. It is an ordinary view owned by postgres, so it keeps reading the column
-- after this while the table itself stops handing it out.
-- Run after 0015_order_stock_movement.sql.

revoke select on profiles from anon, authenticated;
revoke update on profiles from anon, authenticated;

grant select (
  id, full_name, email, phone, role, branch_id, created_at, status, super_admin,
  last_active_at, archived, job_title, specialisations, username,
  must_change_password, password_change_allowed
) on profiles to anon, authenticated;

-- Writable columns are a shorter list again: an account's own details and the flags an admin
-- manages. Which of these a given caller may actually change is still decided by the RLS update
-- policy and the guard trigger in 0011 — this only removes hourly_rate from the conversation
-- entirely, so a staff member cannot set a rate even on their own row.
grant update (
  full_name, phone, role, branch_id, status, super_admin, last_active_at, archived,
  job_title, specialisations, username, must_change_password, password_change_allowed
) on profiles to authenticated;

-- Everything that legitimately needs a rate goes through here.
grant select on visible_pay_rates to authenticated;
