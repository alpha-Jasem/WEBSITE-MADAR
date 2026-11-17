-- Store events as automation triggers: a new Salla order, an order status change and an abandoned cart
-- can now start a connect rule (for example: send a WhatsApp template to the customer). Additive only.
-- Events are queued the same way as the others (queue_connect_event), so nothing is queued unless the
-- company has an enabled rule for that event.

alter table public.connect_rules drop constraint if exists connect_rules_trigger_event_check;
alter table public.connect_rules add constraint connect_rules_trigger_event_check check (trigger_event in (
  'conversation.new', 'conversation.needs_review', 'conversation.transferred',
  'ticket.created', 'booking.created', 'customer.created', 'review.new',
  'order.created', 'order.status_changed', 'cart.abandoned'));

create or replace function public.connect_on_salla_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_payload jsonb;
begin
  begin
    if new.deleted then return new; end if;
    v_payload := jsonb_build_object(
      'order', jsonb_build_object('id', new.order_id, 'reference', new.reference_id, 'status', new.status_name, 'status_slug', new.status_slug,
        'total', new.total, 'currency', new.currency, 'tracking_number', new.tracking_number, 'tracking_link', new.tracking_link),
      'customer', jsonb_build_object('name', new.customer_name, 'phone', new.customer_mobile));
    if tg_op = 'INSERT' then
      perform public.queue_connect_event(new.company_id, 'order.created', v_payload);
    elsif new.status_slug is distinct from old.status_slug and new.status_slug is not null then
      perform public.queue_connect_event(new.company_id, 'order.status_changed', v_payload || jsonb_build_object('previous_status', old.status_name));
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists trg_connect_salla_order on public.salla_orders;
create trigger trg_connect_salla_order after insert or update of status_slug on public.salla_orders
  for each row execute function public.connect_on_salla_order();

-- Salla sends the abandoned-cart event after its own waiting period, so the first row is the moment to act.
create or replace function public.connect_on_salla_cart() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.status = 'purchased' then return new; end if;
    perform public.queue_connect_event(new.company_id, 'cart.abandoned', jsonb_build_object(
      'cart', jsonb_build_object('id', new.cart_id, 'total', new.total, 'currency', new.currency, 'checkout_url', new.checkout_url, 'items_count', new.items_count),
      'customer', jsonb_build_object('name', new.customer_name, 'phone', new.customer_mobile)));
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists trg_connect_salla_cart on public.salla_abandoned_carts;
create trigger trg_connect_salla_cart after insert on public.salla_abandoned_carts
  for each row execute function public.connect_on_salla_cart();

revoke all on function public.connect_on_salla_order() from public, anon, authenticated;
revoke all on function public.connect_on_salla_cart() from public, anon, authenticated;
