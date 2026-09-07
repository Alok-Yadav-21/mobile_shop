-- The workflow rules the app enforces, expressed inside the database.
--
-- Everything in src/lib/repairRules.js and src/lib/authz.js runs on the customer's own machine.
-- That is where the wording of the refusals comes from, and it is worth having, but it is not a
-- boundary: the person it restricts owns the browser it runs in. This file re-states the same
-- rules as policies and triggers, where the client cannot reach them.
--
-- The three rules that were only ever enforced client-side:
--   1. Only the technician a repair is assigned to may move it. Not a colleague, not an admin.
--   2. Only an admin may assign, and assigning is all an admin does to a repair's progress.
--   3. A quote reaches the customer only once it is sent, and it cannot be sent without a figure.
--
-- Plus the schema the app already writes but the database never had: order assignment, and the
-- status history behind the customer's progress timeline for orders and trade-ins.
-- Run after 0007_shifts_and_costs.sql.

-- ---------------------------------------------------------------------------------------
-- Orders: who is fulfilling this one
-- ---------------------------------------------------------------------------------------

-- The counterpart of repairs.technician_id. Without it an order could be assigned in the app
-- and the assignment had nowhere to live, so "only the assignee may move it" had nothing to
-- check against.
alter table orders add column if not exists assigned_to uuid references profiles(id);
alter table orders add column if not exists assigned_by uuid references profiles(id);
alter table orders add column if not exists assigned_at timestamptz;

create index if not exists orders_assigned_idx on orders (assigned_to) where assigned_to is not null;

-- ---------------------------------------------------------------------------------------
-- Status history for orders and trade-ins
-- ---------------------------------------------------------------------------------------
-- repairs already had repair_status_history; orders and trade-ins did not, so the customer's
-- progress timeline for a purchase or a sale had nothing behind it but the current status.
-- The timeline hides steps that were skipped, which it can only know from history.

create table if not exists order_status_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  status     order_status not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references profiles(id)
);
create index if not exists order_status_history_order_idx on order_status_history (order_id, changed_at);

create table if not exists trade_in_status_history (
  id          uuid primary key default gen_random_uuid(),
  trade_in_id uuid not null references trade_in_requests(id) on delete cascade,
  status      trade_in_status not null,
  changed_at  timestamptz not null default now(),
  changed_by  uuid references profiles(id)
);
create index if not exists trade_in_status_history_idx on trade_in_status_history (trade_in_id, changed_at);

-- History is written by the database on the way past, not by the client. A client that has to
-- remember to append a history row is a client that can forget to, or can lie about the order
-- events happened in.
create or replace function record_status_change() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if tg_table_name = 'orders' then
      insert into order_status_history (order_id, status, changed_by) values (new.id, new.status, auth.uid());
    elsif tg_table_name = 'trade_in_requests' then
      insert into trade_in_status_history (trade_in_id, status, changed_by) values (new.id, new.status, auth.uid());
    elsif tg_table_name = 'repairs' then
      insert into repair_status_history (repair_id, status, changed_by) values (new.id, new.status, auth.uid());
    end if;
  end if;
  return new;
end $fn$;

drop trigger if exists trg_orders_history on orders;
create trigger trg_orders_history after insert or update of status on orders
  for each row execute function record_status_change();

drop trigger if exists trg_trade_in_history on trade_in_requests;
create trigger trg_trade_in_history after insert or update of status on trade_in_requests
  for each row execute function record_status_change();

drop trigger if exists trg_repairs_history on repairs;
create trigger trg_repairs_history after insert or update of status on repairs
  for each row execute function record_status_change();

alter table order_status_history enable row level security;
create policy "order_status_history: visible with order" on order_status_history for select
  using (exists (
    select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_staff_or_admin())
  ));

alter table trade_in_status_history enable row level security;
create policy "trade_in_status_history: visible with request" on trade_in_status_history for select
  using (exists (
    select 1 from trade_in_requests t where t.id = trade_in_id
      and (t.customer_id = auth.uid() or is_staff_or_admin())
  ));

-- No insert policy on either: the trigger is security definer, so it writes regardless, and
-- nothing else has any business adding a history row by hand.

-- ---------------------------------------------------------------------------------------
-- Rules 1 and 2: a repair belongs to the technician it was given to
-- ---------------------------------------------------------------------------------------
-- RLS can say who may update the row. It cannot say "may update these columns but not those",
-- and the whole rule here is about which columns: an admin may set technician_id and nothing
-- else, a technician may set everything except technician_id and only on their own jobs. So
-- the column-level half is a trigger.

create or replace function guard_repair_update() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  actor_role user_role := current_profile_role();
  status_changed boolean := new.status is distinct from old.status;
  quote_changed boolean := new.quote is distinct from old.quote;
  assignment_changed boolean := new.technician_id is distinct from old.technician_id;
begin
  -- The customer's own two moves: answering a quote they have been sent, and withdrawing a
  -- booking nobody has started on. Nothing else on the row is theirs to touch.
  if actor_role = 'customer' then
    if old.customer_id <> auth.uid() then
      raise exception 'You can only change your own booking.' using errcode = '42501';
    end if;
    if assignment_changed or quote_changed then
      raise exception 'You can only answer a quote, or cancel your own booking.' using errcode = '42501';
    end if;
    if status_changed
       and not (old.status = 'quote_awaiting_approval' and new.status in ('repair_in_progress', 'cancelled'))
       and not (new.status = 'cancelled' and old.status in ('booking_received', 'awaiting_device')) then
      raise exception 'This repair can no longer be cancelled online - please call the branch.' using errcode = '42501';
    end if;
    return new;
  end if;

  -- Assignment is an admin's decision, and it is the only part of a repair's progress that is.
  if assignment_changed and actor_role <> 'admin' then
    raise exception 'Only an admin can assign a repair to a technician.' using errcode = '42501';
  end if;

  -- An admin hands the job to somebody, and that is where their part in the work ends.
  -- Recording progress is the technician's account of what they actually did. Cancelling stays
  -- open to them, because calling a job off is a management decision rather than a workshop one.
  if (status_changed or quote_changed)
     and actor_role = 'admin' and new.status is distinct from 'cancelled' then
    raise exception 'Progress on a repair is recorded by the technician it is assigned to.' using errcode = '42501';
  end if;

  -- For staff this covers the whole row, not only status and quote: the notes, the symptoms and
  -- the parts fitted are all one person's account of one job, and a colleague writing into them
  -- is the same problem as a colleague moving the status.
  if actor_role = 'staff' then
    if old.technician_id is null then
      raise exception 'This repair has not been assigned to anyone yet.' using errcode = '42501';
    elsif old.technician_id <> auth.uid() then
      raise exception 'This repair is assigned to a colleague.' using errcode = '42501';
    end if;
  end if;

  -- Rule 3, the half that protects the customer from a meaningless message: asking them to
  -- approve a quote that has no amount on it asks them to approve nothing.
  if status_changed and new.status = 'quote_awaiting_approval'
     and (new.quote is null or new.quote <= 0) then
    raise exception 'Enter the quote amount before sending it to the customer.' using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end $fn$;

drop trigger if exists trg_guard_repair_update on repairs;
create trigger trg_guard_repair_update before update on repairs
  for each row execute function guard_repair_update();

-- The update policy has to admit the customer's own row now, or their approve/decline never
-- reaches the trigger that permits it. 0002 allowed staff and admin only.
drop policy if exists "repairs: staff/admin update" on repairs;
create policy "repairs: staff/admin update" on repairs for update
  using (
    customer_id = auth.uid()
    or (current_profile_role() = 'staff' and branch_id = current_profile_branch())
    or is_admin()
  );

-- ---------------------------------------------------------------------------------------
-- Rule 3: the quote is not the customer's to see until it is sent
-- ---------------------------------------------------------------------------------------
-- A figure sitting in repairs.quote while the technician is still working it out is a draft.
-- The app strips it from customer reads; a customer querying PostgREST directly got it anyway,
-- because a select policy grants the whole row or none of it. A view is the column-level
-- answer: customer-facing reads go through this, and it cannot return a draft.
create or replace view repairs_for_customer
with (security_invoker = true) as
select
  r.id, r.reference, r.customer_id, r.branch_id, r.device_category, r.brand, r.model,
  r.problem, r.symptoms, r.fulfilment, r.status, r.technician_id, r.scheduled_for,
  r.cancellation_reason, r.archived, r.created_at, r.updated_at,
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

-- ---------------------------------------------------------------------------------------
-- Orders: the same assignment rule, for the same reason
-- ---------------------------------------------------------------------------------------
create or replace function guard_order_update() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  actor_role user_role := current_profile_role();
  status_changed boolean := new.status is distinct from old.status;
  assignment_changed boolean := new.assigned_to is distinct from old.assigned_to;
begin
  -- A customer may cancel their own order, up to the point where it has left our hands.
  if actor_role = 'customer' then
    if old.customer_id <> auth.uid() or assignment_changed then
      raise exception 'You can only cancel your own order.' using errcode = '42501';
    end if;
    if status_changed then
      if new.status <> 'cancelled' then
        raise exception 'You can only cancel your own order.' using errcode = '42501';
      end if;
      if old.status in ('dispatched', 'delivered', 'collected', 'cancelled') then
        raise exception 'This order can no longer be cancelled online.' using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  if assignment_changed then
    if actor_role <> 'admin' then
      raise exception 'Only an admin can assign an order.' using errcode = '42501';
    end if;
    new.assigned_by := auth.uid();
    new.assigned_at := now();
  end if;

  -- Unlike a repair, an admin keeps the order status: they are the one answering the phone
  -- about a delivery. Staff are held to their own queue.
  if status_changed and actor_role = 'staff' then
    if old.assigned_to is null then
      raise exception 'This order has not been assigned to anyone yet.' using errcode = '42501';
    elsif old.assigned_to <> auth.uid() then
      raise exception 'This order is assigned to a colleague.' using errcode = '42501';
    end if;
  end if;

  return new;
end $fn$;

drop trigger if exists trg_guard_order_update on orders;
create trigger trg_guard_order_update before update on orders
  for each row execute function guard_order_update();

drop policy if exists "orders: staff/admin update" on orders;
create policy "orders: staff/admin update" on orders for update
  using (customer_id = auth.uid() or is_staff_or_admin());

-- ---------------------------------------------------------------------------------------
-- Trade-ins: answering the offer is the customer's move, and only theirs
-- ---------------------------------------------------------------------------------------
create or replace function guard_trade_in_update() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  actor_role user_role := current_profile_role();
  status_changed boolean := new.status is distinct from old.status;
begin
  if actor_role = 'customer' then
    if old.customer_id <> auth.uid()
       or new.indicative_value is distinct from old.indicative_value
       or new.final_offer is distinct from old.final_offer
       or new.internal_notes is distinct from old.internal_notes then
      raise exception 'You can only answer an offer on your own request.' using errcode = '42501';
    end if;
    if status_changed
       and not (old.status = 'offer_sent' and new.status in ('offer_accepted', 'offer_declined'))
       and not (new.status = 'cancelled' and old.status in ('submitted', 'valuation_review')) then
      raise exception 'You can only accept or decline the offer you were sent.' using errcode = '42501';
    end if;
    return new;
  end if;

  -- Accepting on the customer's behalf is how a sale becomes a dispute. Staff price it; the
  -- person selling the device is the one who says yes to the price.
  if status_changed and new.status in ('offer_accepted', 'offer_declined') then
    raise exception 'Only the customer can answer their own offer.' using errcode = '42501';
  end if;

  if status_changed and new.status = 'offer_sent'
     and (coalesce(new.final_offer, new.indicative_value) is null
          or coalesce(new.final_offer, new.indicative_value) <= 0) then
    raise exception 'Enter the offer amount before sending it to the customer.' using errcode = '23514';
  end if;

  return new;
end $fn$;

drop trigger if exists trg_guard_trade_in_update on trade_in_requests;
create trigger trg_guard_trade_in_update before update on trade_in_requests
  for each row execute function guard_trade_in_update();

drop policy if exists "trade_in: staff/admin update" on trade_in_requests;
create policy "trade_in: staff/admin update" on trade_in_requests for update
  using (customer_id = auth.uid() or is_staff_or_admin());

-- ---------------------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------------------
-- The app carries a link and a reference on every notification so the bell can take you to the
-- thing that moved; the table had nowhere to put either. And 0002 gave nobody a delete policy,
-- which is why "clear notifications" had nothing to call.
alter table notifications add column if not exists link text;
alter table notifications add column if not exists reference text;

drop policy if exists "notifications: owner mark read" on notifications;
create policy "notifications: owner mark read" on notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "notifications: owner clear" on notifications for delete
  using (profile_id = auth.uid());
