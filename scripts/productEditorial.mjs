import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The complete editorial payload contains private B2B products. It is supplied
// explicitly from a private file, never imported into the app or public repo.
const md5 = value => value === null ? null : createHash('md5').update(value, 'utf8').digest('hex');
const keys = ['description', 'seo_title', 'seo_description'];
export function validateProductEditorial(editorial) {
  if (editorial.project !== 'quqlovoiwgqfmgjumpgd' || !Array.isArray(editorial.products)
      || editorial.products.length < 1 || editorial.products.length > 5000) throw Error('Invalid editorial inventory');
  const ids = new Set();
  for (const p of editorial.products) {
    if (!Number.isSafeInteger(p.id) || p.id < 1 || ids.has(p.id) || typeof p.name !== 'string'
        || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) || !['retail','wholesale','hidden'].includes(p.visibility)
        || !(p.expected_description === null || typeof p.expected_description === 'string')) throw Error('Invalid editorial identity');
    ids.add(p.id);
    if (typeof p.description !== 'string' || p.description.trim().length < 100 || p.description.length > 10000
        || typeof p.seo_title !== 'string' || p.seo_title.trim().length < 1 || p.seo_title.length > 160
        || typeof p.seo_description !== 'string' || p.seo_description.trim().length < 1 || p.seo_description.length > 320
        || keys.some(key => /<\/?[a-z][^>]*>|\u0000/i.test(p[key]))) throw Error('Invalid plain-text editorial content');
  }
  return editorial;
}

export function productEditorialSql(editorial, direction = 'apply') {
  validateProductEditorial(editorial);
  if (!['apply','rollback'].includes(direction)) throw Error('Unknown editorial direction');
  const payload = editorial.products.map(p => {
    const original = { description: p.expected_description, seo_title: p.original_seo_title ?? null, seo_description: p.original_seo_description ?? null };
    const replacement = Object.fromEntries(keys.map(key => [key,p[key]]));
    const expected = direction === 'apply' ? original : replacement;
    return { id:p.id, name:p.name, slug:p.slug, visibility:p.visibility,
      expected: { description_md5:md5(expected.description), seo_title:expected.seo_title, seo_description:expected.seo_description },
      replacement:direction === 'apply' ? replacement : original };
  });
  const serialized = JSON.stringify(payload), delimiter = '$kfood_product_payload_20261015$';
  if (serialized.includes(delimiter) || serialized.includes('$kfood_product_editorial$')) throw Error('SQL delimiter collision');
  return `-- Private data-only ${direction}. Only description and SEO metadata are assigned.
DO $kfood_product_editorial$
DECLARE
  payload jsonb := ${delimiter}${serialized}${delimiter}::jsonb;
  protected_before jsonb;
  protected_after jsonb;
  affected integer;
BEGIN
  IF jsonb_array_length(payload) <> ${payload.length}
    OR (SELECT count(DISTINCT q.id) FROM jsonb_to_recordset(payload) q(id integer)) <> ${payload.length}
  THEN RAISE EXCEPTION 'Invalid product editorial inventory'; END IF;

  PERFORM p.id FROM public.products p
    JOIN jsonb_to_recordset(payload) q(id integer) ON q.id=p.id
    ORDER BY p.id FOR UPDATE OF p;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(payload) q(id integer,name text,slug text,visibility text,expected jsonb)
    LEFT JOIN public.products p ON p.id=q.id
    WHERE p.id IS NULL OR p.name IS DISTINCT FROM q.name OR p.slug IS DISTINCT FROM q.slug
      OR p.visibility IS DISTINCT FROM q.visibility
      OR jsonb_build_object('description_md5',md5(p.description),'seo_title',p.seo_title,
        'seo_description',p.seo_description) IS DISTINCT FROM q.expected
  ) THEN RAISE EXCEPTION 'Product content or publication was edited after the snapshot; no products were changed'; END IF;

  SELECT jsonb_agg(to_jsonb(p) - ARRAY['description','seo_title','seo_description','updated_at','edit_version'] ORDER BY p.id)
    INTO protected_before FROM public.products p
    JOIN jsonb_to_recordset(payload) q(id integer) ON q.id=p.id;

  UPDATE public.products p SET description=q.replacement->>'description',
    seo_title=q.replacement->>'seo_title', seo_description=q.replacement->>'seo_description'
    FROM jsonb_to_recordset(payload) q(id integer,replacement jsonb) WHERE p.id=q.id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> ${payload.length} THEN RAISE EXCEPTION 'Incomplete product editorial update: %',affected; END IF;

  SELECT jsonb_agg(to_jsonb(p) - ARRAY['description','seo_title','seo_description','updated_at','edit_version'] ORDER BY p.id)
    INTO protected_after FROM public.products p
    JOIN jsonb_to_recordset(payload) q(id integer) ON q.id=p.id;
  IF protected_after IS DISTINCT FROM protected_before THEN
    RAISE EXCEPTION 'Protected product field changed; entire editorial update rolled back';
  END IF;
END;
$kfood_product_editorial$;
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source,mode='--check',destination] = process.argv.slice(2);
  if (!source) throw Error('Supply a private editorial JSON path');
  const editorial=validateProductEditorial(JSON.parse(await readFile(resolve(source),'utf8')));
  if (mode==='--sql' || mode==='--rollback-sql') {
    if (!destination) throw Error('Supply a private SQL destination outside the repository');
    const repository=resolve(fileURLToPath(new URL('../',import.meta.url)));
    if (resolve(destination).startsWith(`${repository}/`)) throw Error('Private product SQL must stay outside the repository');
    await writeFile(resolve(destination),productEditorialSql(editorial,mode==='--sql'?'apply':'rollback'),'utf8');
  } else if (mode!=='--check') throw Error('Use --check, --sql destination, or --rollback-sql destination');
  console.log(JSON.stringify({products:editorial.products.length,
    retail:editorial.products.filter(p=>p.visibility==='retail').length,
    private:editorial.products.filter(p=>p.visibility!=='retail').length}));
}
