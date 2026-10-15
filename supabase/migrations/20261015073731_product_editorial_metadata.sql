-- Additive SEO fields only. No business values, publication flags or rights change.
set lock_timeout = '5s';
alter table public.products
  add column seo_title text,
  add column seo_description text,
  add constraint products_seo_title_length check (seo_title is null or length(seo_title) between 1 and 160),
  add constraint products_seo_description_length check (seo_description is null or length(seo_description) between 1 and 320);

comment on column public.products.seo_title is 'Editorial page title; null uses the current product name. Existing retail/B2B row policies still apply.';
comment on column public.products.seo_description is 'Editorial search snippet without prices or availability; null uses the current description.';
grant select (seo_title, seo_description) on public.products to anon, authenticated;

-- An ordinary admin content edit must not leave an older search snippet behind.
-- Price/stock/SKU/channel edits never enter this branch. An explicit editorial
-- update that supplies different metadata retains its new metadata.
create function private.invalidate_product_seo_on_content_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.name is distinct from old.name or new.description is distinct from old.description)
    and new.seo_title is not distinct from old.seo_title
    and new.seo_description is not distinct from old.seo_description then
    new.seo_title := null;
    new.seo_description := null;
  end if;
  return new;
end;
$$;
revoke all on function private.invalidate_product_seo_on_content_edit() from public, anon, authenticated;
create trigger invalidate_product_seo_on_content_edit before update of name, description on public.products
  for each row execute function private.invalidate_product_seo_on_content_edit();

notify pgrst, 'reload schema';
