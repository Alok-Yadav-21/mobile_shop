-- Loyalty points: one ledger, one balance per customer, eight branches.
--
-- The balance is not a column. It is the sum of the movements below, and that is the whole
-- design: a stored balance can drift out of step with its own history, and the first thing
-- anybody does with a loyalty scheme they do not quite believe is ask where the points went.
--
-- profiles.loyalty_credit_pct has been on the schema since 0001 and nothing has ever read it.
-- It described a different idea — a percentage discount per customer — and leaving it beside a
-- points ledger invites somebody to wire the wrong one up, so it goes.
-- Run after 0013_notify_shop_about_order.sql.

create type loyalty_kind as enum ('earned', 'redeemed', 'reversed', 'adjusted');

create table if not exists loyalty_entries (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references profiles(id) on delete cascade,
  -- Positive adds, negative takes away. Never zero: a movement of nothing is not a movement.
  delta        integer not null check (delta <> 0),
  kind         loyalty_kind not null,
  -- What caused it: 'order', 'repair' or 'adjustment', with the reference of the record. Kept
  -- as text rather than a foreign key because an order and a repair are different tables and a
  -- manual adjustment is neither.
  source_type  text,
  source_ref   text,
  -- Where it happened, for the admin's branch breakdown. Never used to work out a balance: a
  -- customer earning in Woolwich and spending in Orpington has one account, not two.
  branch_id    text references branches(id),
  -- Who did it, for a redemption taken at the counter or an adjustment made by an admin.
  actor_id     uuid references profiles(id),
  -- Required for an adjustment (enforced below): points added or removed by hand are money
  -- owed to a customer, and an adjustment nobody can account for is indistinguishable from a
  -- mistake.
  note         text,
  created_at   timestamptz not null default now(),

  constraint loyalty_adjustment_has_reason
    check (kind <> 'adjusted' or coalesce(btrim(note), '') <> '')
);

create index if not exists loyalty_entries_customer_idx on loyalty_entries (customer_id, created_at desc);
create index if not exists loyalty_entries_source_idx on loyalty_entries (customer_id, source_type, source_ref);

-- Points can only be spent against one transaction once. Earning is deliberately not covered by
-- this: a transaction that crosses the finish line, goes back, and crosses again is settled by
-- posting the difference each time, so it legitimately has several earned/reversed rows.
create unique index if not exists loyalty_one_redemption_per_source
  on loyalty_entries (customer_id, source_type, source_ref)
  where kind = 'redeemed';

-- The balance, as a view rather than a column, so nothing can write one that disagrees with the
-- movements it is supposed to summarise.
create or replace view loyalty_balances
with (security_invoker = true) as
select
  customer_id,
  sum(delta) as points,
  -- Ten points are worth £2, and part-blocks are worth nothing until completed — the same rule
  -- as creditValue() in src/lib/loyalty.js. Written here too because the admin's report reads
  -- this view directly and must not have to re-derive it.
  floor(greatest(sum(delta), 0) / 10) * 2 as credit,
  sum(delta) filter (where kind = 'earned') as earned,
  -sum(delta) filter (where kind = 'redeemed') as redeemed,
  -sum(delta) filter (where kind = 'reversed') as reversed
from loyalty_entries
group by customer_id;

grant select on loyalty_balances to authenticated;

-- ---------------------------------------------------------------------------------------
-- Who may see and do what
-- ---------------------------------------------------------------------------------------
alter table loyalty_entries enable row level security;

-- A customer reads their own. Staff and admins read anyone's — staff need the balance of the
-- person at the counter, because you cannot apply a discount you are not allowed to look at.
create policy "loyalty: own or staff read" on loyalty_entries for select
  using (customer_id = auth.uid() or is_staff_or_admin());

-- Nobody writes their own points. Earning is posted by the triggers below, and redemptions and
-- adjustments go through the functions further down — all of them security definer, so they
-- write regardless of this policy while the client cannot.
--
-- There is deliberately no insert, update or delete policy at all. With RLS on and none
-- defined, every direct write from a client is refused, whoever they are: a ledger a customer
-- can append to is not a ledger.

-- ---------------------------------------------------------------------------------------
-- Earning
-- ---------------------------------------------------------------------------------------

-- Five points per complete £10, and nothing at or below £10 — pointsEarnedFor() in
-- src/lib/loyalty.js, restated here because the triggers run inside the database and cannot
-- call it.
create or replace function loyalty_points_for(p_spend numeric) returns integer
language sql immutable as $fn$
  select case when coalesce(p_spend, 0) <= 10 then 0
              else (floor(p_spend / 10) * 5)::integer end
$fn$;

-- Bring one transaction's points into line with what it currently entitles the customer to.
-- Posts the difference between what this transaction has already been credited and the
-- entitlement now, so the ledger is self-correcting however the status moves.
--
-- Only 'earned' and 'reversed' count towards what has been credited. A redemption can carry the
-- same reference — points spent against the very repair being paid for — and counting it here
-- would make a completed job hand the customer back everything they had just spent.
create or replace function loyalty_settle(
  p_customer uuid, p_source_type text, p_source_ref text, p_target integer,
  p_spend numeric default 0, p_branch text default null
) returns void
language plpgsql security definer set search_path = public as $fn$
declare
  credited integer;
  held integer;
  move integer;
begin
  if p_customer is null then return; end if;

  select coalesce(sum(delta), 0) into credited from loyalty_entries
  where customer_id = p_customer and source_type = p_source_type and source_ref = p_source_ref
    and kind in ('earned', 'reversed');

  move := p_target - credited;
  if move = 0 then return; end if;

  if move < 0 then
    -- Never below zero. A customer who earned points on an order and has since spent them
    -- cannot be left owing; the shop absorbs the difference.
    select coalesce(sum(delta), 0) into held from loyalty_entries where customer_id = p_customer;
    move := -least(-move, greatest(held, 0));
    if move = 0 then return; end if;
  end if;

  insert into loyalty_entries (customer_id, delta, kind, source_type, source_ref, branch_id, note)
  values (
    p_customer, move,
    case when move > 0 then 'earned' else 'reversed' end::loyalty_kind,
    p_source_type, p_source_ref, p_branch,
    case when move > 0 then move || ' points on £' || round(coalesce(p_spend, 0), 2)
         else abs(move) || ' points returned on ' || p_source_ref end
  );
end $fn$;

-- An order earns when the goods reach the customer, and gives the points back if it is later
-- refunded or cancelled. Points already spent against the order reduce what it earns, or a
-- discount would pay for its own points.
create or replace function loyalty_settle_order() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  spent numeric := 0;
  paid numeric;
begin
  if new.customer_id is null then return new; end if;

  select coalesce(-sum(delta), 0) / 10 * 2 into spent from loyalty_entries
  where customer_id = new.customer_id and source_type = 'order'
    and source_ref = new.reference and kind = 'redeemed';

  paid := greatest(coalesce(new.total, 0) - spent, 0);

  perform loyalty_settle(
    new.customer_id, 'order', new.reference,
    case when new.status in ('delivered', 'collected') then loyalty_points_for(paid) else 0 end,
    paid, new.branch_id
  );
  return new;
end $fn$;

drop trigger if exists trg_loyalty_settle_order on orders;
create trigger trg_loyalty_settle_order after insert or update of status on orders
  for each row execute function loyalty_settle_order();

-- A repair is paid at the counter when the device is handed back, so 'completed' is the moment
-- money changes hands and the quote is what was charged.
create or replace function loyalty_settle_repair() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  spent numeric := 0;
  paid numeric;
begin
  if new.customer_id is null then return new; end if;

  select coalesce(-sum(delta), 0) / 10 * 2 into spent from loyalty_entries
  where customer_id = new.customer_id and source_type = 'repair'
    and source_ref = new.reference and kind = 'redeemed';

  paid := greatest(coalesce(new.quote, 0) - spent, 0);

  perform loyalty_settle(
    new.customer_id, 'repair', new.reference,
    case when new.status = 'completed' then loyalty_points_for(paid) else 0 end,
    paid, new.branch_id
  );
  return new;
end $fn$;

drop trigger if exists trg_loyalty_settle_repair on repairs;
create trigger trg_loyalty_settle_repair after insert or update of status on repairs
  for each row execute function loyalty_settle_repair();

-- ---------------------------------------------------------------------------------------
-- Spending
-- ---------------------------------------------------------------------------------------

-- Putting points against a bill. The three limits are applied here, against the balance read
-- inside the transaction rather than the one the screen was showing: what the customer holds,
-- the 20% cap, and blocks of ten.
create or replace function loyalty_redeem(
  p_customer uuid, p_points integer, p_total numeric,
  p_source_type text, p_source_ref text, p_branch text default null
) returns integer
language plpgsql security definer set search_path = public as $fn$
declare
  held integer;
  cap integer;
  taking integer;
begin
  -- Your own points, or a staff member spending them on your behalf at the counter.
  if p_customer is distinct from auth.uid() and not is_staff_or_admin() then
    raise exception 'You can only use your own loyalty points.' using errcode = '42501';
  end if;

  select coalesce(sum(delta), 0) into held from loyalty_entries where customer_id = p_customer;

  cap := least(
    (floor(greatest(held, 0) / 10) * 10)::integer,
    (floor((coalesce(p_total, 0) * 0.2) / 2) * 10)::integer
  );
  taking := least(greatest((floor(coalesce(p_points, 0) / 10) * 10)::integer, 0), cap);
  if taking <= 0 then return 0; end if;

  -- The unique index refuses a second redemption against the same transaction; this turns that
  -- into something a person can read.
  if exists (select 1 from loyalty_entries where customer_id = p_customer
             and source_type = p_source_type and source_ref = p_source_ref and kind = 'redeemed') then
    raise exception 'Points have already been redeemed against this transaction.' using errcode = '23505';
  end if;

  insert into loyalty_entries (customer_id, delta, kind, source_type, source_ref, branch_id, actor_id, note)
  values (p_customer, -taking, 'redeemed', p_source_type, p_source_ref, p_branch, auth.uid(),
          taking || ' points off ' || p_source_ref);
  return taking;
end $fn$;

-- Adding or removing points by hand. Admin only, always with a reason, and never below zero.
create or replace function loyalty_adjust(
  p_customer uuid, p_delta integer, p_reason text
) returns integer
language plpgsql security definer set search_path = public as $fn$
declare held integer;
begin
  if not is_admin() then
    raise exception 'Only an admin can adjust loyalty points.' using errcode = '42501';
  end if;
  if coalesce(p_delta, 0) = 0 then
    raise exception 'Enter the number of points to add or remove.' using errcode = '23514';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required for a manual adjustment.' using errcode = '23514';
  end if;

  select coalesce(sum(delta), 0) into held from loyalty_entries where customer_id = p_customer;
  if held + p_delta < 0 then
    raise exception 'That would take the balance below zero - this account holds % points.', held
      using errcode = '23514';
  end if;

  insert into loyalty_entries (customer_id, delta, kind, source_type, actor_id, note)
  values (p_customer, p_delta, 'adjusted', 'adjustment', auth.uid(), btrim(p_reason));
  return held + p_delta;
end $fn$;

revoke all on function loyalty_redeem(uuid, integer, numeric, text, text, text) from public;
revoke all on function loyalty_adjust(uuid, integer, text) from public;
grant execute on function loyalty_redeem(uuid, integer, numeric, text, text, text) to authenticated;
grant execute on function loyalty_adjust(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------------------
-- What the app records alongside a transaction
-- ---------------------------------------------------------------------------------------
-- The discount is stored on the record rather than deducted from it. An order's total is what
-- was actually paid and its subtotal is what the line items come to; a repair's quote stays
-- what the customer approved, and what is owed at the counter is the quote less this.
alter table orders  add column if not exists loyalty_points_used integer not null default 0;
alter table orders  add column if not exists loyalty_discount numeric(8,2) not null default 0;
alter table repairs add column if not exists loyalty_points_used integer not null default 0;
alter table repairs add column if not exists loyalty_discount numeric(8,2) not null default 0;

-- Unused since 0001 and superseded by the ledger. See the note at the top of this file.
alter table profiles drop column if exists loyalty_credit_pct;
