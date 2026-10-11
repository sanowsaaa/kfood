-- Apply after checkout_payment_integrity and b2b_access_and_requests.
-- Keep the current business flows; make authorization and writes authoritative.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create function private.protect_stock_holds() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_held bigint;
begin
  select coalesce(sum(quantity),0) into v_held from public.checkout_stock_holds where product_id=old.id and state='held';
  if tg_op='DELETE' then
    if v_held>0 then raise exception 'Продуктът има активни резерви за плащане.' using errcode='23514'; end if;
    return old;
  end if;
  if new.stock is null or new.stock<0 or new.stock<v_held then
    raise exception 'Наличността не може да е под активните резерви (% броя).',v_held using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function private.protect_stock_holds() from public,anon,authenticated;
create trigger protect_checkout_stock before update of stock or delete on public.products
  for each row execute function private.protect_stock_holds();

create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u where u.id=(select auth.uid()) and u.email_confirmed_at is not null
    and (u.email='nasko1332@gmail.com' or exists(select 1 from public.user_roles r
      where r.user_id=u.id and r.role in ('admin','super_admin'))));
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

create function private.require_admin(p_actor uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from auth.users u where u.id=p_actor and u.email_confirmed_at is not null
    and (u.email='nasko1332@gmail.com' or exists(select 1 from public.user_roles r
      where r.user_id=u.id and r.role in ('admin','super_admin')))) then raise exception 'ADMIN_REQUIRED'; end if;
end $$;
revoke all on function private.require_admin(uuid) from public, anon, authenticated;
grant execute on function private.require_admin(uuid) to service_role;

-- RLS is row-level: table SELECT must be removed before column grants work.
revoke select on public.products from public,anon,authenticated;
grant select(id,name,description,price,image,category,badge,rating,reviews,in_stock,stock,weight,volume,
  created_at,updated_at,price_euro,sku,wholesale_price,moq,moq_unit,pieces_per_carton,carton_price,slug,visibility)
  on public.products to anon,authenticated;
create function public.admin_products() returns setof public.products language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  return query select * from public.products order by created_at desc,id;
end $$;
revoke all on function public.admin_products() from public,anon;
grant execute on function public.admin_products() to authenticated;

drop policy if exists "Anyone can insert review" on public.reviews;
create policy reviews_submit_pending on public.reviews for insert to anon,authenticated with check (
  is_approved is false and rating between 1 and 5 and length(trim(name)) between 1 and 100
  and length(trim(text)) between 1 and 1000 and (product_name is null or length(product_name)<=200));
create policy reviews_admin on public.reviews for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy blog_admin on public.blog_posts for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
grant select,insert,update,delete on public.reviews,public.blog_posts to authenticated;
grant usage,select on sequence public.blog_posts_id_seq to authenticated;

drop policy if exists "Anyone can submit application" on public.b2b_applications;
create policy applications_submit_pending on public.b2b_applications for insert to anon,authenticated
  with check (status='pending' and company_id is null and reviewer_id is null and reviewed_at is null
    and coalesce(review_notes,'')='' and accept_terms and accept_privacy and confirm_accurate);

-- Documents require an active partner and matching scope, in both metadata and Storage.
create function private.can_read_document(p_visibility text,p_company uuid,p_tier uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.b2b_companies c where c.user_id=(select auth.uid()) and c.status='active'
    and (p_visibility='all' or (p_visibility='company' and c.id=p_company)
      or (p_visibility='tier' and c.pricing_tier_id=p_tier)));
$$;
revoke all on function private.can_read_document(text,uuid,uuid) from public,anon;
grant execute on function private.can_read_document(text,uuid,uuid) to authenticated;
create policy documents_partner_read on public.b2b_documents for select to authenticated
  using (private.can_read_document(visibility,company_id,tier_id));
grant select on public.b2b_documents to authenticated;
alter table public.b2b_documents add column storage_path text unique;
alter table public.b2b_documents add constraint b2b_document_scope check (
  (visibility='all' and company_id is null and tier_id is null)
  or (visibility='company' and company_id is not null and tier_id is null)
  or (visibility='tier' and tier_id is not null and company_id is null)) not valid;

-- Persistent delivery with a stable provider idempotency key and immutable payload.
create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(), kind text not null
    check(kind in ('b2b_approval','cod_admin','cod_boss','cod_customer')),
  entity_id uuid not null, recipient text, snapshot jsonb not null, payload jsonb,
  state text not null default 'pending' check(state in ('pending','leased','sent','review')),
  attempts integer not null default 0, lease_id uuid, lease_until timestamptz,
  first_attempt_at timestamptz, next_attempt_at timestamptz not null default now(), sent_at timestamptz,
  created_at timestamptz not null default now(), unique(kind,entity_id)
);
create index notification_outbox_pending_idx on public.notification_outbox(next_attempt_at)
  where state in ('pending','leased');
alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from public,anon,authenticated;
grant all on public.notification_outbox to service_role;

create function public.notification_claim(p_id uuid default null,p_limit integer default 5)
returns setof public.notification_outbox language plpgsql security invoker set search_path = '' as $$
begin
  if p_limit not between 1 and 10 then raise exception 'INVALID_LIMIT'; end if;
  -- Resend keeps keys for 24h. Never retry an ambiguous send beyond that window.
  update public.notification_outbox set state='review',lease_id=null,lease_until=null
    where state in ('pending','leased') and (p_id is null or id=p_id)
      and (first_attempt_at<now()-interval '20 hours' or attempts>=10)
      and (lease_until is null or lease_until<now());
  return query with candidates as (
    select id from public.notification_outbox where (p_id is null or id=p_id)
      and ((state='pending' and next_attempt_at<=now()) or (state='leased' and lease_until<now()))
    order by next_attempt_at,id for update skip locked limit p_limit
  ) update public.notification_outbox j set state='leased',lease_id=gen_random_uuid(),
    lease_until=now()+interval '2 minutes',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now())
    from candidates c where j.id=c.id returning j.*;
end $$;
create function public.notification_prepare(p_id uuid,p_lease uuid,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_payload jsonb;
begin
  update public.notification_outbox set payload=coalesce(payload,p_payload)
    where id=p_id and state='leased' and lease_id=p_lease and lease_until>now() returning payload into v_payload;
  if not found then raise exception 'LEASE_LOST'; end if;
  return v_payload;
end $$;
create function public.notification_finish(p_id uuid,p_lease uuid,p_success boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.notification_outbox set state=case when p_success then 'sent' when attempts>=10 then 'review' else 'pending' end,
    sent_at=case when p_success then now() else sent_at end,
    next_attempt_at=now()+interval '1 minute'*least(attempts*attempts,60),lease_id=null,lease_until=null
    where id=p_id and state='leased' and lease_id=p_lease;
  if not found then raise exception 'LEASE_LOST'; end if;
end $$;

create function public.b2b_approve_application(p_application uuid,p_actor uuid,p_notes text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare a public.b2b_applications; c public.b2b_companies; j public.notification_outbox;
begin
  perform private.require_admin(p_actor);
  if p_notes is null or length(p_notes)>2000 then raise exception 'INVALID_NOTES'; end if;
  select * into a from public.b2b_applications where id=p_application for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  if a.status='approved' then
    if a.company_id is null then raise exception 'APPLICATION_REQUIRES_REVIEW'; end if;
    select * into j from public.notification_outbox where kind='b2b_approval' and entity_id=a.id;
    return jsonb_build_object('company_id',a.company_id,'notification_id',j.id,'email_sent',j.state='sent');
  end if;
  if a.company_id is not null then raise exception 'APPLICATION_REQUIRES_REVIEW'; end if;
  if a.email is null or trim(a.email) !~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$'
    then raise exception 'INVALID_COMPANY_EMAIL'; end if;
  insert into public.b2b_companies(company_name,bulstat,vat_number,mol,address,city,postal_code,country,phone,email,
    website,business_type,years_in_business,number_of_locations,estimated_monthly_value,status)
  values(a.company_name,a.bulstat,a.vat_number,a.mol,a.address,a.city,a.postal_code,coalesce(a.country,'България'),
    a.phone,lower(trim(a.email)),a.website,a.business_type,a.years_in_business,a.number_of_locations,a.estimated_monthly_value,'active')
    returning * into c;
  if nullif(a.contact_first_name,'') is not null then
    insert into public.b2b_company_contacts(company_id,first_name,last_name,position,email,mobile,is_primary)
      values(c.id,a.contact_first_name,a.contact_last_name,a.contact_position,a.contact_email,a.contact_mobile,true);
  end if;
  if nullif(a.address,'') is not null then
    insert into public.b2b_company_addresses(company_id,type,address,city,postal_code,country,is_default)
      values(c.id,'shipping',a.address,a.city,a.postal_code,coalesce(a.country,'България'),true);
  end if;
  update public.b2b_applications set status='approved',company_id=c.id,reviewer_id=p_actor,
    review_notes=p_notes,reviewed_at=now(),updated_at=now() where id=a.id;
  insert into public.b2b_notifications(type,title,message,related_id)
    values('new_application','Одобрена B2B апликация: '||a.company_name,
      'Компанията '||a.company_name||' е одобрена за B2B партньорство.',c.id);
  -- Company email is also the only accepted activation identity. Keep the contact as contact data.
  insert into public.notification_outbox(kind,entity_id,recipient,snapshot)
    values('b2b_approval',a.id,c.email,jsonb_build_object('company_name',c.company_name,
      'first_name',coalesce(nullif(a.contact_first_name,''),'Партньор'),'company_id',c.id)) returning * into j;
  return jsonb_build_object('company_id',c.id,'notification_id',j.id,'email_sent',false,'email',c.email);
end $$;

create function public.b2b_review_order(p_order uuid,p_actor uuid,p_action text,p_discount numeric,p_notes text,p_lines jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare o public.orders; v_item jsonb; v_override jsonb; v_items jsonb:='[]';
  v_total bigint:=0; v_original numeric; v_qty integer; v_pack integer; v_price numeric;
  v_line bigint; v_custom boolean; v_ids integer[]:='{}';
begin
  perform private.require_admin(p_actor);
  if p_action is null or p_action not in ('approve','reject') or p_notes is null or length(p_notes)>500
    or p_discount is null or p_discount<0 or p_discount>=100 or p_discount::text in ('NaN','Infinity','-Infinity')
    then raise exception 'INVALID_REVIEW'; end if;
  select * into o from public.orders where id=p_order for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.is_b2b_order is distinct from true or o.status not in ('pending_review','approved','cancelled')
    then raise exception 'ORDER_NOT_REVIEWABLE'; end if;
  if p_action='reject' then
    update public.orders set status='cancelled',discount_notes=p_notes,approved_by=p_actor,approved_at=now(),updated_at=now()
      where id=o.id;
    return jsonb_build_object('success',true,'action','rejected','order_number',o.order_number,
      'message','Поръчка '||o.order_number||' е отказана.');
  end if;
  if p_lines is not null and jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'INVALID_PRICES'; end if;
  v_custom:=coalesce(jsonb_array_length(p_lines),0)>0;
  if v_custom then
    if jsonb_array_length(p_lines)>50 then raise exception 'INVALID_PRICES'; end if;
    for v_override in select value from jsonb_array_elements(p_lines) loop
      if jsonb_typeof(v_override->'id') is distinct from 'number' or (v_override->>'id') !~ '^[1-9][0-9]{0,8}$'
        or jsonb_typeof(v_override->'unit_price') is distinct from 'number'
        or (v_override->>'unit_price')::numeric<=0 or (v_override->>'unit_price')::numeric>100000
        or jsonb_typeof(v_override->'carton_price') is distinct from 'number'
        or (v_override->>'carton_price')::numeric<=0 or (v_override->>'carton_price')::numeric>100000
        or (v_override->>'id')::integer=any(v_ids)
        or not exists(select 1 from jsonb_array_elements(o.items) i where i->>'id'=v_override->>'id')
        then raise exception 'INVALID_PRICES'; end if;
      v_ids:=array_append(v_ids,(v_override->>'id')::integer);
    end loop;
    for v_item in select value from jsonb_array_elements(o.items) loop
      v_qty:=(v_item->>'quantity')::integer;
      v_pack:=greatest(coalesce((v_item->>'pieces_per_carton')::integer,0),1);
      if v_qty<=0 or v_qty%v_pack<>0 then raise exception 'INVALID_QUANTITY'; end if;
      select value into v_override from jsonb_array_elements(p_lines) where value->>'id'=v_item->>'id';
      if found then
        v_price:=(v_override->>'carton_price')::numeric;
        -- A carton total is authoritative; reject contradictory unit/carton prices.
        if abs((v_override->>'unit_price')::numeric*v_pack-v_price)>0.011*v_pack then raise exception 'INCONSISTENT_PRICE'; end if;
        v_line:=round(v_price*100)::bigint*(v_qty/v_pack);
        v_item:=v_item||jsonb_build_object('price',v_price/v_pack,'carton_price',v_price,'line_total_minor',v_line);
      else
        v_line:=coalesce((v_item->>'line_total_minor')::bigint,round((v_item->>'price')::numeric*v_qty*100)::bigint);
      end if;
      if v_line is null or v_line<=0 then raise exception 'INVALID_PRICES'; end if;
      v_total:=v_total+v_line; v_items:=v_items||jsonb_build_array(v_item);
    end loop;
  else
    v_items:=o.items;
    v_total:=round(coalesce(o.original_total_amount,o.total_amount)*100*(1-p_discount/100));
  end if;
  if v_total<=0 or v_total>10000000 then raise exception 'INVALID_TOTAL'; end if;
  v_original:=coalesce(o.original_total_amount,o.total_amount);
  update public.orders set status='approved',items=v_items,original_total_amount=v_original,total_amount=v_total/100.0,
    admin_discount_percent=case when v_custom then 0 else p_discount end,discount_notes=p_notes,
    approved_by=p_actor,approved_at=now(),updated_at=now() where id=o.id;
  return jsonb_build_object('success',true,'action','approved','order_number',o.order_number,
    'original_total',v_original,'discounted_total',v_total/100.0,'discount_percent',case when v_custom then 0 else p_discount end,
    'has_custom_prices',v_custom,'message','Поръчка '||o.order_number||' е одобрена. Крайна сума: '||to_char(v_total/100.0,'FM999999990.00')||' €');
end $$;

revoke all on function public.notification_claim(uuid,integer),public.notification_prepare(uuid,uuid,jsonb),
  public.notification_finish(uuid,uuid,boolean),public.b2b_approve_application(uuid,uuid,text),
  public.b2b_review_order(uuid,uuid,text,numeric,text,jsonb) from public,anon,authenticated;
grant execute on function public.notification_claim(uuid,integer),public.notification_prepare(uuid,uuid,jsonb),
  public.notification_finish(uuid,uuid,boolean),public.b2b_approve_application(uuid,uuid,text),
  public.b2b_review_order(uuid,uuid,text,numeric,text,jsonb) to service_role;

create table public.cod_order_attempts (
  attempt_id uuid primary key, request_hash text not null check(request_hash ~ '^[0-9a-f]{64}$'),
  order_id uuid not null unique references public.orders(id), created_at timestamptz not null default now()
);
alter table public.cod_order_attempts enable row level security;
revoke all on public.cod_order_attempts from public,anon,authenticated;
grant all on public.cod_order_attempts to service_role;

create function public.cod_create_order(p_attempt uuid,p_hash text,p_items jsonb,p_email text,p_phone text,p_shipping jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare a public.cod_order_attempts; o public.orders; p public.products; item jsonb;
  items jsonb:='[]'; ids integer[]:='{}'; qty integer; held bigint; subtotal bigint:=0;
  discount integer; goods bigint; snapshot jsonb;
begin
  if p_attempt is null or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_ATTEMPT'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cod:'||p_attempt::text,0));
  select * into a from public.cod_order_attempts where attempt_id=p_attempt;
  if found then
    if a.request_hash<>p_hash then raise exception 'ATTEMPT_CONFLICT'; end if;
    select * into o from public.orders where id=a.order_id;
    return jsonb_build_object('order',to_jsonb(o),'duplicate',true);
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_CART'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 or p_email is null
    or length(p_email)>200 or p_email !~ '^[^[:space:]@,;]+@[^[:space:]@,;]+\.[^[:space:]@,;]+$'
    or p_phone is null or p_phone !~ '^(\+359[0-9]{8,9}|0[0-9]{9})$'
    or jsonb_typeof(p_shipping) is distinct from 'object' then raise exception 'INVALID_CUSTOMER'; end if;
  for item in select value from jsonb_array_elements(p_items) order by (value->>'id')::integer loop
    if jsonb_typeof(item->'id') is distinct from 'number' or (item->>'id') !~ '^[1-9][0-9]{0,8}$'
      or jsonb_typeof(item->'quantity') is distinct from 'number' or (item->>'quantity') !~ '^[1-9][0-9]{0,2}$'
      then raise exception 'INVALID_CART'; end if;
    qty:=(item->>'quantity')::integer;
    if qty>100 or (item->>'id')::integer=any(ids) then raise exception 'INVALID_CART'; end if;
    ids:=array_append(ids,(item->>'id')::integer);
    select * into p from public.products where id=(item->>'id')::integer for update;
    if not found or p.in_stock is distinct from true or coalesce(p.visibility,'retail') not in ('retail','both')
      or p.price is null or p.price<=0 or p.stock is null then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    select coalesce(sum(quantity),0) into held from public.checkout_stock_holds where product_id=p.id and state='held';
    if p.stock-held<qty then raise exception 'INSUFFICIENT_STOCK'; end if;
    subtotal:=subtotal+round(p.price*100)::bigint*qty;
    items:=items||jsonb_build_array(jsonb_build_object('id',p.id,'name',p.name,'price',p.price,
      'unit_minor',round(p.price*100),'quantity',qty,'line_minor',round(p.price*100)*qty));
  end loop;
  if subtotal<=0 or subtotal>10000000 then raise exception 'INVALID_TOTAL'; end if;
  discount:=case when subtotal>=10000 then 10 when subtotal>=5000 then 5 else 0 end;
  goods:=round(subtotal*(100-discount)/100.0);
  -- Preserve the existing 2 BGN COD fee, rounded once to EUR (1.02).
  insert into public.orders(order_number,customer_email,customer_phone,shipping_address,items,total_amount,currency,status,payment_method,is_b2b_order)
    values('ORD-'||to_char(now(),'YYYYMMDD')||'-'||upper(replace(gen_random_uuid()::text,'-','')),
      p_email,p_phone,p_shipping,items,(goods+102)/100.0,'EUR','pending','cod',false) returning * into o;
  for item in select value from jsonb_array_elements(items) loop
    update public.products set stock=stock-(item->>'quantity')::integer,
      in_stock=(stock-(item->>'quantity')::integer>0),updated_at=now() where id=(item->>'id')::integer;
  end loop;
  insert into public.cod_order_attempts(attempt_id,request_hash,order_id) values(p_attempt,p_hash,o.id);
  snapshot:=to_jsonb(o)||jsonb_build_object('subtotal_minor',subtotal,'discount_percent',discount,'goods_minor',goods,'cod_fee_minor',102);
  insert into public.notification_outbox(kind,entity_id,recipient,snapshot) values
    ('cod_admin',o.id,null,snapshot),('cod_boss',o.id,null,snapshot),('cod_customer',o.id,o.customer_email,snapshot);
  return jsonb_build_object('order',to_jsonb(o),'duplicate',false);
end $$;
revoke all on function public.cod_create_order(uuid,text,jsonb,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.cod_create_order(uuid,text,jsonb,text,text,jsonb) to service_role;

create or replace function public.checkout_apply_event(
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
  elsif v.attempt_id::text is distinct from p_attempt_id or v.order_number is distinct from p_order_number
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
        -- Consume this order's holds first, in this same transaction. Other holds remain protected.
        update public.checkout_stock_holds set state='consumed' where order_id=v.order_id and state='held';
        update public.products p set stock=p.stock-h.quantity, in_stock=(p.stock-h.quantity > 0),updated_at=now()
          from public.checkout_stock_holds h where h.product_id=p.id and h.order_id=v.order_id and h.state='consumed';
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
