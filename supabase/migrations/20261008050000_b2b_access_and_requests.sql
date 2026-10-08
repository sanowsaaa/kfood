-- Standalone B2B change: no dependency on the retail payment migration.
-- Existing orders, partners, invoice records and email settings are preserved.
drop policy if exists "Public can read active companies" on public.b2b_companies;
revoke all on table public.b2b_companies from anon;
-- Partner profiles are returned with an explicit column list by b2b-auth.
-- Existing admin policies and permissions remain applicable to staff.

-- Keep legacy retail inserts available until their separate payment rollout.
-- A public insert must never bypass the B2B company and price checks.
create policy b2b_orders_use_server on public.orders as restrictive for insert to anon,authenticated
  with check (b2b_company_id is null and is_b2b_order is not true
    and coalesce(payment_method,'') not in ('b2b_invoice','b2b_request'));

create table public.b2b_request_attempts (
  company_id uuid not null references public.b2b_companies(id),
  attempt_id uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  order_id uuid not null unique references public.orders(id),
  notification_snapshot jsonb not null,
  notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(company_id, attempt_id)
);
alter table public.b2b_request_attempts enable row level security;
revoke all on table public.b2b_request_attempts from public, anon, authenticated;
grant all on table public.b2b_request_attempts to service_role;

create table public.b2b_rate_limits (
  scope text not null, actor text not null check (actor ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null, attempts integer not null,
  primary key(scope, actor)
);
create index b2b_rate_limits_window_idx on public.b2b_rate_limits(window_start);
alter table public.b2b_rate_limits enable row level security;
revoke all on table public.b2b_rate_limits from public, anon, authenticated;
grant all on table public.b2b_rate_limits to service_role;

create function public.b2b_rate_limit(p_scope text, p_actor text, p_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  if p_scope is null or p_scope not in ('login','request_activation','register','order','notification')
    or p_limit is null or p_limit not between 1 and 30
    or p_actor is null or p_actor !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_RATE_LIMIT'; end if;
  delete from public.b2b_rate_limits where window_start < now() - interval '1 day';
  insert into public.b2b_rate_limits(scope,actor,window_start,attempts) values(p_scope,p_actor,now(),1)
  on conflict(scope,actor) do update set
    attempts = case when b2b_rate_limits.window_start < now() - interval '15 minutes' then 1 else b2b_rate_limits.attempts+1 end,
    window_start = case when b2b_rate_limits.window_start < now() - interval '15 minutes' then now() else b2b_rate_limits.window_start end
  returning attempts into v_count;
  return v_count <= p_limit;
end $$;

create function public.b2b_activate_company(p_company_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_company public.b2b_companies; v_email text;
begin
  select email into v_email from auth.users where id=p_user_id and email_confirmed_at is not null;
  if v_email is null then raise exception 'EMAIL_NOT_VERIFIED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('b2b-activation:'||p_user_id::text,0));
  select * into v_company from public.b2b_companies where id=p_company_id for update;
  if not found or v_company.status is distinct from 'active' or lower(trim(v_company.email)) is distinct from lower(v_email)
    or (v_company.user_id is not null and v_company.user_id <> p_user_id) then raise exception 'COMPANY_NOT_AVAILABLE'; end if;
  -- The current login/profile contract represents one active company per user.
  if exists(select from public.b2b_companies where user_id=p_user_id and id<>p_company_id and status='active')
    then raise exception 'USER_ALREADY_HAS_COMPANY'; end if;
  update public.b2b_companies set user_id=p_user_id,updated_at=now() where id=p_company_id;
end $$;

create function public.b2b_owns_company(p_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.b2b_companies where id=p_company_id and user_id=(select auth.uid()) and status='active');
$$;
revoke all on function public.b2b_owns_company(uuid) from public,anon;
grant execute on function public.b2b_owns_company(uuid) to authenticated;
drop policy if exists b2b_users_view_company_orders on public.orders;
create policy b2b_users_view_company_orders on public.orders for select to authenticated
  using (public.b2b_owns_company(b2b_company_id));

create function public.b2b_create_request(
  p_user_id uuid, p_company_id uuid, p_attempt_id uuid, p_request_hash text,
  p_items jsonb, p_email text, p_phone text, p_shipping jsonb, p_notes text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_company public.b2b_companies; v_previous public.b2b_request_attempts; v_order public.orders;
  v_line jsonb; v_product public.products; v_items jsonb := '[]'; v_total bigint := 0;
  v_qty integer; v_pack integer; v_price numeric; v_line_minor bigint; v_ids integer[] := '{}';
begin
  if p_user_id is null or p_company_id is null or p_attempt_id is null
    or p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$'
    then raise exception 'INVALID_REQUEST'; end if;
  select * into v_company from public.b2b_companies where id=p_company_id and user_id=p_user_id and status='active' for share;
  if not found then raise exception 'COMPANY_ACCESS_DENIED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text||':'||p_attempt_id::text,0));
  select * into v_previous from public.b2b_request_attempts where company_id=p_company_id and attempt_id=p_attempt_id;
  if found then
    if v_previous.request_hash <> p_request_hash then raise exception 'REQUEST_CONFLICT'; end if;
    select * into v_order from public.orders where id=v_previous.order_id;
  else
    if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_REQUEST'; end if;
    if jsonb_array_length(p_items) not between 1 and 50
      or p_email is null or length(p_email) not between 3 and 200 or p_email !~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$'
      or p_phone is null or length(p_phone) not between 6 and 30
      or jsonb_typeof(p_shipping) is distinct from 'object' or length(p_shipping::text)>4000
      or p_notes is null or length(p_notes)>500 then raise exception 'INVALID_REQUEST'; end if;
    for v_line in select value from jsonb_array_elements(p_items) loop
      if jsonb_typeof(v_line->'id') is distinct from 'number' or jsonb_typeof(v_line->'quantity') is distinct from 'number'
        or (v_line->>'id') !~ '^[1-9][0-9]{0,8}$' or (v_line->>'quantity') !~ '^[1-9][0-9]{0,4}$'
        then raise exception 'INVALID_CART'; end if;
      v_qty := (v_line->>'quantity')::integer;
      if v_qty>10000 or (v_line->>'id')::integer=any(v_ids) then raise exception 'INVALID_CART'; end if;
      v_ids:=array_append(v_ids,(v_line->>'id')::integer);
      select * into v_product from public.products where id=(v_line->>'id')::integer for share;
      if not found or v_product.in_stock is distinct from true then raise exception 'PRODUCT_UNAVAILABLE'; end if;
      v_pack:=greatest(coalesce(v_product.pieces_per_carton,0),1);
      if v_qty % v_pack <> 0 then raise exception 'WHOLE_CARTONS_REQUIRED'; end if;
      v_price:=case when coalesce(v_product.pieces_per_carton,0)>0
        then coalesce(nullif(v_product.carton_price,0),nullif(v_product.wholesale_price,0),v_product.price)
        else coalesce(nullif(v_product.wholesale_price,0),v_product.price) end;
      if v_price is null or v_price<=0 or v_price>100000 then raise exception 'INVALID_PRICE'; end if;
      -- The existing B2B model uses carton prices and quantities expressed in pieces.
      -- Round each carton once; a carton of twelve pieces never loses cents.
      v_line_minor:=round(v_price*100)::bigint * (v_qty/v_pack);
      v_total:=v_total+v_line_minor;
      v_items:=v_items||jsonb_build_array(jsonb_build_object('id',v_product.id,'name',v_product.name,
        'price',v_price/v_pack,'quantity',v_qty,'image',v_product.image,'sku',v_product.sku,
        'carton_price',v_price,'pieces_per_carton',coalesce(v_product.pieces_per_carton,0),'line_total_minor',v_line_minor));
    end loop;
    if v_total<=0 or v_total>10000000 then raise exception 'INVALID_TOTAL'; end if;
    insert into public.orders(order_number,b2b_company_id,customer_email,customer_phone,status,total_amount,currency,
      items,shipping_address,tracking_notes,is_b2b_order,payment_method,updated_at)
    values('B2B-'||to_char(now(),'YYYYMMDD')||'-'||upper(replace(gen_random_uuid()::text,'-','')),
      p_company_id,p_email,p_phone,'pending_review',v_total/100.0,'EUR',v_items,p_shipping,p_notes,true,'b2b_request',now())
    returning * into v_order;
    insert into public.b2b_request_attempts(company_id,attempt_id,request_hash,order_id,notification_snapshot)
      values(p_company_id,p_attempt_id,p_request_hash,v_order.id,
        jsonb_build_object('order',to_jsonb(v_order),'company_name',v_company.company_name)) returning * into v_previous;
  end if;
  return jsonb_build_object('order',to_jsonb(v_order),'company_name',v_company.company_name,'notification_snapshot',v_previous.notification_snapshot,
    'notification_sent_at',v_previous.notification_sent_at,'request_created_at',v_previous.created_at);
end $$;

revoke all on function public.b2b_rate_limit(text,text,integer) from public,anon,authenticated;
revoke all on function public.b2b_activate_company(uuid,uuid) from public,anon,authenticated;
revoke all on function public.b2b_create_request(uuid,uuid,uuid,text,jsonb,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.b2b_rate_limit(text,text,integer) to service_role;
grant execute on function public.b2b_activate_company(uuid,uuid) to service_role;
grant execute on function public.b2b_create_request(uuid,uuid,uuid,text,jsonb,text,text,jsonb,text) to service_role;
