-- Stock moves when goods are sold, not when a client remembers to ask.
--
-- The adapter decremented stock by updating products from the browser, immediately after
-- creating the order. A customer cannot update products — RLS restricts that to admins, quite
-- correctly — so the update matched no rows, the adapter's catch swallowed the failure, and the
-- order completed with the shelf untouched. Every web sale left stock overstated, and the shop
-- would happily oversell an item it no longer had.
--
-- It cannot be fixed by loosening the policy: letting customers write to products is the actual
-- hole. The movement belongs in the database, where it happens as part of the same transaction
-- that records the sale and cannot be skipped, forgotten, or refused.
-- Run after 0014_loyalty_points.sql.

-- Selling: one line added to an order takes that many off the shelf.
create or replace function stock_take_for_order_line() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare ref text;
begin
  if new.product_id is null then return new; end if;
  select reference into ref from orders where id = new.order_id;

  update products set stock = greatest(stock - new.quantity, 0) where id = new.product_id;
  insert into inventory_movements (product_id, delta, reason)
  values (new.product_id, -new.quantity, 'Order ' || coalesce(ref, new.order_id::text));
  return new;
end $fn$;

drop trigger if exists trg_stock_take_for_order_line on order_items;
create trigger trg_stock_take_for_order_line after insert on order_items
  for each row execute function stock_take_for_order_line();

-- Unselling: an order that is cancelled or refunded puts its goods back, and one that comes back
-- out of that state takes them again. Driven by the transition rather than the resulting state,
-- so moving an order in and out repeatedly cannot drift the count.
create or replace function stock_settle_for_order() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  was_returned boolean := old.status in ('cancelled', 'refunded');
  is_returned  boolean := new.status in ('cancelled', 'refunded');
  direction integer;
begin
  if was_returned = is_returned then return new; end if;
  -- Returning goods to the shelf adds; taking them back off subtracts.
  direction := case when is_returned then 1 else -1 end;

  update products p set stock = greatest(p.stock + (direction * i.quantity), 0)
  from order_items i where i.order_id = new.id and i.product_id = p.id;

  insert into inventory_movements (product_id, delta, reason)
  select i.product_id, direction * i.quantity,
    case when is_returned then 'Cancelled order ' || new.reference
         else 'Reinstated order ' || new.reference end
  from order_items i where i.order_id = new.id and i.product_id is not null;
  return new;
end $fn$;

drop trigger if exists trg_stock_settle_for_order on orders;
create trigger trg_stock_settle_for_order after update of status on orders
  for each row execute function stock_settle_for_order();
