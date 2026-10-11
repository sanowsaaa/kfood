-- Preserve established application limit without exposing private application counts.
create or replace function public.check_b2b_application_limit(user_email text)
returns integer language sql stable security invoker set search_path='' as $$
  select count(*)::integer from public.b2b_applications
  where lower(email)=lower(user_email) or lower(contact_email)=lower(user_email);
$$;
grant execute on function public.check_b2b_application_limit(text) to anon,authenticated;

create function private.application_limit() returns trigger language plpgsql
security definer set search_path='' as $$
declare v_email text;
begin
  -- Administrative/service imports remain possible; public approval fields
  -- are still checked by the separate INSERT RLS policy.
  if current_setting('role',true) not in ('anon','authenticated')
    or (select private.is_admin()) then return new; end if;
  for v_email in select distinct lower(trim(e)) from unnest(array[new.email,new.contact_email]) e
    where e is not null and trim(e)<>'' order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended('b2b-application:'||v_email,0));
    if (select count(*) from public.b2b_applications
        where lower(trim(email))=v_email or lower(trim(contact_email))=v_email)>=5 then
      raise exception 'Достигнали сте лимита от 5 заявки за този имейл адрес. Свържете се с нас.' using errcode='23514';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.application_limit() from public,anon,authenticated;
create trigger b2b_application_limit before insert on public.b2b_applications
  for each row execute function private.application_limit();

-- Promo game rows contain visitor IPs and codes; only server handlers can
-- create them. The existing public leaderboard keeps its public fields.
revoke select,insert,update,delete on public.game_sessions from anon,authenticated;
grant select(score,player_name,created_at) on public.game_sessions to anon,authenticated;

-- Existing B2B UI accepts requests for preorder products. They are requests
-- for administrator review and do not consume or reserve retail stock.
create or replace function public.b2b_create_request(
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
end $$;

revoke all on function public.b2b_rate_limit(text,text,integer) from public,anon,authenticated;
revoke all on function public.b2b_activate_company(uuid,uuid) from public,anon,authenticated;
revoke all on function public.b2b_create_request(uuid,uuid,uuid,text,jsonb,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.b2b_rate_limit(text,text,integer) to service_role;
grant execute on function public.b2b_activate_company(uuid,uuid) to service_role;
grant execute on function public.b2b_create_request(uuid,uuid,uuid,text,jsonb,text,text,jsonb,text) to service_role;

-- Applies to staging projects that already had the object policies.
do $$begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='buckets' and policyname='b2b_bucket_admin_read') then
    execute $p$create policy b2b_bucket_admin_read on storage.buckets for select to authenticated
      using(id='b2b-documents' and (select private.is_admin()))$p$;
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='buckets' and policyname='b2b_bucket_admin_insert') then
    execute $p$create policy b2b_bucket_admin_insert on storage.buckets for insert to authenticated
      with check(id='b2b-documents' and public=false and file_size_limit>0 and file_size_limit<=10485760
        and allowed_mime_types is not null and allowed_mime_types <@ array[
        'application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword','image/jpeg','image/png','image/webp'] and (select private.is_admin()))$p$;
  end if;
end$$;

-- Keep the already provisioned staging event handler on this same contract.
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
