-- Stop web access to historical invoices without deleting records or changing orders.
alter table public.b2b_invoices enable row level security;
revoke all on table public.b2b_invoices from public, anon, authenticated;
grant all on table public.b2b_invoices to service_role;
