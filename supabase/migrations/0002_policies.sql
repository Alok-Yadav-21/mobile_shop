-- Row Level Security policies for the Virktech schema.
-- Run after 0001_init.sql.

-- Helper: current caller's role/branch, read once per statement via a stable function.
create or replace function current_profile_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_profile_branch() returns text
language sql stable security definer set search_path = public as $$
  select branch_id from profiles where id = auth.uid();
$$;

create or replace function is_staff_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select current_profile_role() in ('staff','admin');
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select current_profile_role() = 'admin';
$$;

-- ── profiles ─────────────────────────────────────────────────────────────
alter table profiles enable row level security;

create policy "profiles: self read" on profiles for select
  using (id = auth.uid() or is_staff_or_admin());
create policy "profiles: self update" on profiles for update
  using (id = auth.uid() or is_admin());
create policy "profiles: admin manage" on profiles for insert
  with check (is_admin() or id = auth.uid());
create policy "profiles: admin delete" on profiles for delete
  using (is_admin());

-- ── branches (public catalogue data) ────────────────────────────────────
alter table branches enable row level security;
create policy "branches: public read" on branches for select using (true);
create policy "branches: admin write" on branches for all
  using (is_admin()) with check (is_admin());

-- ── services (public catalogue data) ────────────────────────────────────
alter table services enable row level security;
create policy "services: public read" on services for select using (active or is_staff_or_admin());
create policy "services: admin write" on services for insert with check (is_admin());
create policy "services: admin update" on services for update using (is_admin());
create policy "services: admin delete" on services for delete using (is_admin());

-- ── repairs ──────────────────────────────────────────────────────────────
alter table repairs enable row level security;
create policy "repairs: customer read own" on repairs for select
  using (customer_id = auth.uid()
    or (current_profile_role() = 'staff' and branch_id = current_profile_branch())
    or is_admin());
create policy "repairs: customer create own" on repairs for insert
  with check (customer_id = auth.uid() or is_staff_or_admin());
create policy "repairs: staff/admin update" on repairs for update
  using ((current_profile_role() = 'staff' and branch_id = current_profile_branch()) or is_admin());
create policy "repairs: admin delete" on repairs for delete using (is_admin());

-- ── repair status history ────────────────────────────────────────────────
alter table repair_status_history enable row level security;
create policy "repair_status_history: visible with repair" on repair_status_history for select
  using (exists (
    select 1 from repairs r where r.id = repair_id
      and (r.customer_id = auth.uid()
        or (current_profile_role() = 'staff' and r.branch_id = current_profile_branch())
        or is_admin())
  ));
create policy "repair_status_history: staff/admin insert" on repair_status_history for insert
  with check (is_staff_or_admin());

-- ── repair notes (customer only sees notes marked visible_to_customer) ─────
alter table repair_notes enable row level security;
create policy "repair_notes: customer read visible" on repair_notes for select
  using (
    is_staff_or_admin()
    or (visible_to_customer and exists (
      select 1 from repairs r where r.id = repair_id and r.customer_id = auth.uid()
    ))
  );
create policy "repair_notes: staff/admin insert" on repair_notes for insert with check (is_staff_or_admin());

-- ── categories / products (public catalogue) ────────────────────────────
alter table categories enable row level security;
create policy "categories: public read" on categories for select using (true);
create policy "categories: admin write" on categories for all using (is_admin()) with check (is_admin());

alter table products enable row level security;
create policy "products: public read active" on products for select using (active or is_staff_or_admin());
create policy "products: admin write" on products for insert with check (is_admin());
create policy "products: admin update" on products for update using (is_admin());
create policy "products: admin delete" on products for delete using (is_admin());

-- ── inventory (branch stock — publicly readable for availability, staff/admin write) ──
alter table inventory enable row level security;
create policy "inventory: public read" on inventory for select using (true);
create policy "inventory: staff/admin write" on inventory for all
  using (is_staff_or_admin()) with check (is_staff_or_admin());

-- ── carts / cart items (owner-only; guest carts are client-local until sign-in) ─
alter table carts enable row level security;
create policy "carts: owner all" on carts for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

alter table cart_items enable row level security;
create policy "cart_items: owner all" on cart_items for all
  using (exists (select 1 from carts c where c.id = cart_id and c.customer_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.customer_id = auth.uid()));

-- ── orders / order items ─────────────────────────────────────────────────
alter table orders enable row level security;
create policy "orders: customer read own" on orders for select
  using (customer_id = auth.uid() or is_staff_or_admin());
create policy "orders: customer create own" on orders for insert
  with check (customer_id = auth.uid() or is_staff_or_admin());
create policy "orders: staff/admin update" on orders for update using (is_staff_or_admin());

alter table order_items enable row level security;
create policy "order_items: visible with order" on order_items for select
  using (exists (
    select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_staff_or_admin())
  ));
create policy "order_items: insert with order" on order_items for insert
  with check (exists (
    select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_staff_or_admin())
  ));

-- ── trade-in requests ────────────────────────────────────────────────────
alter table trade_in_requests enable row level security;
create policy "trade_in: customer read own" on trade_in_requests for select
  using (customer_id = auth.uid() or is_staff_or_admin());
create policy "trade_in: customer create own" on trade_in_requests for insert
  with check (customer_id = auth.uid() or is_staff_or_admin());
create policy "trade_in: staff/admin update" on trade_in_requests for update using (is_staff_or_admin());

-- ── addresses ────────────────────────────────────────────────────────────
alter table addresses enable row level security;
create policy "addresses: owner all" on addresses for all
  using (customer_id = auth.uid() or is_staff_or_admin())
  with check (customer_id = auth.uid());

-- ── notifications ────────────────────────────────────────────────────────
alter table notifications enable row level security;
create policy "notifications: owner read" on notifications for select using (profile_id = auth.uid());
create policy "notifications: owner mark read" on notifications for update using (profile_id = auth.uid());
create policy "notifications: system/staff insert" on notifications for insert with check (is_staff_or_admin());

-- ── staff assignments ────────────────────────────────────────────────────
alter table staff_assignments enable row level security;
create policy "staff_assignments: staff read own" on staff_assignments for select
  using (staff_id = auth.uid() or is_admin());
create policy "staff_assignments: admin write" on staff_assignments for insert with check (is_admin());

-- ── warranties ───────────────────────────────────────────────────────────
alter table warranties enable row level security;
create policy "warranties: customer read own" on warranties for select
  using (customer_id = auth.uid() or is_staff_or_admin());
create policy "warranties: staff/admin write" on warranties for insert with check (is_staff_or_admin());

-- ── settings (admin only) ────────────────────────────────────────────────
alter table settings enable row level security;
create policy "settings: admin all" on settings for all using (is_admin()) with check (is_admin());
