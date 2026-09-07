-- Who is working on your device.
--
-- The customer's tracking page has a "Technician" row, and against a real backend it read "—" on
-- every repair. repairs_for_customer runs as the caller (security_invoker), so the join it would
-- need is to profiles, and a customer cannot read a staff profile — correctly: the staff list is
-- not theirs to browse.
--
-- So this returns one field, for one person, on a repair that is already the caller's own. Not
-- the staff table, not a list, not an email address — the name of whoever is holding your phone,
-- which is what the page was always meant to say.
-- Run after 0011_accounts_and_notices.sql.

create or replace function technician_name_for(p_repair_id uuid) returns text
language sql stable security definer set search_path = public as $fn$
  select p.full_name
  from repairs r
  join profiles p on p.id = r.technician_id
  where r.id = p_repair_id
    and (
      r.customer_id = auth.uid()
      or (current_profile_role() = 'staff' and r.branch_id = current_profile_branch())
      or is_admin()
    )
$fn$;

revoke all on function technician_name_for(uuid) from public;
grant execute on function technician_name_for(uuid) to authenticated;

-- Dropped rather than replaced: `create or replace view` can only change what the existing
-- columns select, not add one in the middle, and adding technician_name before quote is exactly
-- that. The grant below puts back what the drop takes away.
drop view if exists repairs_for_customer;

create view repairs_for_customer
with (security_invoker = true) as
select
  r.id, r.reference, r.customer_id, r.branch_id, r.device_category, r.brand, r.model,
  r.problem, r.symptoms, r.fulfilment, r.status, r.technician_id, r.scheduled_for,
  r.cancellation_reason, r.archived, r.created_at, r.updated_at,
  technician_name_for(r.id) as technician_name,
  -- Sent, or sent previously and since answered. Never a working figure.
  case
    when r.status = 'quote_awaiting_approval' then r.quote
    when exists (
      select 1 from repair_status_history h
      where h.repair_id = r.id and h.status = 'quote_awaiting_approval'
    ) then r.quote
    else null
  end as quote
from repairs r;

grant select on repairs_for_customer to authenticated, anon;
