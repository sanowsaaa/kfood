import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCart, subtotalMinor, discountedMinor, validateCartForCheckout, checkoutRedirect, emailValid, phoneValid } from '../src/utils/customer.ts';
import { getCheckoutAttempt, clearCheckoutAttempt, ATTEMPT_KEY, cartSignature } from '../src/utils/checkoutAttempt.ts';

const item = (extra = {}) => ({ id: 1, name: 'Рамен', price: 4.9, image: '', quantity: 3, ...extra });
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }; };
test('invalid/corrupt browser drafts cannot become a basket', () => {
  for (const input of [null, {}, '[]', [null], [item({ price: '4.90' })], [item({ quantity: NaN })], [item({ id: 0 })], [item({ quantity: 1.5 })], [item({ price: Infinity })]]) assert.deepEqual(normalizeCart(input), []);
});
test('duplicate saved rows merge and retain existing slug/category within the server limits', () => {
  const result = normalizeCart([item({ quantity: 80, slug: 'ramen', category: 'Нудъли' }), item({ quantity: 30, slug: 'ramen', category: 'Нудъли' })]);
  assert.equal(result.length, 1); assert.equal(result[0].quantity, 100); assert.equal(result[0].slug, 'ramen');
  assert.equal(normalizeCart(Array.from({ length: 60 }, (_, n) => item({ id: n + 1 }))).length, 50);
});
test('totals and existing volume discounts use cents, including half-cent rounding', () => {
  assert.equal(subtotalMinor([item({ price: 0.1, quantity: 100 })]), 1000);
  assert.equal(discountedMinor(4999, 0), 4999);
  assert.equal(discountedMinor(5000, 5), 4750);
  assert.equal(discountedMinor(10000, 10), 9000);
  assert.equal(discountedMinor(5010, 5), 4760);
});
test('checkout rejects removed products, insufficient stock and invalid quantities', () => {
  assert.doesNotThrow(() => validateCartForCheckout([item({ stock: 3, in_stock: true })]));
  for (const items of [[], [item({ stock: 2 })], [item({ in_stock: false })], [item({ quantity: 101 })], [item({ quantity: 0 })], [item({ quantity: 2.5 })]]) assert.throws(() => validateCartForCheckout(items));
});
test('payment redirects accept only the existing HTTPS Stripe Checkout host', () => {
  assert.equal(checkoutRedirect({ url: 'https://checkout.stripe.com/c/pay/cs_test_fixture', orderNumber: 'ORD-TEST' }).orderNumber, 'ORD-TEST');
  for (const url of ['http://checkout.stripe.com/pay', 'https://checkout.stripe.com.evil.invalid/pay', 'https://checkout.stripe.com@evil.invalid/pay', 'https://user@checkout.stripe.com/pay', 'https://checkout.stripe.com:8443/pay', 'javascript:alert(1)', '/pay']) assert.throws(() => checkoutRedirect({ url, orderNumber: 'ORD-TEST' }));
  assert.throws(() => checkoutRedirect({ url: 'https://checkout.stripe.com/pay', orderNumber: {} }));
});
test('contact validation retains the existing guest Bulgarian phone contract', () => {
  assert(emailValid(' buyer@example.invalid ')); assert(!emailValid('buyer@'));
  assert(phoneValid('0899 123 456')); assert(phoneValid('+359 899 123 456')); assert(!phoneValid('1234'));
});
test('a failed checkout retry reuses the same attempt/proof until the basket or contact fingerprint changes', () => {
  const store = storage(); const first = getCheckoutAttempt('fingerprint-a', store, 1000);
  assert.deepEqual(getCheckoutAttempt('fingerprint-a', store, 2000), first);
  assert.notEqual(getCheckoutAttempt('fingerprint-b', store, 2000).id, first.id);
});
test('corrupt/future/expired attempt IDs are replaced and an old response cannot erase a new proof', () => {
  const store = storage(); const first = getCheckoutAttempt('a', store, 1000);
  store.setItem(ATTEMPT_KEY, JSON.stringify({ ...first, id: '-'.repeat(36) }));
  assert.notEqual(getCheckoutAttempt('a', store, 2000).id, first.id);
  const latest = getCheckoutAttempt('b', store, 3000);
  clearCheckoutAttempt(first.token, store); assert.equal(JSON.parse(store.getItem(ATTEMPT_KEY)).id, latest.id);
  assert.notEqual(getCheckoutAttempt('b', store, 3000 + 66 * 60000).id, latest.id);
});
test('storage failure stops checkout before it can lose its status proof', () => {
  const store = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => getCheckoutAttempt('x', store), /quota/);
});
test('cart signatures protect a newer basket against late payment confirmation', () => {
  assert.equal(cartSignature([item({ id: 2 }), item({ id: 1 })]), cartSignature([item({ id: 1 }), item({ id: 2 })]));
  assert.notEqual(cartSignature([item()]), cartSignature([item({ quantity: 4 })]));
});
