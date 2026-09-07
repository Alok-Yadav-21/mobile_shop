-- Reference numbers issued by the database rather than worked out by the client.
--
-- Both adapters generated these by reading the highest reference in use and adding one. That is
-- already the fixed version — the original used the row count, which reissued SPR-4805 to a new
-- booking while it still belonged to somebody else's repair (see src/lib/references.test.js).
-- Max-plus-one is correct on one machine and wrong on several: two customers booking at the same
-- moment both read 4808 and both write 4809. The unique constraint means the data survives, but
-- one of them is told their booking failed for no reason they can act on.
--
-- A sequence has no such window. It is also the only way this can work once bookings arrive from
-- the shop counter and the website at once, which is the entire point of having a backend.
--
-- The floors match what the seeded data already uses, so a new record can never land on one.
-- Run after 0008_assignment_and_quotes.sql.

create sequence if not exists repair_reference_seq start 4809;   -- seed uses SPR-4805..4808
create sequence if not exists order_reference_seq start 10001;
create sequence if not exists trade_in_reference_seq start 3001;

alter table repairs           alter column reference set default 'SPR-' || nextval('repair_reference_seq');
alter table orders            alter column reference set default 'VT-ORD-' || nextval('order_reference_seq');
alter table trade_in_requests alter column reference set default 'VT-TI-' || nextval('trade_in_reference_seq');

-- The sequences only advance for rows that let them: an insert naming its own reference (the
-- seed, an import, a migration from the demo data) leaves them alone. So set each one past
-- anything already in the table, or the first real booking after an import collides.
select setval('repair_reference_seq',
  greatest(4808, coalesce((select max(nullif(regexp_replace(reference, '\D', '', 'g'), '')::bigint) from repairs), 0)) + 1,
  false);
select setval('order_reference_seq',
  greatest(10000, coalesce((select max(nullif(regexp_replace(reference, '\D', '', 'g'), '')::bigint) from orders), 0)) + 1,
  false);
select setval('trade_in_reference_seq',
  greatest(3000, coalesce((select max(nullif(regexp_replace(reference, '\D', '', 'g'), '')::bigint) from trade_in_requests), 0)) + 1,
  false);
