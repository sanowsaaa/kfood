-- Apply only to a staging copy first. This extends the audited, existing schema;
-- it is not a baseline migration for an empty Supabase project.
begin;

drop policy if exists "Anyone can create orders" on public.orders;
revoke insert on public.orders from anon, authenticated;

create table public.checkout_payments (
  order_id uuid primary key references public.orders(id),
  attempt_id uuid not null unique,
  order_number text not null unique,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  status_token_hash text not null check (status_token_hash ~ '^[0-9a-f]{64}$'),
  state text not null default 'pending' check (state in ('pending','awaiting_payment','paid','failed','expired','review')),
  livemode boolean not null,
  total_minor integer not null check (total_minor between 1000 and 1000000),
  discount_percent integer not null check (discount_percent in (0,5,10)),
  line_items jsonb not null check (jsonb_typeof(line_items) = 'array'),
  customer_email text not null,
  customer_phone text not null,
  session_id text unique,
  stripe_url text,
  return_origin text not null,
  integration_suffix text not null check (integration_suffix ~ '^[a-z]{8}$'),
  expires_at timestamptz not null,
  paid_at timestamptz,
  last_reconciled_at timestamptz,
  created_at timestamptz not null default now()
);
create index checkout_payments_reconcile_idx on public.checkout_payments
  (livemode, last_reconciled_at nulls first, created_at) where state in ('pending','awaiting_payment');

create table public.checkout_stock_holds (
  order_id uuid not null references public.checkout_payments(order_id),
  product_id integer not null references public.products(id),
  quantity integer not null check (quantity between 1 and 100),
  state text not null default 'held' check (state in ('held','consumed','released')),
  primary key (order_id, product_id)
);
create index checkout_stock_holds_product_idx on public.checkout_stock_holds (product_id) where state = 'held';
create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  session_id text not null,
  order_id uuid,
  livemode boolean not null,
  amount_minor integer,
  currency text,
  decision text not null check (decision in ('processing','applied','ignored','review')),
  reason text,
  processed_at timestamptz not null default now()
);
create index stripe_webhook_events_review_idx on public.stripe_webhook_events (processed_at) where decision = 'review';

create table public.checkout_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.checkout_payments(order_id),
  order_snapshot jsonb not null,
  state text not null default 'pending' check (state in ('pending','leased','sent','review')),
  attempts integer not null default 0,
  lease_id uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index checkout_outbox_pending_idx on public.checkout_outbox (next_attempt_at) where state in ('pending','leased');
create table public.checkout_rate_limits (
  bucket text primary key,
  hits integer not null,
  expires_at timestamptz not null
);

alter table public.checkout_payments enable row level security;
alter table public.checkout_stock_holds enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.checkout_outbox enable row level security;
alter table public.checkout_rate_limits enable row level security;
revoke all on public.checkout_payments, public.checkout_stock_holds, public.stripe_webhook_events,
  public.checkout_outbox, public.checkout_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.checkout_payments, public.checkout_stock_holds,
  public.stripe_webhook_events, public.checkout_outbox, public.checkout_rate_limits to service_role;

create function public.checkout_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_hits integer;
begin
  insert into public.checkout_rate_limits as r (bucket,hits,expires_at)
    values (p_bucket,1,now()+make_interval(secs => p_window_seconds))
  on conflict (bucket) do update set
    hits = case when r.expires_at <= now() then 1 else least(r.hits+1,1000000) end,
    expires_at = case when r.expires_at <= now() then excluded.expires_at else r.expires_at end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

create function public.checkout_prepare(
  p_attempt_id uuid, p_request_hash text, p_token_hash text, p_items jsonb,
  p_email text, p_phone text, p_expected_total integer, p_livemode boolean, p_return_origin text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_payment public.checkout_payments%rowtype;
  v_product public.products%rowtype;
  v_item jsonb; v_lines jsonb := '[]'::jsonb; v_line jsonb;
  v_total bigint := 0; v_net integer; v_discount integer; v_allocated integer := 0;
  v_order_id uuid := gen_random_uuid(); v_order_number text;
  v_qty integer; v_unit integer; v_held integer; v_count integer := 0; v_extra integer;
begin
  -- One persisted quote for each client attempt, including concurrent HTTP retries.
  perform pg_advisory_xact_lock(hashtextextended(p_attempt_id::text, 0));
  select * into v_payment from public.checkout_payments where attempt_id = p_attempt_id;
  if found then
    if v_payment.request_hash <> p_request_hash or v_payment.status_token_hash <> p_token_hash
       or v_payment.livemode <> p_livemode or v_payment.return_origin <> p_return_origin then
      raise exception 'CHECKOUT_ATTEMPT_CONFLICT';
    end if;
    return to_jsonb(v_payment);
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50
     or (select count(distinct (x->>'id')::integer) from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then
    raise exception 'INVALID_CART';
  end if;
  -- Deterministic lock order also used by payment fulfillment. No remote API calls
  -- run inside this transaction. Holds expire only after Stripe confirms expiry.
  for v_product in select p.* from public.products p
    where p.id in (select (x->>'id')::integer from jsonb_array_elements(p_items) x)
    order by p.id for update
  loop
    select x into v_item from jsonb_array_elements(p_items) x where (x->>'id')::integer = v_product.id;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty not between 1 and 100 or v_product.visibility is distinct from 'retail'
       or v_product.in_stock is not true or v_product.price <= 0
       or v_product.price <> round(v_product.price,2) or v_product.stock is null then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;
    select coalesce(sum(quantity),0) into v_held from public.checkout_stock_holds
      where product_id = v_product.id and state = 'held';
    if v_product.stock - v_held < v_qty then raise exception 'INSUFFICIENT_STOCK'; end if;
    v_unit := (v_product.price * 100)::integer;
    v_total := v_total + v_unit::bigint * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id',v_product.id,'name',v_product.name,'quantity',v_qty,'unit_minor',v_unit,
      'price',v_product.price,'base_minor',v_unit*v_qty));
    v_count := v_count + 1;
  end loop;
  if v_count <> jsonb_array_length(p_items) then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  v_discount := case when v_total >= 10000 then 10 when v_total >= 5000 then 5 else 0 end;
  if v_total > 1111111 then raise exception 'INVALID_TOTAL'; end if;
  v_net := round(v_total * (100-v_discount)::numeric / 100)::integer;
  if v_net < 1000 or v_net > 1000000 then raise exception 'INVALID_TOTAL'; end if;
  if v_net <> p_expected_total then raise exception 'PRICE_CHANGED'; end if;
  -- Largest remainder allocation makes sum(line_minor) equal the basket total.
  select coalesce(sum(floor((x->>'base_minor')::numeric*(100-v_discount)/100)),0)::integer
    into v_allocated from jsonb_array_elements(v_lines) x;
  v_extra := v_net-v_allocated;
  select jsonb_agg(x || jsonb_build_object('line_minor',
    floor((x->>'base_minor')::numeric*(100-v_discount)/100)::integer + case when r <= v_extra then 1 else 0 end)
    order by (x->>'id')::integer) into v_lines
  from (select x, row_number() over (order by
    mod((x->>'base_minor')::numeric*(100-v_discount),100) desc,(x->>'id')::integer) r
    from jsonb_array_elements(v_lines) x) ranked;
  v_order_number := 'ORD-' || to_char(now() at time zone 'UTC','YYYYMMDD') || '-' || replace(v_order_id::text,'-','');
  insert into public.orders (id,order_number,customer_email,customer_phone,total_amount,currency,status,items,payment_method,original_total_amount)
    values (v_order_id,v_order_number,p_email,p_phone,v_net::numeric/100,'EUR','pending',v_lines,'stripe',v_total::numeric/100);
  insert into public.checkout_payments (order_id,attempt_id,order_number,request_hash,status_token_hash,livemode,
    total_minor,discount_percent,line_items,customer_email,customer_phone,return_origin,integration_suffix,expires_at)
    values (v_order_id,p_attempt_id,v_order_number,p_request_hash,p_token_hash,p_livemode,
      v_net,v_discount,v_lines,p_email,p_phone,p_return_origin,
      translate(left(replace(gen_random_uuid()::text,'-',''),8),'0123456789abcdef','abcdefghijklmnop'),now()+interval '1 hour')
    returning * into v_payment;
  for v_line in select x from jsonb_array_elements(v_lines) x loop
    insert into public.checkout_stock_holds(order_id,product_id,quantity)
      values(v_order_id,(v_line->>'id')::integer,(v_line->>'quantity')::integer);
  end loop;
  return to_jsonb(v_payment);
end $$;

create function public.checkout_attach_session(p_order_id uuid, p_session_id text, p_url text, p_livemode boolean,
  p_amount integer, p_currency text) returns void language plpgsql security invoker set search_path = '' as $$
declare v public.checkout_payments%rowtype;
begin
  select * into v from public.checkout_payments where order_id=p_order_id for update;
  if not found or v.livemode is distinct from p_livemode or v.total_minor is distinct from p_amount
     or p_currency is distinct from 'eur' or (v.session_id is not null and v.session_id <> p_session_id) then
    raise exception 'SESSION_MISMATCH';
  end if;
  update public.checkout_payments set session_id=p_session_id,stripe_url=p_url where order_id=p_order_id;
  update public.orders set stripe_session_id=p_session_id,updated_at=now() where id=p_order_id;
end $$;

create function public.checkout_apply_event(
  p_event_id text,p_event_type text,p_session_id text,p_order_id uuid,p_attempt_id text,p_order_number text,
  p_livemode boolean,p_amount integer,p_currency text,p_session_status text,p_payment_status text,
  p_shipping jsonb,p_billing jsonb,p_intent_status text,p_refunded integer,p_disputed boolean
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.checkout_payments%rowtype; v_decision text; v_reason text; v_product public.products%rowtype;
  v_late boolean := false;
begin
  insert into public.stripe_webhook_events(event_id,event_type,session_id,order_id,livemode,amount_minor,currency,decision)
    values(p_event_id,p_event_type,p_session_id,p_order_id,p_livemode,p_amount,p_currency,'processing')
    on conflict(event_id) do nothing;
  if not found then
    select decision into v_decision from public.stripe_webhook_events where event_id=p_event_id;
    return jsonb_build_object('decision',v_decision,'duplicate',true);
  end if;
  select * into v from public.checkout_payments where order_id=p_order_id for update;
  if not found then v_reason := 'NO_TRUSTED_QUOTE';
  elsif v.livemode is distinct from p_livemode then v_reason := 'MODE_MISMATCH';
  elsif v.attempt_id::text <> p_attempt_id or v.order_number <> p_order_number
        or (v.session_id is not null and v.session_id <> p_session_id) then v_reason := 'SESSION_MISMATCH';
  elsif v.total_minor is distinct from p_amount or p_currency is distinct from 'eur' then v_reason := 'AMOUNT_MISMATCH';
  end if;
  if v_reason is not null then
    update public.stripe_webhook_events set decision='review',reason=v_reason where event_id=p_event_id;
    return jsonb_build_object('decision','review','reason',v_reason);
  end if;
  if p_payment_status='paid' and (p_intent_status is distinct from 'succeeded' or p_refunded is null or p_disputed is null) then
    update public.stripe_webhook_events set decision='review',reason='NO_CANONICAL_CHARGE' where event_id=p_event_id;
    return jsonb_build_object('decision','review','reason','NO_CANONICAL_CHARGE');
  end if;
  if p_payment_status='paid' and (p_refunded > 0 or p_disputed) then
    update public.checkout_payments set state='review',paid_at=coalesce(paid_at,now()),session_id=p_session_id where order_id=v.order_id;
    update public.orders set stripe_session_id=p_session_id,status=case when status='pending' then 'payment_review' else status end,
      updated_at=now() where id=v.order_id;
    update public.stripe_webhook_events set decision='review',reason='REFUNDED_OR_DISPUTED' where event_id=p_event_id;
    return jsonb_build_object('decision','review','reason','REFUNDED_OR_DISPUTED');
  end if;
  update public.checkout_payments set session_id=p_session_id,last_reconciled_at=now() where order_id=v.order_id;
  update public.orders set stripe_session_id=p_session_id where id=v.order_id and stripe_session_id is null;
  v_decision := 'ignored';
  if p_payment_status = 'paid' and p_session_status = 'complete' then
    if v.state not in ('paid','review') then
      v_late := v.state in ('failed','expired');
      for v_product in select p.* from public.products p join public.checkout_stock_holds h on h.product_id=p.id
        where h.order_id=v.order_id order by p.id for update of p loop
        if v_product.stock is null or v_product.stock < (select quantity from public.checkout_stock_holds
            where order_id=v.order_id and product_id=v_product.id) then v_late := true; end if;
      end loop;
      if v_late then
        -- Money can be paid after a previously failed/expired state. Record it for
        -- manual fulfillment/refund; never consume released stock automatically.
        update public.checkout_payments set state='review',paid_at=now() where order_id=v.order_id;
        update public.orders set status=case when status='pending' then 'payment_review' else status end,
          updated_at=now() where id=v.order_id;
        v_decision := 'review'; v_reason := 'PAID_REQUIRES_STOCK_REVIEW';
      else
        update public.products p set stock=p.stock-h.quantity, in_stock=(p.stock-h.quantity > 0),updated_at=now()
          from public.checkout_stock_holds h where h.product_id=p.id and h.order_id=v.order_id and h.state='held';
        update public.checkout_stock_holds set state='consumed' where order_id=v.order_id and state='held';
        update public.checkout_payments set state='paid',paid_at=now() where order_id=v.order_id;
        update public.orders set status=case when status='pending' then 'confirmed' else status end,
          total_amount=v.total_minor::numeric/100,currency='EUR',
          shipping_address=coalesce(p_shipping,shipping_address),billing_address=coalesce(p_billing,billing_address),
          updated_at=now() where id=v.order_id;
        insert into public.checkout_outbox(order_id,order_snapshot)
          select v.order_id,jsonb_build_object('order_number',order_number,'customer_email',customer_email,
            'customer_phone',customer_phone,'shipping_address',shipping_address,'total_amount',total_amount,'items',items)
          from public.orders where id=v.order_id on conflict(order_id) do nothing;
        v_decision := 'applied';
      end if;
    end if;
  elsif v.state in ('pending','awaiting_payment') then
    if p_session_status='expired' or p_event_type='checkout.session.async_payment_failed' then
      update public.checkout_stock_holds set state='released' where order_id=v.order_id and state='held';
      update public.checkout_payments set state=case when p_session_status='expired' then 'expired' else 'failed' end
        where order_id=v.order_id;
      update public.orders set status=case when status='pending' then 'cancelled' else status end,updated_at=now() where id=v.order_id;
      v_decision := 'applied';
    elsif p_session_status='complete' then
      update public.checkout_payments set state='awaiting_payment' where order_id=v.order_id;
      v_decision := 'applied';
    end if;
  end if;
  update public.stripe_webhook_events set decision=v_decision,reason=v_reason where event_id=p_event_id;
  return jsonb_build_object('decision',v_decision,'reason',v_reason);
end $$;

create function public.checkout_claim_emails(p_limit integer)
returns setof public.checkout_outbox language plpgsql security invoker set search_path = '' as $$
begin
  -- Resend deduplicates for 24 hours. Stop automatic retries earlier, so a long
  -- outage cannot silently send a second copy after that window.
  update public.checkout_outbox set state='review',lease_id=null,lease_until=null
    where state in ('pending','leased') and (
      first_attempt_at < now()-interval '20 hours'
      or (attempts >= 10 and (state='pending' or lease_until < now()))
    );
  return query
    with candidates as (select id from public.checkout_outbox
      where (state='pending' or (state='leased' and lease_until < now())) and next_attempt_at <= now()
      order by next_attempt_at for update skip locked limit least(p_limit,25))
    update public.checkout_outbox o set state='leased',attempts=attempts+1,
      first_attempt_at=coalesce(first_attempt_at,now()),lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes'
    from candidates c where o.id=c.id returning o.*;
end $$;

create function public.checkout_finish_email(p_id uuid,p_lease_id uuid,p_success boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.checkout_outbox set state=case when p_success then 'sent' when attempts >= 10 then 'review' else 'pending' end,
    sent_at=case when p_success then now() else null end,lease_id=null,lease_until=null,
    next_attempt_at=now()+make_interval(secs=>least(3600,(power(2,least(attempts,10))*30)::integer))
  where id=p_id and lease_id=p_lease_id and state='leased';
end $$;

revoke execute on function public.checkout_rate_limit(text,integer,integer),
  public.checkout_prepare(uuid,text,text,jsonb,text,text,integer,boolean,text),
  public.checkout_attach_session(uuid,text,text,boolean,integer,text),
  public.checkout_apply_event(text,text,text,uuid,text,text,boolean,integer,text,text,text,jsonb,jsonb,text,integer,boolean),
  public.checkout_claim_emails(integer), public.checkout_finish_email(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.checkout_rate_limit(text,integer,integer),
  public.checkout_prepare(uuid,text,text,jsonb,text,text,integer,boolean,text),
  public.checkout_attach_session(uuid,text,text,boolean,integer,text),
  public.checkout_apply_event(text,text,text,uuid,text,text,boolean,integer,text,text,text,jsonb,jsonb,text,integer,boolean),
  public.checkout_claim_emails(integer), public.checkout_finish_email(uuid,uuid,boolean) to service_role;

commit;
