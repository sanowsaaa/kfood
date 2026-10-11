import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../content/blog/2026-10-11/', import.meta.url));
const md5 = value => createHash('md5').update(value, 'utf8').digest('hex');
const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex');
export const fingerprint = post => ({
  title: post.title, excerpt: post.excerpt, tags: post.tags,
  read_time: post.read_time, content_md5: md5(post.content),
});

export async function loadEditorial() {
  const snapshot = JSON.parse(await readFile(resolve(directory, 'originals.json'), 'utf8'));
  const metadata = JSON.parse(await readFile(resolve(directory, 'editorial.json'), 'utf8'));
  if (snapshot.project !== 'quqlovoiwgqfmgjumpgd') throw new Error('Unexpected blog project');
  if (snapshot.posts.length !== 32 || metadata.length !== 32) throw new Error('Expected all 32 articles');
  const ids = new Set();
  const posts = [];
  for (const editorial of metadata) {
    if (ids.has(editorial.id)) throw new Error('Duplicate editorial ID');
    ids.add(editorial.id);
    const original = snapshot.posts.find(post => post.id === editorial.id);
    if (!original || original.published !== true || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(original.slug)) throw new Error('Invalid original post');
    if (original.original_content_md5 !== md5(original.content)) throw new Error('Original snapshot checksum differs');
    const content = await readFile(resolve(directory, 'articles', `${original.slug}.html`), 'utf8');
    const text = content.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos);/g, ' ').trim();
    const wordCount = text.split(/\s+/u).filter(Boolean).length;
    if (wordCount < 500 || !content.includes('<h2>') || /<\/?(?:script|iframe|style|form)\b|\son\w+\s*=|javascript:/i.test(content)) throw new Error(`Invalid editorial content: ${original.slug}`);
    if (!editorial.title || !editorial.excerpt || !Array.isArray(editorial.tags) || new Set(editorial.tags).size !== editorial.tags.length) throw new Error('Invalid editorial metadata');
    const post = {
      ...original, title: editorial.title, excerpt: editorial.excerpt, tags: editorial.tags,
      content, read_time: Math.max(3, Math.ceil(wordCount / 200)),
    };
    posts.push({ original, post, wordCount, content_sha256: sha256(content), intent: editorial.intent });
  }
  return { project: snapshot.project, posts };
}

export function editorialSql(editorial, direction = 'apply') {
  if (!['apply', 'rollback'].includes(direction)) throw new Error('Unknown editorial direction');
  const payload = editorial.posts.map(({ original, post }) => {
    const expected = direction === 'apply' ? original : post;
    const replacement = direction === 'apply' ? post : original;
    return {
      id: original.id, slug: original.slug, expected: fingerprint(expected),
      replacement: { title: replacement.title, excerpt: replacement.excerpt, tags: replacement.tags, read_time: replacement.read_time, content: replacement.content },
    };
  });
  const serialized = JSON.stringify(payload);
  const delimiter = '$kfood_blog_payload_20261011$';
  if (serialized.includes(delimiter) || serialized.includes('$kfood_blog_refresh$')) throw new Error('SQL delimiter collision');
  return `-- Data-only editorial ${direction}; preserve IDs, URLs, photos, authors, categories, views and publication state.
DO $kfood_blog_refresh$
DECLARE
  payload jsonb := ${delimiter}${serialized}${delimiter}::jsonb;
  affected integer;
BEGIN
  IF jsonb_array_length(payload) <> 32 OR
     (SELECT count(DISTINCT p.id) FROM jsonb_to_recordset(payload) AS p(id bigint)) <> 32 OR
     EXISTS (SELECT 1 FROM jsonb_to_recordset(payload) AS p(id bigint) WHERE p.id NOT BETWEEN 1 AND 32 OR p.id IS NULL)
  THEN RAISE EXCEPTION 'Invalid editorial inventory'; END IF;

  PERFORM b.id FROM public.blog_posts b
    JOIN jsonb_to_recordset(payload) AS p(id bigint) ON b.id = p.id
    ORDER BY b.id FOR UPDATE OF b;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(payload) AS p(id bigint, slug text, expected jsonb)
    LEFT JOIN public.blog_posts b ON b.id = p.id
    WHERE b.id IS NULL OR b.slug IS DISTINCT FROM p.slug OR b.published IS DISTINCT FROM true OR
      jsonb_build_object('title', b.title, 'excerpt', b.excerpt, 'tags', to_jsonb(b.tags),
        'read_time', b.read_time, 'content_md5', md5(b.content)) IS DISTINCT FROM p.expected
  ) THEN RAISE EXCEPTION 'Article was edited after the snapshot; no articles were changed'; END IF;

  UPDATE public.blog_posts b SET
    title = p.replacement->>'title', excerpt = p.replacement->>'excerpt',
    content = p.replacement->>'content',
    tags = ARRAY(SELECT jsonb_array_elements_text(p.replacement->'tags')),
    read_time = (p.replacement->>'read_time')::integer, updated_at = clock_timestamp()
  FROM jsonb_to_recordset(payload) AS p(id bigint, replacement jsonb)
  WHERE b.id = p.id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 32 THEN RAISE EXCEPTION 'Incomplete editorial update: %', affected; END IF;
END;
$kfood_blog_refresh$;
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const editorial = await loadEditorial();
  const mode = process.argv[2];
  if (mode === '--sql' || mode === '--rollback-sql') {
    if (!process.argv[3]) throw new Error('Supply a destination outside the repository for generated SQL');
    await writeFile(resolve(process.argv[3]), editorialSql(editorial, mode === '--sql' ? 'apply' : 'rollback'), 'utf8');
  } else if (mode && mode !== '--check') throw new Error('Use --check, --sql destination, or --rollback-sql destination');
  console.log(JSON.stringify({ project: editorial.project, articles: editorial.posts.length,
    words: editorial.posts.reduce((sum, post) => sum + post.wordCount, 0),
    shortest: Math.min(...editorial.posts.map(post => post.wordCount)),
    longest: Math.max(...editorial.posts.map(post => post.wordCount)),
  }));
}
