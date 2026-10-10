-- Preserve existing product URLs and every business field. Fill only missing slugs.
-- The migration runner supplies the transaction; refuse a long wait on live writes.
set local lock_timeout = '5s';
set local statement_timeout = '45s';
lock table public.products in share row exclusive mode;

create function public.product_slug_base(p_name text)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare
  v_slug text := lower(coalesce(p_name, ''));
  v_letter record;
begin
  -- Transliterate before normalization: Bulgarian й must stay y, not become и.
  for v_letter in select key, value from jsonb_each_text(
    '{"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ж":"zh","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sht","ъ":"a","ь":"y","ю":"yu","я":"ya","ё":"yo","э":"e","ы":"y"}'::jsonb
  ) loop
    v_slug := replace(v_slug, v_letter.key, v_letter.value);
  end loop;
  v_slug := normalize(v_slug, NFKD);
  v_slug := regexp_replace(v_slug, '[̀-ͯ]', '', 'g');
  v_slug := replace(v_slug, '×', ' x ');
  v_slug := btrim(regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g'), '-');
  v_slug := btrim(left(v_slug, 160), '-');
  if v_slug = '' then return 'product'; end if;
  if v_slug ~ '^[0-9]+$' then return 'product-' || v_slug; end if;
  return v_slug;
end;
$$;
revoke all on function public.product_slug_base(text) from public, anon;
grant execute on function public.product_slug_base(text) to authenticated, service_role;

create function public.ensure_product_slug()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer := 0;
begin
  if TG_OP = 'UPDATE' and nullif(btrim(OLD.slug), '') is not null then
    if NEW.slug is not distinct from OLD.slug then return NEW; end if;
    if nullif(btrim(NEW.slug), '') is null then
      NEW.slug := OLD.slug;
      return NEW;
    end if;
  end if;
  v_base := coalesce(nullif(btrim(NEW.slug), ''), public.product_slug_base(NEW.name));
  if v_base !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or v_base ~ '^[0-9]+$' then
    raise exception 'INVALID_PRODUCT_SLUG' using errcode = '23514';
  end if;
  -- Product creation is infrequent. Serialize only slug allocation, not stock/price updates.
  perform pg_advisory_xact_lock(7102026, 1);
  v_candidate := v_base;
  while exists(select 1 from public.products where slug = v_candidate and id <> NEW.id) loop
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || NEW.id::text
      || case when v_suffix > 1 then '-' || v_suffix::text else '' end;
  end loop;
  NEW.slug := v_candidate;
  return NEW;
end;
$$;
revoke all on function public.ensure_product_slug() from public, anon;
grant execute on function public.ensure_product_slug() to authenticated, service_role;

create trigger products_assign_slug
before insert or update of name, slug on public.products
for each row execute function public.ensure_product_slug();

do $$
declare
  v_product record;
  v_data_hash text;
  v_existing_urls jsonb;
begin
  select md5(string_agg((to_jsonb(p) - 'slug' - 'updated_at')::text, '' order by id))
    into v_data_hash from public.products p;
  select jsonb_object_agg(id::text, slug) into v_existing_urls from public.products
    where nullif(btrim(slug), '') is not null;
  -- Allocate identical names deterministically; keep all pre-existing nonempty slugs.
  for v_product in select id from public.products
    where nullif(btrim(slug), '') is null order by id
  loop
    update public.products set slug = null, updated_at = now() where id = v_product.id;
  end loop;
  if v_data_hash is distinct from (
    select md5(string_agg((to_jsonb(p) - 'slug' - 'updated_at')::text, '' order by id)) from public.products p
  ) then raise exception 'PRODUCT_SLUG_BACKFILL_CHANGED_BUSINESS_DATA'; end if;
  if exists(select 1 from public.products p
    where v_existing_urls ? p.id::text and p.slug is distinct from v_existing_urls ->> p.id::text
  ) then raise exception 'PRODUCT_SLUG_BACKFILL_CHANGED_EXISTING_URL'; end if;
end;
$$;

alter table public.products alter column slug set not null;
alter table public.products add constraint products_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug !~ '^[0-9]+$');
