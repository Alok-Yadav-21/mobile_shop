-- Does the database actually refuse what the app refuses?
--
-- Run against a local stack:  npx supabase db reset && psql "$(npx supabase status -o env | grep DB_URL)" -f supabase/tests/authz.test.sql
--
-- Every check here is a write attempted *as* a role, through RLS, and then verified by whether
-- a row moved. That distinction matters more than it sounds: a policy that refuses an UPDATE
-- does not raise an error, it updates nothing and reports success. Checking only that no
-- exception was thrown would pass a database with no policies at all.

\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ---------------------------------------------------------------------------------------
-- Assertions
-- ---------------------------------------------------------------------------------------

create or replace function test_blocked(stmt text, label text) returns void
language plpgsql as $fn$
declare n int;
begin
  begin
    execute stmt;
    get diagnostics n = row_count;
    if n > 0 then
      raise exception 'FAIL  % -- % row(s) were written', label, n;
    end if;
    raise notice 'pass (no rows)  %', label;
  exception
    -- The codes the guards raise deliberately: 42501 insufficient_privilege, 23514
    -- check_violation for a validation failure, 23505 unique_violation for something already
    -- done once. Not P0001, which is what a bare `raise exception` uses — and what the FAIL
    -- above uses, so catching it would swallow the failures this function exists to report.
    when sqlstate '42501' or sqlstate '23514' or sqlstate '23505' then
      raise notice 'pass (refused)  %', label;
  end;
end $fn$;

create or replace function test_allowed(stmt text, label text) returns void
language plpgsql as $fn$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'FAIL  % -- allowed, but nothing was written', label;
  end if;
  raise notice 'pass (applied)  %', label;
exception
  when sqlstate '42501' or sqlstate '23514' then
    raise exception 'FAIL  % -- refused: %', label, sqlerrm;
end $fn$;

create or replace function test_reads(stmt text, expected int, label text) returns void
language plpgsql as $fn$
declare n int;
begin
  execute 'select count(*) from (' || stmt || ') q' into n;
  if n <> expected then
    raise exception 'FAIL  % -- saw % row(s), expected %', label, n, expected;
  end if;
  raise notice 'pass (sees %)  %', n, label;
end $fn$;

create or replace function become(who uuid) returns void
language plpgsql as $fn$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', who, 'role', 'authenticated')::text, false);
end $fn$;

-- Signed out entirely. `set role anon` alone is not that: the role changes but the claims stay
-- put, so the session keeps whoever it last became and auth.uid() still answers with their id.
-- Getting this wrong made an earlier run of this file report that anon could read every profile,
-- which was the test carrying an admin's identity into a query it meant to send as a stranger.
create or replace function sign_out() returns void
language plpgsql as $fn$
begin
  perform set_config('request.jwt.claims', '', false);
  perform set_config('request.jwt.claim.sub', '', false);
end $fn$;

-- ---------------------------------------------------------------------------------------
-- Cast
-- ---------------------------------------------------------------------------------------

\set admin_id    '''11111111-1111-1111-1111-111111111111'''
\set techA_id    '''22222222-2222-2222-2222-222222222222'''
\set techB_id    '''33333333-3333-3333-3333-333333333333'''
\set cust1_id    '''44444444-4444-4444-4444-444444444444'''
\set cust2_id    '''55555555-5555-5555-5555-555555555555'''

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
  (:admin_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local',  '', now(), now()),
  (:techA_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'techa@test.local',  '', now(), now()),
  (:techB_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'techb@test.local',  '', now(), now()),
  (:cust1_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cust1@test.local',  '', now(), now()),
  (:cust2_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cust2@test.local',  '', now(), now())
on conflict (id) do nothing;

insert into branches (id, area, local_name, address, postcode)
values ('tst', 'Test branch', 'Test', '1 Test Street', 'BR1 5AL')
on conflict (id) do nothing;

-- Upsert, not insert: 0011 puts a trigger on auth.users that creates a profile for every new
-- account, always as a customer. That is the rule being relied on elsewhere — signing up cannot
-- make you staff — so the rows above already exist by the time we get here, and these have to
-- promote them the way an admin would rather than skip on conflict and leave everyone a customer.
insert into profiles (id, full_name, email, role, branch_id) values
  (:admin_id::uuid, 'Admin',        'admin@test.local', 'admin',    null),
  (:techA_id::uuid, 'Technician A', 'techa@test.local', 'staff',    'tst'),
  (:techB_id::uuid, 'Technician B', 'techb@test.local', 'staff',    'tst'),
  (:cust1_id::uuid, 'Customer One', 'cust1@test.local', 'customer', null),
  (:cust2_id::uuid, 'Customer Two', 'cust2@test.local', 'customer', null)
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, branch_id = excluded.branch_id;

-- The rule itself, since the fixture above depends on it: an account arrives as a customer no
-- matter what, and it takes an admin to make it anything else.
do $$
declare made_role user_role;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_user_meta_data)
  values ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated', 'signup@test.local', '',
          '{"full_name":"Signed Up","role":"admin","phone":"07700 900000"}'::jsonb);
  select role into made_role from profiles where id = '66666666-6666-6666-6666-666666666666';
  if made_role is null then
    raise exception 'FAIL  signing up did not create a profile at all';
  elsif made_role <> 'customer' then
    raise exception 'FAIL  signing up while asking for role=% produced a % account', 'admin', made_role;
  end if;
  raise notice 'pass (customer)  signing up cannot make you anything but a customer';
end $$;

insert into repairs (reference, customer_id, branch_id, device_category, brand, model, problem, status)
values ('TST-1', :cust1_id::uuid, 'tst', 'iPhone', 'Apple', 'iPhone 13', 'Cracked screen', 'booking_received')
on conflict (reference) do nothing;

insert into orders (reference, customer_id, branch_id, status, subtotal, total)
values ('TST-ORD-1', :cust1_id::uuid, 'tst', 'paid', 100, 100)
on conflict (reference) do nothing;

insert into trade_in_requests (reference, customer_id, device_category, brand, model, condition_grade, indicative_value, status)
values ('TST-TI-1', :cust1_id::uuid, 'iPhone', 'Apple', 'iPhone 12', 'Good', 180, 'submitted')
on conflict (reference) do nothing;

set role authenticated;

-- ---------------------------------------------------------------------------------------
-- Repairs: assignment
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== repairs: who may move a job =='

select become(:techA_id::uuid);
select test_blocked(
  $$update repairs set status = 'device_received' where reference = 'TST-1'$$,
  'unassigned repair, any technician');

select become(:techA_id::uuid);
select test_blocked(
  $$update repairs set technician_id = '22222222-2222-2222-2222-222222222222' where reference = 'TST-1'$$,
  'technician assigns the job to themselves');

select become(:admin_id::uuid);
select test_allowed(
  $$update repairs set technician_id = '22222222-2222-2222-2222-222222222222' where reference = 'TST-1'$$,
  'admin assigns the job');

select become(:techB_id::uuid);
select test_blocked(
  $$update repairs set status = 'device_received' where reference = 'TST-1'$$,
  'colleague moves someone else''s job');

select become(:admin_id::uuid);
select test_blocked(
  $$update repairs set status = 'device_received' where reference = 'TST-1'$$,
  'admin records progress on a repair');

select become(:techA_id::uuid);
select test_allowed(
  $$update repairs set status = 'device_received' where reference = 'TST-1'$$,
  'the assigned technician moves it');

-- ---------------------------------------------------------------------------------------
-- Repairs: the quote
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== repairs: the quote =='

select become(:techA_id::uuid);
select test_allowed($$update repairs set status = 'diagnostics' where reference = 'TST-1'$$, 'on to diagnostics');

select test_blocked(
  $$update repairs set status = 'quote_awaiting_approval' where reference = 'TST-1'$$,
  'quote sent with no amount on it');

select become(:cust1_id::uuid);
select test_reads(
  $$select quote from repairs_for_customer where reference = 'TST-1' and quote is not null$$,
  0, 'customer cannot see a quote that has not been sent');

select become(:techA_id::uuid);
select test_allowed(
  $$update repairs set quote = 149.00 where reference = 'TST-1'$$,
  'technician writes a draft figure');

select become(:cust1_id::uuid);
select test_reads(
  $$select quote from repairs_for_customer where reference = 'TST-1' and quote is not null$$,
  0, 'a draft figure is still not the customer''s to see');

select become(:techA_id::uuid);
select test_allowed(
  $$update repairs set status = 'quote_awaiting_approval' where reference = 'TST-1'$$,
  'quote sent, with an amount');

select become(:cust1_id::uuid);
select test_reads(
  $$select quote from repairs_for_customer where reference = 'TST-1' and quote = 149.00$$,
  1, 'customer sees the quote once it is sent');

-- ---------------------------------------------------------------------------------------
-- Repairs: what the customer may do
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== repairs: the customer''s own moves =='

select become(:cust2_id::uuid);
select test_reads($$select 1 from repairs where reference = 'TST-1'$$, 0,
  'another customer cannot see this repair at all');
select test_blocked(
  $$update repairs set status = 'cancelled' where reference = 'TST-1'$$,
  'another customer cancels it');

select become(:cust1_id::uuid);
select test_blocked(
  $$update repairs set quote = 1.00 where reference = 'TST-1'$$,
  'customer edits the quote they were sent');
select test_blocked(
  $$update repairs set technician_id = null where reference = 'TST-1'$$,
  'customer unassigns the technician');
select test_allowed(
  $$update repairs set status = 'repair_in_progress' where reference = 'TST-1'$$,
  'customer approves the quote');
select test_blocked(
  $$update repairs set status = 'cancelled' where reference = 'TST-1'$$,
  'customer cancels once work has started');

-- ---------------------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== orders =='

select become(:techA_id::uuid);
select test_blocked(
  $$update orders set status = 'processing' where reference = 'TST-ORD-1'$$,
  'unassigned order, any staff member');
select test_blocked(
  $$update orders set assigned_to = '22222222-2222-2222-2222-222222222222' where reference = 'TST-ORD-1'$$,
  'staff member assigns an order to themselves');

select become(:admin_id::uuid);
select test_allowed(
  $$update orders set assigned_to = '22222222-2222-2222-2222-222222222222' where reference = 'TST-ORD-1'$$,
  'admin assigns the order');

select become(:techB_id::uuid);
select test_blocked(
  $$update orders set status = 'processing' where reference = 'TST-ORD-1'$$,
  'colleague moves someone else''s order');

select become(:techA_id::uuid);
select test_allowed(
  $$update orders set status = 'processing' where reference = 'TST-ORD-1'$$,
  'the assignee moves it');

-- The one deliberate difference from repairs: an admin keeps the order status.
select become(:admin_id::uuid);
select test_allowed(
  $$update orders set status = 'ready' where reference = 'TST-ORD-1'$$,
  'admin keeps the order status');

select become(:cust2_id::uuid);
select test_blocked(
  $$update orders set status = 'cancelled' where reference = 'TST-ORD-1'$$,
  'another customer cancels this order');

select become(:cust1_id::uuid);
select test_allowed(
  $$update orders set status = 'cancelled' where reference = 'TST-ORD-1'$$,
  'customer cancels their own order before it ships');

-- ---------------------------------------------------------------------------------------
-- Trade-ins
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== trade-ins =='

select become(:techA_id::uuid);
select test_allowed(
  $$update trade_in_requests set status = 'valuation_review' where reference = 'TST-TI-1'$$,
  'staff start the inspection');
select test_allowed(
  $$update trade_in_requests set status = 'offer_sent', final_offer = 165 where reference = 'TST-TI-1'$$,
  'staff send an offer with an amount');
select test_blocked(
  $$update trade_in_requests set status = 'offer_accepted' where reference = 'TST-TI-1'$$,
  'staff accept the offer on the customer''s behalf');

select become(:admin_id::uuid);
select test_blocked(
  $$update trade_in_requests set status = 'offer_accepted' where reference = 'TST-TI-1'$$,
  'admin accepts the offer on the customer''s behalf');

select become(:cust1_id::uuid);
select test_blocked(
  $$update trade_in_requests set final_offer = 900 where reference = 'TST-TI-1'$$,
  'customer raises their own offer');
select test_allowed(
  $$update trade_in_requests set status = 'offer_accepted' where reference = 'TST-TI-1'$$,
  'customer accepts the offer');

-- ---------------------------------------------------------------------------------------
-- Commercial data staff have no business reading
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== what staff and customers cannot read =='

set role postgres;
insert into stock_purchases (branch_id, quantity, unit_cost, supplier, product_name)
values ('tst', 5, 210.00, 'Test Supplier', 'Test part') on conflict do nothing;
update profiles set hourly_rate = 14.50 where id = :techB_id::uuid;
set role authenticated;

select become(:techA_id::uuid);
select test_reads($$select 1 from stock_purchases$$, 0, 'staff read what stock cost the business');
select test_reads($$select 1 from visible_pay_rates where hourly_rate is not null$$, 0,
  'staff read a colleague''s hourly rate');

select become(:cust1_id::uuid);
select test_reads($$select 1 from stock_purchases$$, 0, 'customer reads stock costs');
select test_reads($$select 1 from audit_logs$$, 0, 'customer reads the audit log');

select become(:admin_id::uuid);
select test_reads($$select 1 from stock_purchases$$, 1, 'admin reads stock costs');

-- ---------------------------------------------------------------------------------------
-- History was recorded by the database, not by whoever remembered to
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== status history =='

select become(:cust1_id::uuid);
select test_reads(
  $$select 1 from repair_status_history h join repairs r on r.id = h.repair_id where r.reference = 'TST-1'$$,
  5, 'every repair status change was logged');
select test_reads(
  $$select 1 from order_status_history h join orders o on o.id = h.order_id where o.reference = 'TST-ORD-1'$$,
  4, 'every order status change was logged');
select test_reads(
  $$select 1 from trade_in_status_history h join trade_in_requests t on t.id = h.trade_in_id where t.reference = 'TST-TI-1'$$,
  4, 'every trade-in status change was logged');

-- ---------------------------------------------------------------------------------------
-- What an account may change about itself
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== accounts =='

set role postgres;
update profiles set must_change_password = true, password_change_allowed = false where id = :techA_id::uuid;
set role authenticated;

select become(:techA_id::uuid);
select test_blocked(
  $$update profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222'$$,
  'staff member promotes themselves to admin');
select test_blocked(
  $$update profiles set password_change_allowed = true where id = '22222222-2222-2222-2222-222222222222'$$,
  'staff member opens their own password window');
select test_blocked(
  $$update profiles set must_change_password = false where id = '22222222-2222-2222-2222-222222222222'$$,
  'staff member clears the change they still owe');
select test_blocked(
  $$update profiles set branch_id = 'tst', hourly_rate = 99 where id = '22222222-2222-2222-2222-222222222222'$$,
  'staff member sets their own hourly rate');
select test_allowed(
  $$update profiles set phone = '07700 900999' where id = '22222222-2222-2222-2222-222222222222'$$,
  'staff member updates their own phone number');

select become(:admin_id::uuid);
select test_allowed(
  $$update profiles set password_change_allowed = true where id = '22222222-2222-2222-2222-222222222222'$$,
  'admin opens the password window');

-- Sign-in by username has to work before there is a session, without the profiles table being
-- readable to a stranger.
set role postgres;
update profiles set username = 'S.Patel' where id = :techA_id::uuid;
set role anon;
select sign_out();
select test_reads($$select email_for_username('s.patel')$$, 1, 'username resolves to an email for sign-in');
select test_reads($$select 1 from profiles$$, 0, 'and the profiles table itself stays shut');
select test_reads($$select 1 from repairs$$, 0, 'a stranger reads no repairs');
select test_reads($$select 1 from orders$$, 0, 'a stranger reads no orders');
select test_reads($$select 1 from products where active$$, 29, 'but the shop is still public');
set role authenticated;


-- ---------------------------------------------------------------------------------------
-- Loyalty points
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== loyalty points =='

-- A completed repair pays out. Quoted at £119, so it earns 55 points.
select sign_out();
set role postgres;
insert into repairs (reference, customer_id, branch_id, device_category, brand, model, problem, status, quote)
values ('SPR-LOY-1', :cust1_id::uuid, 'tst', 'iPhone', 'Apple', 'iPhone 13', 'Screen', 'ready_for_collection', 119);
set role authenticated;

select become(:techA_id::uuid);
select test_reads($$select 1 from loyalty_entries where source_ref = 'SPR-LOY-1'$$, 0,
  'nothing is earned before the device is handed back');

-- Signed out as well as switched: `set role postgres` leaves the previous JWT claims in place,
-- so auth.uid() still answers with the technician and the assignment guard refuses the update.
-- The same trap caught this file once before, further up.
select sign_out();
set role postgres;
update repairs set status = 'completed' where reference = 'SPR-LOY-1';
set role authenticated;

select become(:cust1_id::uuid);
select test_reads($$select 1 from loyalty_balances where customer_id = auth.uid() and points = 55$$, 1,
  'a £119 repair earns 55 points');

-- Nobody writes their own points, whoever they are.
select test_blocked(
  $$insert into loyalty_entries (customer_id, delta, kind, note)
    values ('44444444-4444-4444-4444-444444444444', 10000, 'adjusted', 'free points')$$,
  'a customer awards themselves points');

select become(:techA_id::uuid);
select test_blocked(
  $$insert into loyalty_entries (customer_id, delta, kind, note)
    values ('22222222-2222-2222-2222-222222222222', 10000, 'adjusted', 'free points')$$,
  'a staff member awards themselves points');

select become(:admin_id::uuid);
select test_blocked(
  $$insert into loyalty_entries (customer_id, delta, kind, note)
    values ('44444444-4444-4444-4444-444444444444', 10000, 'adjusted', 'straight into the table')$$,
  'even an admin writes the ledger directly');

-- Reading somebody else's.
select become(:cust2_id::uuid);
select test_reads($$select 1 from loyalty_entries where customer_id = '44444444-4444-4444-4444-444444444444'$$, 0,
  'another customer reads this balance');
select become(:techA_id::uuid);
select test_reads($$select 1 from loyalty_entries where customer_id = '44444444-4444-4444-4444-444444444444'$$, 1,
  'staff read the balance of the customer they are serving');

-- Adjustments.
select become(:techA_id::uuid);
select test_blocked($$select loyalty_adjust('44444444-4444-4444-4444-444444444444', 500, 'because')$$,
  'a staff member adjusts a balance');
select become(:admin_id::uuid);
select test_blocked($$select loyalty_adjust('44444444-4444-4444-4444-444444444444', 500, '   ')$$,
  'an admin adjusts with no reason');
select test_blocked($$select loyalty_adjust('44444444-4444-4444-4444-444444444444', -5000, 'clawback')$$,
  'an adjustment that would go below zero');
select test_reads($$select loyalty_adjust('44444444-4444-4444-4444-444444444444', 45, 'Goodwill')$$, 1,
  'an admin adjusts with a reason');

-- Redemption: balance is now 100. The 20% cap on a £40 bill allows 40 points.
select become(:cust1_id::uuid);
select test_reads($$select loyalty_redeem('44444444-4444-4444-4444-444444444444', 999, 40, 'order', 'ORD-LOY-1')$$, 1,
  'a redemption is trimmed to the 20% cap');
select test_reads(
  $$select 1 from loyalty_entries where source_ref = 'ORD-LOY-1' and kind = 'redeemed' and delta = -40$$,
  1, 'and takes exactly 40 points');
select test_blocked($$select loyalty_redeem('44444444-4444-4444-4444-444444444444', 10, 40, 'order', 'ORD-LOY-1')$$,
  'the same transaction is redeemed against twice');

select become(:cust2_id::uuid);
select test_blocked($$select loyalty_redeem('44444444-4444-4444-4444-444444444444', 10, 100, 'order', 'ORD-LOY-2')$$,
  'another customer spends this balance');

-- Never negative, however hard it is pushed.
select become(:cust1_id::uuid);
select test_reads($$select loyalty_redeem('44444444-4444-4444-4444-444444444444', 99999, 100000, 'order', 'ORD-LOY-3')$$, 1,
  'a huge redemption is capped at the balance');
select test_reads($$select 1 from loyalty_balances where customer_id = auth.uid() and points >= 0$$, 1,
  'the balance never goes negative');

-- ---------------------------------------------------------------------------------------
-- References are issued by the database, and never twice
-- ---------------------------------------------------------------------------------------
\echo ''
\echo '== reference numbers =='

select become(:cust1_id::uuid);

-- Two bookings made without naming a reference must not collide. Client-side max-plus-one
-- cannot promise this; a sequence can.
insert into repairs (customer_id, branch_id, device_category, brand, model, problem)
select :cust1_id::uuid, 'tst', 'iPhone', 'Apple', 'iPhone 15', 'Screen ' || g
from generate_series(1, 25) g;

select test_reads(
  $$select reference from repairs where problem like 'Screen %' group by reference having count(*) > 1$$,
  0, 'no two repairs were issued the same reference');

select test_reads(
  $$select 1 from repairs where reference in ('SPR-4805','SPR-4806','SPR-4807','SPR-4808') and problem like 'Screen %'$$,
  0, 'no new booking reused a reference the seed already holds');

select test_reads(
  $$select 1 from repairs where problem like 'Screen %' and reference !~ '^SPR-[0-9]+$'$$,
  0, 'every issued reference is well formed');

set role postgres;
\echo ''
\echo 'All checks passed.'
