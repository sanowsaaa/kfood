-- Read the verified payment record with the order in one snapshot. Payment
-- tokens, URLs and private checkout rows remain inaccessible to browser roles.
begin;

create index stripe_webhook_events_order_review_idx on public.stripe_webhook_events(order_id) where decision='review';

create function private.admin_orders()
returns table(order_data jsonb, payment_state text, payment_livemode boolean, payment_paid_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  return query
    select to_jsonb(o), case when p.state in ('pending','awaiting_payment') and exists (
      select 1 from public.stripe_webhook_events e where e.order_id=o.id and e.decision='review'
    ) then 'review' else p.state end, p.livemode, p.paid_at
    from public.orders o left join public.checkout_payments p on p.order_id=o.id
    order by o.created_at desc, o.id;
end $$;
revoke all on function private.admin_orders() from public, anon, authenticated;
grant execute on function private.admin_orders() to authenticated;

create function public.admin_orders()
returns table(order_data jsonb, payment_state text, payment_livemode boolean, payment_paid_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_orders();
$$;
revoke all on function public.admin_orders() from public, anon, authenticated;
grant execute on function public.admin_orders() to authenticated;

-- Enforce the same payment rule even if a stale browser or a direct API call
-- skips the disabled buttons. Notes and COD/B2B review keep their contracts.
create function private.guard_card_order_fulfillment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.checkout_payments;
begin
  if new.status is not distinct from old.status
    or new.status not in ('approved','confirmed','processing','shipped','delivered') then return new; end if;
  select * into p from public.checkout_payments where order_id=old.id;
  if found or old.payment_method='stripe' or new.payment_method='stripe'
    or old.stripe_session_id is not null or new.stripe_session_id is not null then
    if p.state is distinct from 'paid' or p.paid_at is null then
      raise exception 'Поръчката с карта няма потвърдено плащане. Не може да бъде обработена или изпратена.' using errcode='23514';
    end if;
    -- The verified webhook may confirm a sandbox payment for testing. Browser
    -- administrators cannot fulfill it as a real order, nor ship test orders.
    if not p.livemode and (new.status<>'confirmed' or current_setting('role',true)='authenticated') then
      raise exception 'Тестовото Stripe плащане не е реално плащане. Поръчката не може да бъде изпълнена.' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_card_order_fulfillment() from public, anon, authenticated;
create trigger guard_card_order_fulfillment before update on public.orders
  for each row execute function private.guard_card_order_fulfillment();

notify pgrst, 'reload schema';
commit;
