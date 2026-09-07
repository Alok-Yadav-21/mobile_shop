-- An order placed on the website has to reach somebody.
--
-- 0011 gave a customer a way to tell the shop about their own repair and their own sale. Orders
-- were left out, and they are the case that matters most: a repair or a sale starts a
-- conversation, but an order is money taken for goods that now have to be picked, packed and
-- sent. Nobody being told means nobody does it.
--
-- Staff insert their own notifications directly. A customer cannot - they can read neither the
-- staff list nor write into anyone else's bell, both correctly - so this decides the recipients
-- from the order itself and refuses anything that is not the caller's own.
-- Run after 0012_technician_name_for_customer.sql.

create or replace function notify_shop_about_order(
  p_reference text, p_title text, p_body text, p_link text default null, p_audience text default 'admin'
) returns integer
language plpgsql security definer set search_path = public as $fn$
declare
  o orders;
  sent integer := 0;
begin
  select * into o from orders where reference = p_reference;
  if not found then return 0; end if;
  if o.customer_id is distinct from auth.uid() then
    raise exception 'You can only send an update about your own order.' using errcode = '42501';
  end if;

  insert into notifications (profile_id, title, body, reference, link)
  select p.id, p_title, p_body, p_reference, p_link
  from profiles p
  where not p.archived and p.status = 'active'
    and case p_audience
      -- Fulfilment is an admin responsibility: they are the ones who assign an order to a branch
      -- to pick. A web order arrives with no branch attached, so there is often no branch to tell.
      when 'branch' then p.role = 'staff' and o.branch_id is not null and p.branch_id = o.branch_id
      else p.role = 'admin'
    end;
  get diagnostics sent = row_count;
  return sent;
end $fn$;

revoke all on function notify_shop_about_order(text, text, text, text, text) from public;
grant execute on function notify_shop_about_order(text, text, text, text, text) to authenticated;
