-- Timesheets, stock purchase costs, and the row-level security that makes role separation
-- real rather than cosmetic.
--
-- The rules enforced here are the same ones src/lib/authz.js applies in the mock adapter, but
-- these run inside Postgres against auth.uid(), so they hold no matter what the client sends:
-- editing the frontend, replaying a request, or calling PostgREST directly all hit the same
-- policies. Hiding a control in the UI is a convenience; this file is the boundary.

-- ---------------------------------------------------------------------------------------
-- Shifts (timesheets)
-- ---------------------------------------------------------------------------------------

-- Two pay bases live on the profile. A shift recorded as hours or start/finish times is paid
-- at hourly_rate; one recorded as a full day is paid a flat daily_rate and is never converted
-- into an hours figure. Wages are always derived from these plus approved shifts.
alter table profiles add column if not exists hourly_rate numeric(6,2);
alter table profiles add column if not exists daily_rate  numeric(7,2);

create type shift_status as enum ('pending', 'approved', 'rejected');
create type shift_entry_mode as enum ('full_day', 'hours', 'times');

create table if not exists shifts (
  id            uuid primary key default gen_random_uuid(),
  staff_id      uuid not null references profiles(id) on delete cascade,
  branch_id     text not null references branches(id),
  worked_on     date not null,
  entry_mode    shift_entry_mode not null default 'times',
  -- Populated for entry_mode = 'times'.
  starts_at     time,
  ends_at       time,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  -- Populated for entry_mode = 'hours'.
  hours         numeric(5,2) check (hours is null or (hours > 0 and hours <= 16)),
  -- Submissions always start pending. Only review_shift() below can set 'approved'.
  status        shift_status not null default 'pending',
  submitted_by  uuid references profiles(id),
  submitted_at  timestamptz not null default now(),
  reviewed_by   uuid references profiles(id),
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now(),

  -- One live submission per person per day; a rejected one may be superseded.
  constraint shifts_one_per_day unique (staff_id, worked_on),
  -- The entry mode must actually carry the data it claims to.
  constraint shifts_entry_mode_complete check (
    (entry_mode = 'full_day')
    or (entry_mode = 'hours' and hours is not null)
    or (entry_mode = 'times' and starts_at is not null and ends_at is not null)
  ),
  -- A rejection has to say why, so the staff member can correct and resubmit.
  constraint shifts_rejection_reason check (status <> 'rejected' or review_note is not null)
);

create index if not exists shifts_staff_idx on shifts (staff_id, worked_on desc);
create index if not exists shifts_status_idx on shifts (status) where status = 'pending';
create index if not exists shifts_branch_idx on shifts (branch_id, worked_on desc);

-- staff_id is taken from the session, never from the payload, so a submission cannot be
-- filed against a colleague even if the client sends someone else's id.
create or replace function shifts_set_owner() returns trigger
language plpgsql security definer as $$
begin
  if not is_admin() then
    new.staff_id := auth.uid();
    new.status := 'pending';          -- staff can never self-approve
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  new.submitted_by := auth.uid();
  return new;
end $$;

create trigger shifts_set_owner_trg before insert on shifts
  for each row execute function shifts_set_owner();

-- A staff member may correct their own submission only while it is still pending, and may
-- never move it out of 'pending' themselves.
create or replace function shifts_guard_update() returns trigger
language plpgsql security definer as $$
begin
  if is_admin() then return new; end if;
  if old.status <> 'pending' and new.status is not distinct from old.status then
    raise exception 'This shift has already been reviewed.' using errcode = '42501';
  end if;
  if new.status not in ('pending') then
    raise exception 'Only an admin can approve or reject submitted hours.' using errcode = '42501';
  end if;
  new.staff_id := old.staff_id;
  return new;
end $$;

create trigger shifts_guard_update_trg before update on shifts
  for each row execute function shifts_guard_update();

alter table shifts enable row level security;

-- Read: your own timesheet, or everything if you are an admin. A staff member querying the
-- table without a filter still receives only their own rows.
create policy "shifts: own or admin read" on shifts for select
  using (staff_id = auth.uid() or is_admin());

-- Write: staff insert for themselves (the trigger pins staff_id regardless), admins for anyone.
create policy "shifts: staff insert own" on shifts for insert
  with check (is_admin() or current_profile_role() = 'staff');

create policy "shifts: own pending update" on shifts for update
  using ((staff_id = auth.uid() and status <> 'approved') or is_admin())
  with check (staff_id = auth.uid() or is_admin());

create policy "shifts: own pending delete" on shifts for delete
  using ((staff_id = auth.uid() and status = 'pending') or is_admin());

-- Approval is the act that makes hours payable, so it is a privileged function rather than a
-- column a client can set. security definer + the explicit is_admin() check means calling it
-- as a staff member fails inside the database.
create or replace function review_shift(shift_id uuid, decision text, note text default null)
returns shifts
language plpgsql security definer as $$
declare
  updated shifts;
begin
  if not is_admin() then
    raise exception 'Only an admin can review submitted hours.' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'A shift can only be approved or rejected.';
  end if;
  if decision = 'rejected' and coalesce(btrim(note), '') = '' then
    raise exception 'A reason is required to reject submitted hours.';
  end if;

  update shifts set
    status = decision::shift_status,
    review_note = nullif(btrim(note), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = shift_id
  returning * into updated;

  return updated;
end $$;

revoke all on function review_shift(uuid, text, text) from public;
grant execute on function review_shift(uuid, text, text) to authenticated;

-- What each approved shift is worth, resolved exactly the way src/lib/wages.js resolves it,
-- so the database and the app can never disagree. Approved rows only, by construction.
--
-- A full day carries no hours at all: it is one day at the day rate. Expressing it as some
-- assumed number of hours is precisely what this model avoids, so paid_hours is 0 for it and
-- full_days is 1 instead.
create or replace view payable_shift_pay as
select
  s.id,
  s.staff_id,
  s.branch_id,
  s.worked_on,
  case when s.entry_mode = 'full_day' then 1 else 0 end as full_days,
  case s.entry_mode
    when 'full_day' then 0
    when 'hours'    then least(s.hours, 16)
    else greatest(0, (extract(epoch from (
           case when s.ends_at >= s.starts_at then s.ends_at - s.starts_at
                else s.ends_at + interval '24 hours' - s.starts_at end
         )) / 3600.0) - (s.break_minutes / 60.0))
  end as paid_hours,
  case
    when s.entry_mode = 'full_day' then coalesce(p.daily_rate, 96)
    else coalesce(p.hourly_rate, 12) * (case s.entry_mode
      when 'hours' then least(s.hours, 16)
      else greatest(0, (extract(epoch from (
             case when s.ends_at >= s.starts_at then s.ends_at - s.starts_at
                  else s.ends_at + interval '24 hours' - s.starts_at end
           )) / 3600.0) - (s.break_minutes / 60.0))
    end)
  end as pay
from shifts s
join profiles p on p.id = s.staff_id
where s.status = 'approved';

-- ---------------------------------------------------------------------------------------
-- Stock purchases — what the business pays for stock is admin-only commercial data.
-- ---------------------------------------------------------------------------------------

create sequence if not exists stock_purchase_seq start 9000;

create table if not exists stock_purchases (
  id            uuid primary key default gen_random_uuid(),
  reference     text unique not null default 'VT-PO-' || nextval('stock_purchase_seq'),
  branch_id     text not null references branches(id),
  product_id    text references products(id),
  product_name  text,
  quantity      integer not null check (quantity > 0),
  unit_cost     numeric(10,2) not null check (unit_cost >= 0),
  supplier      text,
  purchased_at  timestamptz not null default now()
);

create index if not exists stock_purchases_branch_idx on stock_purchases (branch_id, purchased_at desc);

alter table stock_purchases enable row level security;

-- No staff or customer policy exists, which is the point: with RLS on and only an admin
-- policy defined, every other role reads zero rows and every write is refused.
create policy "stock_purchases: admin only" on stock_purchases for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------------------
-- Pay rates. A staff member may read their own rate; only an admin may read anyone else's
-- or change one. profiles already has a read policy, so this restricts the column via a view
-- that the app uses wherever compensation is displayed.
-- ---------------------------------------------------------------------------------------

create or replace view visible_pay_rates as
select p.id, p.hourly_rate, p.daily_rate
from profiles p
where p.id = auth.uid() or is_admin();

grant select on visible_pay_rates to authenticated;
