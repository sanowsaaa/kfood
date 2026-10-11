import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { editorialSql, fingerprint, loadEditorial } from '../scripts/blogEditorial.mjs';

const editorial = await loadEditorial();
async function fixture() {
  const db = new PGlite();
  await db.exec(`CREATE TABLE blog_posts (
    id bigint PRIMARY KEY, slug text UNIQUE NOT NULL, title text, excerpt text, content text,
    tags text[], read_time integer, published boolean, views integer, cover_image text,
    author text, category text, created_at timestamptz, updated_at timestamptz
  );`);
  for (const { original } of editorial.posts) {
    await db.query(`INSERT INTO blog_posts VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [
      original.id, original.slug, original.title, original.excerpt, original.content,
      original.tags, original.read_time, original.published, 100 + original.id,
      original.cover_image, original.author, original.category, original.created_at, original.updated_at,
    ]);
  }
  await db.exec(`INSERT INTO blog_posts (id,slug,title,published,views) VALUES (33,'separate-admin-draft','Keep draft',false,7);`);
  return db;
}
async function rows(db) { return (await db.query('SELECT * FROM blog_posts ORDER BY id')).rows; }
function unchangedFields(before, after) {
  for (const key of ['id','slug','cover_image','author','category','published','views','created_at']) assert.deepEqual(after[key], before[key], key);
}

test('all 32 articles update together; unrelated records, photos, URLs and live view counts survive apply and rollback', async () => {
  const db = await fixture();
  try {
    const before = await rows(db);
    await db.exec(editorialSql(editorial));
    const after = await rows(db);
    assert.deepEqual(after[32], before[32]);
    for (let i = 0; i < 32; i++) {
      unchangedFields(before[i], after[i]);
      assert.deepEqual(fingerprint(after[i]), fingerprint(editorial.posts[i].post));
    }
    await db.exec('UPDATE blog_posts SET views=views+10, cover_image=\'new-admin-photo.webp\' WHERE id=9');
    await db.exec(editorialSql(editorial, 'rollback'));
    const reverted = await rows(db);
    for (let i = 0; i < 32; i++) assert.deepEqual(fingerprint(reverted[i]), fingerprint(editorial.posts[i].original));
    assert.equal(reverted[8].views, before[8].views + 10);
    assert.equal(reverted[8].cover_image, 'new-admin-photo.webp');
    assert.deepEqual(reverted[32], before[32]);
  } finally { await db.close(); }
});

test('concurrent editorial changes, removed articles and publication changes each cancel the whole update', async () => {
  for (const change of ["UPDATE blog_posts SET excerpt='Admin revision' WHERE id=19", 'DELETE FROM blog_posts WHERE id=4', 'UPDATE blog_posts SET published=false WHERE id=32']) {
    const db = await fixture();
    try {
      await db.exec(change);
      const before = await rows(db);
      await assert.rejects(db.exec(editorialSql(editorial)), /edited after the snapshot/);
      assert.deepEqual(await rows(db), before);
    } finally { await db.close(); }
  }
});

test('a write error rolls back every article; a second apply cannot silently overwrite the deployed revision', async () => {
  const db = await fixture();
  try {
    await db.exec(`ALTER TABLE blog_posts ADD CONSTRAINT reject_editorial_title CHECK (id <> 22 OR title <> '${editorial.posts[21].post.title.replaceAll("'", "''")}');`);
    const before = await rows(db);
    await assert.rejects(db.exec(editorialSql(editorial)), /reject_editorial_title/);
    assert.deepEqual(await rows(db), before);
    await db.exec('ALTER TABLE blog_posts DROP CONSTRAINT reject_editorial_title');
    await db.exec(editorialSql(editorial));
    const deployed = await rows(db);
    await assert.rejects(db.exec(editorialSql(editorial)), /edited after the snapshot/);
    assert.deepEqual(await rows(db), deployed);
  } finally { await db.close(); }
});

test('rollback refuses to overwrite newer admin content', async () => {
  const db = await fixture();
  try {
    await db.exec(editorialSql(editorial));
    await db.exec("UPDATE blog_posts SET content=content || '<p>New admin paragraph</p>' WHERE id=1");
    const before = await rows(db);
    await assert.rejects(db.exec(editorialSql(editorial, 'rollback')), /edited after the snapshot/);
    assert.deepEqual(await rows(db), before);
  } finally { await db.close(); }
});
