-- Putting the repair reference counter back to a known number.
--
-- For scripts/reset-repairs.mjs, which clears the repairs a round of testing left behind. It can
-- delete the rows over the API but not move the sequence behind the reference column, so without
-- this the next booking carries on from whatever testing reached and the numbering has a hole in
-- it the size of the test run.
--
-- Deliberately out of reach of the application. Nobody signed in can call it — not a customer,
-- not staff, not an admin — because rewinding the counter is how you get two repairs claiming the
-- same reference, and a reference is what a customer is told to quote. Only the service role,
-- which means only a terminal.
-- Run after 0018_staff_may_consume_their_own_grant.sql.

create or replace function reset_repair_reference_seq(p_next integer) returns bigint
language sql security definer set search_path = public as $fn$
  -- `false` so the next nextval() returns p_next itself rather than the one after it.
  select setval('repair_reference_seq', greatest(p_next, 1), false);
$fn$;

revoke all on function reset_repair_reference_seq(integer) from public, anon, authenticated;
grant execute on function reset_repair_reference_seq(integer) to service_role;
