-- Minimal audited schema, exclusively for disposable local tests.
do $$ begin
  if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon,authenticated,service_role;
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('email',current_setting('request.jwt.claim.email',true));
$$;
grant usage on schema auth to anon,authenticated,service_role;
grant select on auth.users to service_role;
create table public.user_roles(user_id uuid primary key,role text);
grant select on public.user_roles to authenticated,service_role;
create table public.b2b_companies(
  id uuid primary key,company_name text,email text,status text,user_id uuid references auth.users(id),
  internal_notes text,updated_at timestamptz
);
alter table public.b2b_companies enable row level security;
create policy "Public can read active companies" on public.b2b_companies for select using(status='active');
create policy "Admin full access companies" on public.b2b_companies for all using(
  exists(select from public.user_roles where user_id=auth.uid() and role='admin')
);
grant all on public.b2b_companies to anon,authenticated,service_role;
create table public.products(
  id integer primary key,name text,price numeric,wholesale_price numeric,carton_price numeric,
  pieces_per_carton integer,stock integer default 100,in_stock boolean default true,visibility text default 'retail',
  image text,sku text,updated_at timestamptz
);
create table public.orders(
  id uuid primary key default gen_random_uuid(),order_number text unique,
  b2b_company_id uuid references public.b2b_companies(id),customer_email text,customer_phone text,
  status text,total_amount numeric,original_total_amount numeric,currency text,
  items jsonb,shipping_address jsonb,billing_address jsonb,tracking_notes text,is_b2b_order boolean default false,
  payment_method text,stripe_session_id text unique,created_at timestamptz default now(),updated_at timestamptz
);
alter table public.orders enable row level security;
create policy "Anyone can create orders" on public.orders for insert with check(true);
create policy "Users can view own orders" on public.orders for select using(customer_email=auth.jwt()->>'email');
create policy b2b_users_view_company_orders on public.orders for select using(
  exists(select from public.b2b_companies where id=b2b_company_id and user_id=auth.uid())
);
create policy orders_admin_select on public.orders for select using(
  exists(select from public.user_roles where user_id=auth.uid() and role='admin')
);
grant all on public.orders,public.products to anon,authenticated,service_role;
create table public.b2b_invoices(id uuid primary key,order_id uuid references public.orders(id),invoice_number text,invoice_data jsonb);
grant all on public.b2b_invoices to anon,authenticated,service_role;
insert into public.b2b_invoices values('60000000-0000-4000-8000-000000000001',null,'HISTORICAL','{"retained":true}');
