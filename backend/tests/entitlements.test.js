'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCustomer, createEntitlementService, revenueCatUserId } = require('../services/entitlements');
const now = Date.parse('2026-10-09T12:00:00Z');
const purchased = '2026-10-01T12:00:00Z';
function customer(expiry = '2026-11-01T12:00:00Z', extra = {}, transaction = {}) {
  return { subscriber: { entitlements: { plus: { product_identifier: 'monthly', purchase_date: purchased, expires_date: expiry, ...extra } },
    subscriptions: { monthly: { purchase_date: purchased, is_sandbox: false, ...transaction } } } };
}
const evaluate = (data, options = {}) => evaluateCustomer(data, { now, ...options });

test('only the exact active plus entitlement grants access; trial/cancelled-renewal stays active until expiry', () => {
  assert.equal(evaluate(customer()).isPlus, true);
  assert.equal(evaluate(customer('2026-10-09T12:00:00Z')).isPlus, false);
  assert.equal(evaluate(customer('2026-10-08T12:00:00Z')).isPlus, false);
  assert.equal(evaluate(customer(undefined, {}, { period_type: 'trial', unsubscribe_detected_at: purchased })).isPlus, true);
  const other = customer(); other.subscriber.entitlements = { premium: other.subscriber.entitlements.plus };
  assert.equal(evaluate(other).isPlus, false);
  assert.equal(evaluate({ subscriber: { entitlements: {} } }).isPlus, false);
});
test('grace periods and lifetime are handled without equating missing expiry with lifetime', () => {
  assert.equal(evaluate(customer('2026-10-08T12:00:00Z', { grace_period_expires_date: '2026-10-10T12:00:00Z' })).isPlus, true);
  const lifetime = customer(null);
  lifetime.subscriber.non_subscriptions = { monthly: [lifetime.subscriber.subscriptions.monthly] };
  delete lifetime.subscriber.subscriptions;
  assert.deepEqual(evaluate(lifetime), { isPlus: true, expiresAt: null });
  delete lifetime.subscriber.entitlements.plus.expires_date;
  assert.throws(() => evaluate(lifetime), e => e.status === 503);
});
test('refund, sandbox, malformed response and mismatched transaction cannot grant production Plus', () => {
  assert.equal(evaluate(customer(undefined, {}, { refunded_at: purchased })).isPlus, false);
  const sandbox = customer(undefined, {}, { is_sandbox: true });
  assert.equal(evaluate(sandbox).isPlus, false);
  assert.equal(evaluate(sandbox, { allowSandbox: true }).isPlus, true);
  for (const bad of [null, {}, { subscriber: {} }, customer('invalid'), customer(undefined, {}, { purchase_date: '2000-01-01' })])
    assert.throws(() => evaluate(bad), e => e.code === 'BILLING_UNAVAILABLE');
});
test('identity is derived from the authenticated integer account; requests are read-only, secret and bounded', async () => {
  const requests = [];
  const service = createEntitlementService({ env: { REVENUECAT_SECRET_API_KEY: 'sk_test_only' }, now: () => now,
    fetchImpl: async (url, init) => { requests.push({ url, init }); return { ok: true, json: async () => customer() }; } });
  await service.requirePlus(12);
  assert.equal(requests[0].url, 'https://api.revenuecat.com/v1/subscribers/pigeonsub_user_12');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.headers.Authorization, 'Bearer sk_test_only');
  assert(requests[0].init.signal instanceof AbortSignal);
  for (const value of [0, -1, '12', NaN, Infinity, 'pigeonsub_user_13']) assert.throws(() => revenueCatUserId(value));
});
test('sandbox opt-in is a server account allowlist, not a client-wide bypass', async () => {
  const service = createEntitlementService({ env: { REVENUECAT_SECRET_API_KEY: 'sk_test_only', REVENUECAT_SANDBOX_USER_IDS: '12, 14' }, now: () => now,
    fetchImpl: async () => ({ ok: true, json: async () => customer(undefined, {}, { is_sandbox: true }) }) });
  assert.equal((await service.getAccess(12)).isPlus, true);
  assert.equal((await service.getAccess(13)).isPlus, false);
});
test('configuration, HTTP errors, timeouts and invalid JSON fail closed, with no stale grant after expiry', async () => {
  for (const env of [{}, { REVENUECAT_SECRET_API_KEY: 'appl_public' }]) {
    await assert.rejects(createEntitlementService({ env, fetchImpl: () => assert.fail('must not fetch') }).getAccess(1), e => e.status === 503);
  }
  for (const fetchImpl of [async () => ({ ok: false, status: 429 }), async () => { throw new Error('timeout'); }, async () => ({ ok: true, json: async () => { throw new Error('bad json'); } })])
    await assert.rejects(createEntitlementService({ env: { REVENUECAT_SECRET_API_KEY: 'sk_test' }, fetchImpl }).getAccess(1), e => e.status === 503);
  let clock = now;
  const service = createEntitlementService({ env: { REVENUECAT_SECRET_API_KEY: 'sk_test' }, now: () => clock,
    fetchImpl: async () => ({ ok: true, json: async () => customer('2026-10-09T12:00:01Z') }) });
  assert.equal((await service.getAccess(1)).isPlus, true);
  clock += 1001;
  await assert.rejects(service.requirePlus(1), e => e.status === 403);
});
