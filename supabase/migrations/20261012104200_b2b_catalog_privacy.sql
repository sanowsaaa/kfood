-- Wholesale data is available only to a confirmed, active partner or an
-- administrator. Public catalog permissions must never include B2B prices.
create or replace function private.can_read_b2b_catalog()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select private.is_admin()) or exists (
    select 1
    from auth.users u
    join public.b2b_companies c on c.user_id = u.id
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and c.status = 'active'
  );
$$;
revoke all on function private.can_read_b2b_catalog() from public, anon;
grant execute on function private.can_read_b2b_catalog() to authenticated, service_role;

alter table public.products enable row level security;
alter policy "Allow public read access" on public.products
  to anon, authenticated using (visibility = 'retail');
-- Administrators still need to select wholesale rows when editing/deleting.
create policy products_admin_read on public.products
  for select to authenticated using ((select private.is_admin()));

revoke select on public.products from public, anon, authenticated;
revoke select (wholesale_price, carton_price, moq, moq_unit, pieces_per_carton, cost_price)
  on public.products from public, anon, authenticated;
grant select (id, name, description, price, image, category, badge, rating,
  reviews, in_stock, stock, weight, volume, created_at, updated_at, price_euro,
  sku, slug, visibility) on public.products to anon, authenticated;

-- The privileged implementation lives outside the exposed API schema. Its
-- explicit projection excludes costs and any future internal product columns.
create function private.b2b_catalog_rows()
returns table (
  id integer, name text, description text, price numeric,
  wholesale_price numeric, carton_price numeric, image text, category text,
  badge text, rating numeric, reviews integer, in_stock boolean, stock integer,
  weight text, volume text, sku text, slug text, moq integer,
  moq_unit text, pieces_per_carton integer
)
language plpgsql stable security definer set search_path = ''
as $$
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
$$;
revoke all on function private.b2b_catalog_rows() from public, anon;
grant execute on function private.b2b_catalog_rows() to authenticated;

create function public.b2b_catalog()
returns table (
  id integer, name text, description text, price numeric,
  wholesale_price numeric, carton_price numeric, image text, category text,
  badge text, rating numeric, reviews integer, in_stock boolean, stock integer,
  weight text, volume text, sku text, slug text, moq integer,
  moq_unit text, pieces_per_carton integer
)
language sql stable security invoker set search_path = ''
as $$ select * from private.b2b_catalog_rows(); $$;
revoke all on function public.b2b_catalog() from public, anon;
grant execute on function public.b2b_catalog() to authenticated;

alter table public.b2b_pricing_tiers enable row level security;
alter policy "Anyone can read pricing tiers" on public.b2b_pricing_tiers
  to authenticated using ((select private.can_read_b2b_catalog()));
revoke select on public.b2b_pricing_tiers from public, anon;
grant select on public.b2b_pricing_tiers to authenticated;

notify pgrst, 'reload schema';
