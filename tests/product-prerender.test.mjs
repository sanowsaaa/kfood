import test from 'node:test';
import assert from 'node:assert/strict';
import { productSnapshotReady, beginProductPrerender } from '../src/utils/productPrerender.ts';

const canonical = 'https://k-foodvelikotarnovo.com/product/test-ramen';
const ready = { pathname: '/product/test-ramen', state: 'ready', productId: '28',
  heading: 'Тестов рамен', title: 'Тестов рамен | K-FOOD', description: 'Описание на тестовия рамен.',
  canonical: [canonical], ogTitle: 'Тестов рамен | K-FOOD', ogUrl: canonical, robots: 'index, follow',
  products: [{ '@type': 'Product', name: 'Тестов рамен', offers: { url: canonical, price: '3.30' } }] };

test('a complete matching product is ready without rewriting its price or metadata', () => {
  const before = structuredClone(ready);
  assert.equal(productSnapshotReady(ready), true); assert.deepEqual(ready, before);
  assert.equal(productSnapshotReady({ ...ready, heading: ' Тестов рамен ' }), true);
});
test('a loading, failed or age-gated view cannot become a completed product snapshot', () => {
  for (const state of [undefined, 'loading', 'error', 'age']) assert.equal(productSnapshotReady({ ...ready, state }), false);
});
test('metadata and body must belong to the same product and canonical', () => {
  for (const change of [{ heading: 'Стар продукт' }, { ogTitle: 'Старо заглавие' }, { ogUrl: canonical + '-old' },
    { canonical: [canonical, canonical] }, { canonical: ['invalid'] }, { title: '' }, { description: '' },
    { products: [] }, { products: [...ready.products, ...ready.products] },
    { products: [{ ...ready.products[0], offers: { url: canonical + '-old' } }] }]) {
    assert.equal(productSnapshotReady({ ...ready, ...change }), false);
  }
});
test('a previous product cannot release the signal after navigation to another slug', () => {
  assert.equal(productSnapshotReady({ ...ready, pathname: '/product/another-product' }), false);
});
test('numeric aliases must match the rendered product ID and retain a product canonical', () => {
  assert.equal(productSnapshotReady({ ...ready, pathname: '/product/28' }), true);
  assert.equal(productSnapshotReady({ ...ready, pathname: '/product/29' }), false);
});
test('a confirmed missing product is ready only after noindex and stale Product removal', () => {
  const missing = { ...ready, state: 'missing', heading: 'Продуктът не е намерен', robots: 'noindex, follow', products: [] };
  assert.equal(productSnapshotReady(missing), true);
  assert.equal(productSnapshotReady({ ...missing, robots: 'index, follow' }), false);
  assert.equal(productSnapshotReady({ ...missing, products: ready.products }), false);
});
test('private, checkout, catalog and invalid nested routes stay outside the signal', () => {
  for (const pathname of ['/b2b/product/test-ramen', '/admin', '/cart', '/checkout', '/products', '/product/test-ramen/extra']) {
    assert.equal(productSnapshotReady({ ...ready, pathname }), false);
  }
});
test('leaving the product route restores an existing renderer flag and does not create one on private pages', () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { prerenderReady: 'external-owner' };
    beginProductPrerender('/product/test-ramen'); assert.equal(window.prerenderReady, false);
    beginProductPrerender('/product/another-product'); assert.equal(window.prerenderReady, false);
    beginProductPrerender('/cart'); assert.equal(window.prerenderReady, 'external-owner');
    globalThis.window = {};
    beginProductPrerender('/b2b/products'); assert.equal('prerenderReady' in window, false);
    beginProductPrerender('/product/test-ramen'); beginProductPrerender('/b2b/login');
    assert.equal('prerenderReady' in window, false); assert.equal('__kfoodProductPrerender' in window, false);
  } finally { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});
