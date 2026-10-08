import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { confirmedRecord, checkedData, adminErrorMessage, verifyAdminAccess, createActionLock } from '../src/utils/admin.ts';

function database(reply) {
  const requests = [];
  const client = createClient('https://admin-test.invalid', 'test-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, options) => {
      requests.push({ url: String(url), method: options.method, headers: new Headers(options.headers), body: options.body });
      return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  return { client, requests };
}

for (const operation of ['update', 'delete']) {
  test(`${operation}: zero rows never confirms a write`, async () => {
    const { client, requests } = database({ status: 406, body: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object', details: 'The result contains 0 rows' } });
    const query = operation === 'delete' ? client.from('products').delete() : client.from('products').update({ in_stock: false });
    const result = await query.eq('id', 17).select('id').single();
    assert.throws(() => confirmedRecord(result, 17));
    assert.match(requests[0].headers.get('Prefer'), /return=representation/);
    assert.match(requests[0].url, /id=eq.17/);
    assert.match(requests[0].url, /select=id/);
  });
  test(`${operation}: only a returned matching record confirms a write`, async () => {
    const { client } = database({ status: 200, body: { id: 17 } });
    const query = operation === 'delete' ? client.from('products').delete() : client.from('products').update({ in_stock: false });
    assert.deepEqual(confirmedRecord(await query.eq('id', 17).select('id').single(), '17'), { id: 17 });
  });
}

test('insert: a database rejection cannot be mistaken for a saved form', async () => {
  const { client } = database({ status: 403, body: { code: '42501', message: 'new row violates row-level security policy' } });
  const result = await client.from('b2b_company_contacts').insert({ first_name: 'Test' }).select('id').single();
  assert.throws(() => confirmedRecord(result));
  assert.match(adminErrorMessage(result.error), /правата/);
});

test('missing, mismatched, or unacknowledged results cannot confirm success', () => {
  assert.throws(() => confirmedRecord({ data: null, error: null }));
  assert.throws(() => confirmedRecord({ data: { id: 18 }, error: null }, 17));
  assert.throws(() => confirmedRecord({ data: { id: 17 }, error: new Error('network') }, 17));
});

test('read errors differ from an empty successful list', () => {
  assert.deepEqual(checkedData({ data: [], error: null }), []);
  assert.throws(() => checkedData({ data: [], error: { code: '42501' } }));
  assert.throws(() => checkedData({ data: null, error: null }));
});

test('a failed member of a parallel read does not commit a partial screen', async () => {
  let applied = false;
  try {
    const replies = await Promise.all([Promise.resolve({ data: [{ id: 1 }], error: null }), Promise.resolve({ data: null, error: { code: '42501' } })]);
    replies.map(checkedData);
    applied = true;
  } catch { /* the UI preserves its previous data and displays an error */ }
  assert.equal(applied, false);
});

test('a same-tick double submission acquires the lock once; release allows a later action', async () => {
  const lock = createActionLock();
  let writes = 0;
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  async function submit() {
    if (!lock.acquire()) return;
    try { writes++; await pending; } finally { lock.release(); }
  }
  const first = submit();
  await submit();
  assert.equal(writes, 1);
  resolve();
  await first;
  await submit();
  assert.equal(writes, 2);
});

test('the submission lock also releases after a rejected operation', () => {
  const lock = createActionLock();
  assert.equal(lock.acquire(), true);
  try { throw new Error('rejected'); } catch { /* report, do not retry */ } finally { lock.release(); }
  assert.equal(lock.acquire(), true);
});

test('admin access distinguishes denial from temporary server failure and preserves the token contract', async t => {
  let reply = { status: 200, body: { isAdmin: true } };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, ...options });
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  });
  assert.equal(await verifyAdminAccess('https://admin-test.invalid/functions/v1/check-user', 'test-token'), true);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers.Authorization, 'Bearer test-token');
  for (const status of [401, 403]) {
    reply = { status, body: { error: 'denied' } };
    assert.equal(await verifyAdminAccess('https://admin-test.invalid', 'test-token'), false);
  }
  reply = { status: 503, body: {} };
  await assert.rejects(verifyAdminAccess('https://admin-test.invalid', 'test-token'));
  reply = { status: 200, body: { isAdmin: false } };
  assert.equal(await verifyAdminAccess('https://admin-test.invalid', 'test-token'), false);
});

test('malformed, truthy string, or missing admin claims never grant access', async t => {
  let body;
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body), { status: 200 }));
  for (body of [{ isAdmin: 'true' }, { isAdmin: 1 }, {}, null]) await assert.rejects(verifyAdminAccess('https://admin-test.invalid', 'test-token'));
});

test('uncertain network outcomes tell the administrator to refresh before retrying', () => {
  assert.match(adminErrorMessage(new TypeError('Failed to fetch')), /Резултатът е неизвестен/);
  assert.doesNotMatch(adminErrorMessage({ message: 'SQL statement with private details' }), /private details/);
});
