-- Virktech platform schema
-- Entities: profiles/roles, branches, services, repairs (+ status history, notes),
-- products, categories, inventory, carts, orders, trade-ins, addresses, notifications,
-- staff assignments, warranties, reports view, settings.
-- Run against a Supabase (Postgres) project. Requires the pgcrypto extension for gen_random_uuid().

create extension if not exists pgcrypto;

-- ── Roles & profiles ────────────────────────────────────────────────────────
create type user_role as enum ('customer', 'staff', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role user_role not null default 'customer',
  branch_id text, -- set for staff; null for customer/admin. FK added below once branches exists.
  loyalty_credit_pct numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ── Branches (single source of truth for the 8 Virktech branches) ──────────
create table branches (
  id text primary key,                 -- short slug, e.g. 'wol'
  area text not null,                  -- e.g. 'Woolwich — Beresford Square'
  local_name text not null,            -- legacy/local trading name shown in-branch
  address text not null,
  postcode text not null,
  lat numeric(9,6),
  lng numeric(9,6),
  created_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_branch_fk foreign key (branch_id) references branches(id);

-- ── Service catalogue ────────────────────────────────────────────────────────
create table services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  icon text,                            -- lucide icon name, resolved client-side
  device_category text not null,        -- e.g. 'iPhone', 'Laptop', 'MacBook', 'Tablet', 'Audio', 'Wearable'
  base_price numeric(8,2),              -- indicative price, nullable when quote-only
  active boolean not null default true,
  sort_order int not null default 0
);

-- ── Repairs / bookings ───────────────────────────────────────────────────────
create type repair_status as enum (
  'booking_received','awaiting_device','device_received','diagnostics',
  'quote_awaiting_approval','repair_in_progress','parts_ordered','quality_check',
  'ready_for_collection','dispatched','completed','cancelled'
);
create type fulfilment_method as enum ('in_store','collection','delivery');

create table repairs (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,       -- e.g. 'SPR-4805'
  customer_id uuid references profiles(id),
  branch_id text not null references branches(id),
  device_category text not null,
  brand text not null,
  model text not null,
  problem text not null,
  symptoms text,
  fulfilment fulfilment_method not null default 'in_store',
  status repair_status not null default 'booking_received',
  quote numeric(8,2),
  technician_id uuid references profiles(id),
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table repair_status_history (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references repairs(id) on delete cascade,
  status repair_status not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references profiles(id)
);

create table repair_notes (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references repairs(id) on delete cascade,
  author_id uuid references profiles(id),
  visible_to_customer boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

-- ── Products, categories, inventory ─────────────────────────────────────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references categories(id),
  brand text,
  price numeric(8,2) not null,
  was_price numeric(8,2),
  condition text not null default 'New', -- New | Refurbished | Used
  rating numeric(2,1),
  image_url text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  branch_id text not null references branches(id),
  quantity int not null default 0,
  low_stock_threshold int not null default 2,
  unique (product_id, branch_id)
);

-- ── Cart / orders ────────────────────────────────────────────────────────────
create table carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  session_id text,                       -- for guest carts before auth
  created_at timestamptz not null default now()
);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null default 1 check (quantity > 0)
);

create type order_status as enum ('pending','paid','processing','ready','dispatched','delivered','collected','cancelled','refunded');
create type payment_status as enum ('test_mode','pending','paid','failed','refunded');
create type delivery_method as enum ('delivery','click_and_collect');

create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid references profiles(id),
  branch_id text references branches(id), -- for click & collect
  status order_status not null default 'pending',
  payment_status payment_status not null default 'test_mode',
  delivery_method delivery_method not null default 'delivery',
  address_id uuid, -- FK added below once addresses exists.
  subtotal numeric(8,2) not null,
  total numeric(8,2) not null,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name_snapshot text not null,
  unit_price numeric(8,2) not null,
  quantity int not null default 1
);

-- ── Trade-in ─────────────────────────────────────────────────────────────────
create type trade_in_status as enum ('submitted','valuation_review','offer_sent','offer_accepted','offer_declined','device_received','completed','cancelled');

create table trade_in_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid references profiles(id),
  device_category text not null,
  brand text not null,
  model text not null,
  storage_spec text,
  condition_grade text not null,          -- Excellent | Good | Fair | Poor
  functionality_notes text,
  accessories_included text[],
  photo_urls text[],
  indicative_value numeric(8,2),
  final_offer numeric(8,2),
  status trade_in_status not null default 'submitted',
  branch_id text references branches(id),
  created_at timestamptz not null default now()
);

-- ── Addresses ────────────────────────────────────────────────────────────────
create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) on delete cascade,
  label text,
  line1 text not null,
  line2 text,
  city text not null,
  postcode text not null,
  is_default boolean not null default false
);

alter table orders
  add constraint orders_address_fk foreign key (address_id) references addresses(id);

-- ── Notifications ────────────────────────────────────────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Staff assignments ────────────────────────────────────────────────────────
create table staff_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  repair_id uuid references repairs(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references profiles(id)
);

-- ── Warranties ───────────────────────────────────────────────────────────────
create table warranties (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid references repairs(id),
  order_id uuid references orders(id),
  customer_id uuid references profiles(id),
  months int not null default 3,
  starts_at date not null default current_date,
  expires_at date not null,
  terms text
);

-- ── Application settings (single-row key/value, admin-editable) ─────────────
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── Reporting view: repairs + revenue by branch ─────────────────────────────
create view branch_performance as
  select
    b.id as branch_id,
    b.area,
    count(r.id) filter (where r.status <> 'cancelled') as total_repairs,
    count(r.id) filter (where r.status = 'completed') as completed_repairs,
    coalesce(sum(r.quote) filter (where r.status = 'completed'), 0) as completed_revenue
  from branches b
  left join repairs r on r.branch_id = b.id
  group by b.id, b.area;

create index idx_repairs_customer on repairs(customer_id);
create index idx_repairs_branch on repairs(branch_id);
create index idx_repairs_status on repairs(status);
create index idx_orders_customer on orders(customer_id);
create index idx_trade_in_customer on trade_in_requests(customer_id);
