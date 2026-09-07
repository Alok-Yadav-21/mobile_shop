-- One line per product in a basket.
--
-- cart_items had no constraint saying so, so adding the same product twice appended a second row
-- rather than raising the quantity: the basket showed "iPhone 14 x1" twice, the total was right
-- by accident, and removing the line removed only one of them. It also left the adapter unable
-- to upsert a line, which is the natural way to write "this product, this many".
--
-- Duplicates are folded together rather than dropped, because the quantity in them is real - it
-- is what somebody actually put in their basket.
-- Run after 0009_reference_sequences.sql.

-- Ordered by id, which is a uuid: there is no min() for one, and the table carries no timestamp,
-- so "the first row" is arbitrary but at least consistent between these two statements.
with ranked as (
  select id,
         row_number() over (partition by cart_id, product_id order by id) as n,
         sum(quantity)  over (partition by cart_id, product_id)           as total
  from cart_items
)
update cart_items ci set quantity = r.total
from ranked r where ci.id = r.id and r.n = 1 and ci.quantity <> r.total;

with ranked as (
  select id, row_number() over (partition by cart_id, product_id order by id) as n
  from cart_items
)
delete from cart_items ci using ranked r where ci.id = r.id and r.n > 1;

alter table cart_items add constraint cart_items_one_line_per_product unique (cart_id, product_id);
