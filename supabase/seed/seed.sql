-- Seed data mirroring the verified business data already in this repo
-- (src/data/branches.js, src/data/products.js, src/data/services.js, src/data/repairs.js).
-- No addresses, phone numbers, or prices here are invented — they're copied from those files.
--
-- NOTE on profiles/auth.users: `profiles.id` is a foreign key to `auth.users.id`, and Supabase
-- only lets you create auth.users rows through the Auth API (sign-up, invite, or
-- `supabase.auth.admin.createUser`), not a plain SQL INSERT. Create the three demo accounts
-- first (see README below this file / the rebuild report for exact steps), then run the
-- `insert into profiles ...` block at the bottom with the real UUIDs Supabase assigns them.

-- ── Branches (all 8, verbatim from src/data/branches.js) ────────────────────
insert into branches (id, area, local_name, address, postcode, lat, lng) values
  ('blv', 'Belvedere', 'Smart Phones Repair', '25 Nuxley Road', 'DA17 5JE', 51.49, 0.17),
  ('sid', 'Sidcup', 'Virk Tech & Keys', '263 Westwood Lane', 'DA15 9PS', 51.43, 0.10),
  ('nel', 'New Eltham', 'Smart Phones Repair', '371 Footscray Road', 'SE9 2DR', 51.44, 0.07),
  ('nsa', 'New Eltham — Station Approach', 'Station Approach', '1 Station Approach', 'SE9 2AB', 51.44, 0.05),
  ('orp', 'Orpington', 'Smart Phones Repair', '74 Cotmandene Crescent', 'BR5 2RG', 51.38, 0.10),
  ('wol', 'Woolwich', 'Smart Phones Repair', '1B Woolwich New Road', 'SE18 6EX', 51.49, 0.06),
  ('wbs', 'Woolwich — Beresford Square', 'Beresford Square', '18A Beresford Square', 'SE18 6AY', 51.49, 0.07),
  ('whr', 'Woolwich — Herbert Road', 'Herbert Road', '27A Herbert Road', 'SE18 3TB', 51.48, 0.06)
on conflict (id) do nothing;

-- ── Categories (from src/data/products.js CATEGORIES) ───────────────────────
insert into categories (name, sort_order)
  select name, ord from (values
    ('iPhones',1),('Smartphones',2),('Laptops',3),('MacBooks',4),
    ('Tablets',5),('Audio',6),('Wearables',7),('Accessories',8)
  ) as c(name, ord)
on conflict (name) do nothing;

-- ── Products (from src/data/products.js — image_url left null; the app ships
--    the actual product photos as local assets, not URLs) ──────────────────
insert into products (name, category_id, price, was_price, condition, rating)
  select 'MacBook Air (refurbished)', id, 749, null, 'Refurbished', 4.9 from categories where name='MacBooks'
union all
  select 'iPhone 14 — 128GB', id, 579, null, 'Used', 4.8 from categories where name='iPhones'
union all
  select 'Over-ear Headphones', id, 129, 149, 'New', 4.6 from categories where name='Audio'
union all
  select 'Smartwatch Series X', id, 199, null, 'New', 4.7 from categories where name='Wearables'
union all
  select 'Ultrabook 14"', id, 699, null, 'New', 4.5 from categories where name='Laptops'
union all
  select 'Wireless Earbuds Pro', id, 99, 129, 'New', 4.8 from categories where name='Audio'
union all
  select 'Samsung Galaxy S23', id, 529, null, 'Used', 4.6 from categories where name='Smartphones'
union all
  select 'Bluetooth Speaker', id, 59, null, 'New', 4.7 from categories where name='Accessories';

-- ── Services (from src/data/services.js — icon column stores the lucide icon name) ─
insert into services (title, description, icon, device_category, sort_order) values
  ('iPhone repairs', 'Screens, batteries, charging ports, cameras and more.', 'Smartphone', 'iPhone', 1),
  ('Smartphone repairs', 'Android & all major brands — fast, warranty-backed fixes.', 'Smartphone', 'Smartphone', 2),
  ('Laptop repairs', 'Screens, keyboards, batteries, SSD/RAM upgrades, OS.', 'Laptop', 'Laptop', 3),
  ('MacBook repairs', 'Air & Pro — diagnostics, battery, board-level repair.', 'Laptop', 'MacBook', 4),
  ('Tablet repairs', 'iPad & Android tablets — glass, battery, charging.', 'Tablet', 'Tablet', 5),
  ('Audio device repairs', 'Headphones, earbuds & speakers — support & fixes.', 'Headphones', 'Audio', 6),
  ('Wearables & accessories', 'Smartwatches and accessory support.', 'Watch', 'Wearable', 7),
  ('Diagnostics & data', 'Free diagnostics, data recovery and transfer.', 'Wrench', 'Diagnostics', 8);

-- ── Demo repairs (from src/data/repairs.js, status renamed to the new enum) ──
-- Run after the demo customer profile below exists, or leave customer_id null for a walk-in.
insert into repairs (reference, branch_id, device_category, brand, model, problem, fulfilment, status, quote)
values
  ('SPR-4805', 'wol', 'Phone', 'Apple', 'iPhone 13', 'Screen replacement', 'in_store', 'ready_for_collection', 119),
  ('SPR-4806', 'blv', 'Laptop', 'Dell', 'XPS 13', 'Battery replacement', 'collection', 'repair_in_progress', 95),
  ('SPR-4807', 'sid', 'Phone', 'Samsung', 'Galaxy S22', 'Charging-port repair', 'in_store', 'quote_awaiting_approval', 69),
  ('SPR-4808', 'wol', 'Tablet', 'Apple', 'iPad Air', 'Water-damage check', 'in_store', 'booking_received', null)
on conflict (reference) do nothing;

-- ── Demo accounts (create via Supabase Auth first, then link the profile) ──
-- 1. In the Supabase dashboard (Authentication → Users → Add user) or via
--    `supabase.auth.admin.createUser({ email, password })`, create:
--      customer@demo.com  /  staff@demo.com  /  admin@demo.com
-- 2. Copy each generated auth.users.id, then run:
--
-- insert into profiles (id, full_name, email, role, branch_id) values
--   ('<uuid-for-customer@demo.com>', 'Alex Kaur',     'customer@demo.com', 'customer', null),
--   ('<uuid-for-staff@demo.com>',    'Sam Patel',     'staff@demo.com',    'staff',    'wol'),
--   ('<uuid-for-admin@demo.com>',    'Central Admin', 'admin@demo.com',    'admin',    null);
