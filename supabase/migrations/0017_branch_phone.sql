-- A branch has a phone number.
--
-- The admin's branch form has always collected one — "Phone (optional)" — and the mock adapter
-- has always stored it. The table never had the column, so the Supabase adapter's insert named a
-- field that does not exist and every attempt to open a new branch failed outright with
-- "Could not find the 'phone' column of 'branches'".
--
-- Optional, because the eight existing branches were seeded without one and a shop is perfectly
-- openable before its line is connected.
-- Run after 0016_pay_rates_are_not_readable.sql.

alter table branches add column if not exists phone text;
