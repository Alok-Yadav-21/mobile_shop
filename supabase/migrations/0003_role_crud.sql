-- Schema additions to support full role-based CRUD (audit trail, parts-on-repairs,
-- stock movements, account status, cancellation/rejection reasons).
-- Run after 0001_init.sql and 0002_policies.sql.

-- ── Account status (activate/deactivate instead of hard-deleting) ──────────
alter table profiles add column if not exists status text not null default 'active'
  check (status in ('active','inactive'));

-- ── Repairs: cancellation reason + archive flag ─────────────────────────────
alter table repairs add column if not exists cancellation_reason text;
alter table repairs add column if not exists archived boolean not null default false;

alter table orders add column if not exists cancellation_reason text;

-- ── Parts used on a repair ───────────────────────────────────────────────────
create table if not exists repair_parts (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references repairs(id) on delete cascade,
  product_id uuid references products(id),
  name text not null,
  quantity int not null default 1 check (quantity > 0),
  unit_cost numeric(8,2),
  created_at timestamptz not null default now()
);

-- ── Simplified per-product stock total (in addition to the existing per-branch
-- `inventory` table) — the app's UI currently tracks one stock figure per product;
-- `inventory` remains available for a future per-branch breakdown. ──────────────
alter table products add column if not exists stock numeric not null default 0;
alter table products add column if not exists low_stock_threshold int not null default 3;

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  delta numeric(8,2) not null,       -- positive = stock added, negative = stock removed
  reason text,
  actor_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ── Categories: allow archiving without deleting ────────────────────────────
alter table categories add column if not exists active boolean not null default true;

-- ── Branches: allow activating/deactivating ─────────────────────────────────
alter table branches add column if not exists active boolean not null default true;

-- ── Trade-in: rejection reason + internal/customer notes + inspector + a 'paid' status ──
alter table trade_in_requests add column if not exists rejection_reason text;
alter table trade_in_requests add column if not exists internal_notes text;
alter table trade_in_requests add column if not exists customer_notes text;
alter table trade_in_requests add column if not exists inspected_by uuid references profiles(id);
alter type trade_in_status add value if not exists 'paid';

-- ── Internal customer notes (staff/admin only, never shown to the customer) ────
create table if not exists customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ── Audit log ────────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  actor_role user_role,
  action text not null,             -- e.g. 'repair.status_change', 'user.role_change'
  entity_type text not null,        -- e.g. 'repair', 'user', 'product', 'order', 'trade_in'
  entity_id text not null,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created on audit_logs(created_at desc);
