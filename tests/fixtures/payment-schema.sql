-- Minimal fixture of columns used from the audited production schema.
-- Only loaded in a disposable local database; not a deployable baseline.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
create table public.products (
  id integer primary key, name text not null, price numeric not null,
  stock integer, in_stock boolean default true, visibility text default 'retail', updated_at timestamptz
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), order_number text unique,
  stripe_session_id text unique, customer_email text not null, customer_phone text,
  total_amount numeric not null, original_total_amount numeric, currency text default 'BGN',
  status text default 'pending', items jsonb not null, shipping_address jsonb,
  billing_address jsonb, payment_method text default 'stripe',
  created_at timestamptz default now(),updated_at timestamptz default now()
);
alter table public.orders enable row level security;
create policy "Anyone can create orders" on public.orders for insert with check(true);
grant select,insert,update,delete on public.orders,public.products to service_role;
grant select,insert,update on public.orders to anon,authenticated;
