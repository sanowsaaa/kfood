-- Emergency rollback for catalog channels only. Review deployment state first.
-- Keeps orders, stock, outboxes, product rows and the two additive columns.
begin;
set local lock_timeout='5s';
drop trigger if exists stamp_product_revision on public.products;
drop function if exists private.stamp_product_revision();
drop function if exists public.admin_update_product(integer,bigint,jsonb);
drop function if exists private.admin_update_product(integer,bigint,jsonb);
drop function if exists public.admin_delete_product(integer,bigint);
drop function if exists private.admin_delete_product(integer,bigint);
alter table public.products drop constraint if exists products_catalog_channels;
alter table public.products alter column b2b_enabled set default true;
alter table public.products alter column visibility set default 'retail';
alter table public.products alter column visibility drop not null;
alter table public.products alter column stock set default 100;
alter table public.products alter column in_stock set default true;
grant update,delete on public.products to authenticated;
CREATE OR REPLACE FUNCTION private.b2b_catalog_rows()
 RETURNS TABLE(id integer, name text, description text, price numeric, wholesale_price numeric, carton_price numeric, image text, category text, badge text, rating numeric, reviews integer, in_stock boolean, stock integer, weight text, volume text, sku text, slug text, moq integer, moq_unit text, pieces_per_carton integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not (select private.can_read_b2b_catalog()) then
    raise exception 'B2B_CATALOG_ACCESS_DENIED' using errcode = '42501';
  end if;
  return query
    select p.id, p.name, p.description, p.price, p.wholesale_price,
      p.carton_price, p.image, p.category, p.badge, p.rating, p.reviews,
      p.in_stock, p.stock, p.weight, p.volume, p.sku, p.slug,
      p.moq, p.moq_unit, p.pieces_per_carton
    from public.products p;
end;
$function$
;

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
      if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
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

notify pgrst, 'reload schema';
commit;
