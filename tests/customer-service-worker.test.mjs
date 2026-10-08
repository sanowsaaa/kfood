import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../public/service-worker.js', import.meta.url), 'utf8');
function worker() {
  const listeners = {}, writes = [], deleted = []; let fetches = 0;
  const cache = { match: async () => undefined, put: async request => writes.push(request.url), keys: async () => [], delete: async () => true };
  const context = { URL, self: { location: { origin: 'https://shop.invalid' }, addEventListener: (name, fn) => { listeners[name] = fn; }, skipWaiting: () => {}, clients: { claim: async () => {} } },
    caches: { keys: async () => ['k-food-api-v1','k-food-cache-v1','k-food-static-v1','another-app-cache','k-food-static-v2'], delete: async name => deleted.push(name), open: async () => cache },
    fetch: async () => { fetches++; return new Response('fixture', { headers: { 'Content-Type': 'text/javascript' } }); } };
  vm.runInNewContext(source, context);
  function fetch(url, extra = {}) { let response; listeners.fetch({ request: { url, method: 'GET', headers: new Headers(), mode: 'cors', destination: '', ...extra }, respondWith: result => { response = result; } }); return response; }
  return { listeners, fetch, writes, deleted, fetches: () => fetches };
}
test('API, authorization, checkout and tracking navigation are never intercepted/cached', () => {
  const w = worker();
  for (const url of ['https://x.supabase.co/rest/v1/orders','https://x.supabase.co/auth/v1/user','https://x.supabase.co/functions/v1/checkout-status','https://shop.invalid/api/orders']) assert.equal(w.fetch(url), undefined);
  for (const path of ['/checkout','/track-order?email=fixture','/order-success','/admin']) assert.equal(w.fetch('https://shop.invalid'+path,{ mode: 'navigate', destination: 'document' }), undefined);
  assert.equal(w.fetch('https://shop.invalid/assets/main-fixture.js', { headers: new Headers({ Authorization: 'Bearer fixture' }) }), undefined);
  assert.equal(w.fetch('https://shop.invalid/assets/main-fixture.js', { method: 'POST' }), undefined);
  assert.equal(w.fetches(), 0);
});
test('activation retires this app’s old private caches without deleting unrelated caches', async () => {
  const w = worker(); let done; w.listeners.activate({ waitUntil: promise => { done = promise; } }); await done;
  assert.deepEqual(w.deleted, ['k-food-api-v1','k-food-cache-v1','k-food-static-v1']);
});
test('only versioned public assets use optional caching; arbitrary scripts and private images stay network-only', async () => {
  const w = worker(); await w.fetch('https://shop.invalid/assets/js/main-fixture.js',{destination:'script'});
  assert.equal(w.fetches(), 1); assert.equal(w.writes.length, 1);
  assert.equal(w.fetch('https://shop.invalid/settings.js', {destination:'script'}), undefined);
  assert.equal(w.fetch('https://x.supabase.co/storage/v1/object/private/orders/1.png', {destination:'image'}), undefined);
});
