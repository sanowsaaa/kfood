-- Apply only after the new admin build is confirmed published.
-- Phase 1 remains compatible with the currently published administrator UI.
set lock_timeout = '5s';
alter table public.products alter column b2b_enabled set default false;
alter table public.products alter column visibility set default 'hidden';
alter table public.products alter column visibility set not null;
alter table public.products alter column stock set default 0;
alter table public.products alter column in_stock set default false;
alter table public.products add constraint products_catalog_channels check (
  visibility = 'retail'
  or (visibility = 'wholesale' and b2b_enabled)
  or (visibility = 'hidden' and not b2b_enabled)
);

-- Block old open editor tabs and handcrafted writes that omit the revision.
-- Service-role checkout transactions retain their existing access and triggers.
revoke update, delete, truncate on public.products from public, anon, authenticated;
do $$
declare v_column text;
begin
  for v_column in select attname from pg_attribute
    where attrelid='public.products'::regclass and attnum>0 and not attisdropped
  loop
    execute format('revoke update (%I) on public.products from public, anon, authenticated',v_column);
  end loop;
end $$;

reset lock_timeout;
notify pgrst, 'reload schema';
