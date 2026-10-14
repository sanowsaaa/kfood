-- Preserve today's two catalogs. Existing B2B access includes retail rows too.
-- Constant defaults backfill without rewriting product values, timestamps or stock.
set lock_timeout = '5s';
alter table public.products
  add column b2b_enabled boolean not null default true,
  add column edit_version bigint not null default 0;
comment on column public.products.b2b_enabled is
  'Independent B2B publication. Does not make the product public; retail remains visibility=retail.';
comment on column public.products.edit_version is
  'Server-managed product revision for optimistic admin writes, including inventory changes from checkout.';

-- All writers, including the existing checkout transactions, advance this token.
create function private.stamp_product_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.edit_version := old.edit_version + 1;
  new.updated_at := clock_timestamp();
  return new;
end $$;
revoke all on function private.stamp_product_revision() from public, anon, authenticated;
create trigger stamp_product_revision before update on public.products
  for each row execute function private.stamp_product_revision();

-- One locked, checked patch. Never trust a stale full form or a client timestamp.
create function private.admin_update_product(
  p_product_id integer, p_expected_version bigint, p_changes jsonb
) returns setof public.products
language plpgsql security definer set search_path = '' as $$
declare
  v_current public.products;
  v_next public.products;
  v_set text;
  v_key text;
  v_allowed text[] := array['name','description','price','price_euro',
    'wholesale_price','carton_price','image','category','badge','rating','reviews',
    'in_stock','stock','weight','volume','sku','cost_price','moq','moq_unit',
    'pieces_per_carton','visibility','b2b_enabled'];
begin
  if not (select private.is_admin()) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_changes) is distinct from 'object' or p_changes = '{}'::jsonb then
    raise exception 'INVALID_PRODUCT_PATCH' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_object_keys(p_changes) k where not (k = any(v_allowed))) then
    raise exception 'INVALID_PRODUCT_FIELD' using errcode = '22023';
  end if;
  select * into v_current from public.products where id = p_product_id for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'PT404';
  end if;
  if p_expected_version is distinct from v_current.edit_version then
    raise exception 'PRODUCT_CHANGED' using errcode = 'PT409';
  end if;
  -- Validate only submitted fields; unrelated legacy values stay untouched.
  for v_key in select jsonb_object_keys(p_changes) loop
    if v_key = any(array['price','price_euro','wholesale_price','carton_price','rating',
      'reviews','stock','cost_price','moq','pieces_per_carton']) then
      if jsonb_typeof(p_changes->v_key) is distinct from 'number'
        or (p_changes->>v_key)::numeric < 0 then
        raise exception 'INVALID_PRODUCT_VALUES' using errcode='22023';
      end if;
    elsif v_key = any(array['in_stock','b2b_enabled']) then
      if jsonb_typeof(p_changes->v_key) is distinct from 'boolean' then
        raise exception 'INVALID_PRODUCT_VALUES' using errcode='22023';
      end if;
    elsif jsonb_typeof(p_changes->v_key) is distinct from 'string'
      and not (v_key=any(array['description','badge','weight','volume','sku'])
        and p_changes->v_key='null'::jsonb) then
      raise exception 'INVALID_PRODUCT_VALUES' using errcode='22023';
    end if;
  end loop;
  v_next := jsonb_populate_record(v_current, p_changes);
  if (p_changes ? 'name' and length(trim(v_next.name))=0)
    or (p_changes ? 'price' and (v_next.price<=0 or v_next.price<>round(v_next.price,2)))
    or (p_changes ? 'moq' and v_next.moq<1)
    or (p_changes ? 'rating' and v_next.rating>5)
    or (p_changes ? 'visibility' and v_next.visibility not in ('retail','wholesale','hidden')) then
    raise exception 'INVALID_PRODUCT_VALUES' using errcode='22023';
  end if;
  select string_agg(format('%I=q.%I',k,k),', ') into v_set
    from jsonb_object_keys(p_changes) k;
  -- Identifiers are whitelisted and quoted; all field values remain parameters.
  return query execute format(
    'update public.products p set %s from jsonb_populate_record(null::public.products,$1) q where p.id=$2 returning p.*',v_set
  ) using p_changes,p_product_id;
end $$;
revoke all on function private.admin_update_product(integer,bigint,jsonb) from public, anon;
grant execute on function private.admin_update_product(integer,bigint,jsonb) to authenticated;

create function public.admin_update_product(
  p_product_id integer, p_expected_version bigint, p_changes jsonb
) returns setof public.products
language sql security invoker set search_path = '' as $$
  select * from private.admin_update_product(p_product_id,p_expected_version,p_changes);
$$;
revoke all on function public.admin_update_product(integer,bigint,jsonb) from public, anon;
grant execute on function public.admin_update_product(integer,bigint,jsonb) to authenticated;

-- Deletion also requires the revision shown in the administrator's current list.
create function private.admin_delete_product(p_product_id integer,p_expected_version bigint)
returns table(id integer) language plpgsql security definer set search_path = '' as $$
declare v_version bigint;
begin
  if not (select private.is_admin()) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select p.edit_version into v_version from public.products p where p.id=p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode='PT404'; end if;
  if p_expected_version is distinct from v_version then
    raise exception 'PRODUCT_CHANGED' using errcode='PT409';
  end if;
  return query delete from public.products p where p.id=p_product_id returning p.id;
end $$;
revoke all on function private.admin_delete_product(integer,bigint) from public, anon;
grant execute on function private.admin_delete_product(integer,bigint) to authenticated;
create function public.admin_delete_product(p_product_id integer,p_expected_version bigint)
returns table(id integer) language sql security invoker set search_path = '' as $$
  select * from private.admin_delete_product(p_product_id,p_expected_version);
$$;
revoke all on function public.admin_delete_product(integer,bigint) from public, anon;
grant execute on function public.admin_delete_product(integer,bigint) to authenticated;

-- Exact existing projection and active-company guard; only publication is new.
create or replace function private.b2b_catalog_rows()
returns table (
  id integer, name text, description text, price numeric,
  wholesale_price numeric, carton_price numeric, image text, category text,
  badge text, rating numeric, reviews integer, in_stock boolean, stock integer,
  weight text, volume text, sku text, slug text, moq integer,
  moq_unit text, pieces_per_carton integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.can_read_b2b_catalog()) then
    raise exception 'B2B_CATALOG_ACCESS_DENIED' using errcode = '42501';
  end if;
  return query
    select p.id, p.name, p.description, p.price, p.wholesale_price,
      p.carton_price, p.image, p.category, p.badge, p.rating, p.reviews,
      p.in_stock, p.stock, p.weight, p.volume, p.sku, p.slug,
      p.moq, p.moq_unit, p.pieces_per_carton
    from public.products p
    where p.b2b_enabled and p.visibility in ('retail','wholesale');
end $$;


-- Preserve request snapshots, prices, retries and notification delivery.
CREATE OR REPLACE FUNCTION public.b2b_create_request(p_user_id uuid, p_company_id uuid, p_attempt_id uuid, p_request_hash text, p_items jsonb, p_email text, p_phone text, p_shipping jsonb, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
      if not found or v_product.b2b_enabled is not true or coalesce(v_product.visibility,'') not in ('retail','wholesale') then raise exception 'PRODUCT_UNAVAILABLE'; end if;
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
end $function$
;

reset lock_timeout;
notify pgrst, 'reload schema';
