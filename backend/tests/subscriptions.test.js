'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const { PGlite } = require('@electric-sql/pglite');
const { createEntitlementService, sendAccessError, ACTIVE_SQL } = { ...require('../services/entitlements'), ...require('../services/subscription-access') };
const accessPolicy = require('../services/subscription-access');
const secret = 'isolated-entitlements-tests-not-a-production-secret';
process.env.SESSION_SECRET = secret;
const auth = require('../middleware/auth');
let db, pool, server, base, schema, realPool;
let plusUsers = new Set(), sandboxUsers = new Set(), unavailable = false, lookups = [];
const env = { REVENUECAT_SECRET_API_KEY: 'sk_test_fixture' };
const service = createEntitlementService({ env, fetchImpl: async (url) => {
  const id = Number(url.split('_').pop()); lookups.push(id);
  if (unavailable) return { ok: false, status: 503 };
  const purchase_date = '2026-01-01T00:00:00Z';
  return { ok: true, json: async () => ({ subscriber: {
    entitlements: plusUsers.has(id) ? { plus: { product_identifier: 'plus', purchase_date, expires_date: '2099-01-01T00:00:00Z' } } : {},
    subscriptions: { plus: { purchase_date, is_sandbox: sandboxUsers.has(id) } },
  } }) };
} });
function loadRoute(name) {
  const module = { exports: {} };
  const filename = path.join(__dirname, '../routes/', name + '.js');
  vm.runInThisContext('(function(require,module,exports){' + fs.readFileSync(filename, 'utf8') + '\n})', { filename })(id => {
    const dependencies = { express, crypto: require('node:crypto'), '../services/category-access': require('../services/category-access'), '../db': pool, '../middleware/auth': auth,
      '../../shared/family-sharing': require('../../shared/family-sharing'),
      '../services/entitlements': { ...service, sendAccessError }, '../services/subscription-access': accessPolicy };
    if (!(id in dependencies)) throw new Error('Unexpected module: ' + id);
    return dependencies[id];
  }, module, module.exports);
  return module.exports;
}
async function request(method, route = '', body, user = 1, extra = {}) {
  const token = user == null ? null : jwt.sign({ id: user, email: 'test@example.invalid', isPlus: true }, secret);
  return fetch(base + route, { method, headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const item = (patch = {}) => ({ name: 'Test', price: '3.00', frequency: 'monthly', category: 'other', ...patch });
const create = (patch = {}, user = 1) => request('POST', '/subscriptions', item(patch), user);
const family = (patch = {}) => ({ shareable: true, totalSeats: 4, occupiedSeats: 2, receivedContribution: '1', estimatedContribution: '0.50', ...patch });
const ids = async (user = 1) => (await pool.query(`SELECT id FROM subscriptions WHERE user_id = $1 AND ${ACTIVE_SQL}`, [user])).rows;
const seed = async (count, user = 1) => { for (let i = 0; i < count; i++) assert.equal((await create({ name: 'Service ' + i }, user)).status, 201); };

test.before(async () => {
  if (process.env.TEST_DATABASE_URL) {
    // Each run owns only a fresh schema, never the public schema or real data.
    schema = 'pigeonsub_test_' + require('node:crypto').randomBytes(8).toString('hex');
    const { Pool } = require('pg');
    realPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await realPool.query(`CREATE SCHEMA ${schema}`);
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  } else {
    db = new PGlite();
    await db.waitReady;
    // PGlite is real PostgreSQL SQL execution in one WASM session. Serialize its
    // transactions; use TEST_DATABASE_URL for actual multi-connection row locks.
    let tail = Promise.resolve();
    const connect = async () => {
      let release;
      const previous = tail;
      tail = new Promise(resolve => { release = resolve; });
      await previous;
      return { query: (sql, args) => db.query(sql, args), release };
    };
    pool = { connect, query: async (sql, args) => { const c = await connect(); try { return await c.query(sql, args); } finally { c.release(); } } };
  }
  const serverSource = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const sql = serverSource.match(/await pool.query\(`([\s\S]*?)`\);/)[1];
  if (db) await db.exec(sql); else await pool.query(sql);
  const app = express(); app.use(express.json());
  app.use('/api/subscriptions', loadRoute('subscriptions'));
  app.use('/api/billing', loadRoute('billing'));
  app.use('/api/categories', loadRoute('categories'));
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = 'http://127.0.0.1:' + server.address().port + '/api';
});
test.beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE');
  await pool.query("INSERT INTO users (id, name, email, password_hash) VALUES (1, 'One', 'one@example.invalid', 'unused'), (2, 'Two', 'two@example.invalid', 'unused')");
  plusUsers = new Set(); sandboxUsers = new Set(); unavailable = false; lookups = [];
  delete env.REVENUECAT_SANDBOX_USER_IDS;
});
test.after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) await db.close();
  if (realPool) { await pool.end(); await realPool.query(`DROP SCHEMA ${schema} CASCADE`); await realPool.end(); }
});

test('category delete preserves subscriptions, archives, proofs and other users; stale forms cannot recreate references', async () => {
  const category = await (await request('POST', '/categories', { name: 'Personnel', icon: 'leaf-outline' })).json();
  const original = await (await create({ category: category.id, note: 'Keep me', purchaseProofImage: 'proof', price: '18', isActive: false })).json();
  const other = await (await create({ category: 'music' }, 2)).json();
  assert.equal((await request('PATCH', '/categories/' + category.id, { name: 'Loisirs', icon: 'heart-outline' })).status, 200);
  assert.equal((await request('DELETE', '/categories/' + category.id)).status, 200);
  const saved = await (await request('GET', '/subscriptions/' + original.id)).json();
  assert.deepEqual(saved, { ...original, category: 'other' });
  assert.equal((await (await request('GET', '/subscriptions/' + other.id, undefined, 2)).json()).category, 'music');
  assert.equal((await request('PUT', '/subscriptions/' + original.id, { category: category.id })).status, 409);
  assert.equal((await create({ category: 'custom_unknown' })).status, 409);
  assert.equal((await request('DELETE', '/categories/other')).status, 400);
  assert.equal((await request('PATCH', '/categories/other', { name: 'Autre', icon: 'invented-outline' })).status, 400);
});
test('category delete and racing subscription writes share the account lock', async () => {
  const category = await (await request('POST', '/categories', { name: 'Concurrent' })).json();
  const responses = await Promise.all([
    create({ category: category.id }), request('DELETE', '/categories/' + category.id),
    ...Array.from({ length: 3 }, () => create({ category: category.id })),
  ]);
  assert(responses.every(r => [200, 201, 409].includes(r.status)));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM subscriptions WHERE category = $1', [category.id])).rows[0].n, 0);
});
test('failed category deletion rolls back reassignment and catalog together', async () => {
  const original = await (await create({ category: 'music', isActive: false })).json();
  await request('GET', '/categories');
  await pool.query("ALTER TABLE user_settings ADD CONSTRAINT category_failure CHECK (NOT (category_catalog->'hidden' @> '[\"music\"]'::jsonb))");
  try {
    assert.equal((await request('DELETE', '/categories/music')).status, 500);
    assert.equal((await (await request('GET', '/subscriptions/' + original.id)).json()).category, 'music');
    assert(!(await (await request('GET', '/categories')).json()).hidden.includes('music'));
  } finally { await pool.query('ALTER TABLE user_settings DROP CONSTRAINT category_failure'); }
});
test('Family writes require verified Plus and ownership; generic writes/import cannot bypass protection', async () => {
  const original = await (await create()).json();
  const route = '/subscriptions/' + original.id + '/family';
  assert.equal((await request('PUT', route, family())).status, 403);
  plusUsers.add(2);
  assert.equal((await request('PUT', route, family(), 2)).status, 404);
  assert.equal((await request('DELETE', route, undefined, 2)).status, 404);
  assert.equal((await request('PUT', route, family(), null)).status, 401);
  assert.equal((await request('PUT', '/subscriptions/' + original.id, { familySharing: family() })).status, 400);
  assert.equal((await create({ familySharing: family() })).status, 400);
  assert.equal((await request('POST', '/subscriptions/import', { items: [item({ familySharing: family() }), item()] })).status, 400);
  unavailable = true;
  assert.equal((await request('PUT', route, family())).status, 503);
  assert.equal((await (await request('GET', '/subscriptions/' + original.id)).json()).familySharing, null);
});
test('Family data survives Plus loss; free edits and removal preserve the original expense', async () => {
  const original = await (await create({ note: 'Receipt kept', purchaseProofImage: 'proof' })).json();
  const route = '/subscriptions/' + original.id + '/family';
  plusUsers.add(1);
  assert.equal((await request('PUT', route, family())).status, 200);
  plusUsers.clear();
  assert.equal((await request('PUT', route, family({ receivedContribution: '2' }))).status, 403);
  const saved = await (await request('GET', '/subscriptions/' + original.id)).json();
  assert.deepEqual(saved, { ...original, familySharing: { ...family({ receivedContribution: '1.00' }), frequency: 'monthly' } });
  assert.equal((await request('PUT', '/subscriptions/' + original.id, { name: 'New name' })).status, 200);
  const cleared = await (await request('DELETE', route)).json();
  assert.deepEqual(cleared, { ...original, name: 'New name' });
});
test('Family validates unknown/zero places, occupied bounds, money and billing frequency without changing price', async () => {
  const original = await (await create({ price: '120', frequency: 'lifetime' })).json();
  plusUsers.add(1);
  const route = '/subscriptions/' + original.id + '/family';
  for (const patch of [{ totalSeats: -1 }, { totalSeats: 0 }, { occupiedSeats: 5 }, { occupiedSeats: 1.5 }, { shareable: 'true' }, { receivedContribution: '-1' }, { receivedContribution: '121' }, { estimatedContribution: '1e2' }, { receivedContribution: '1.234' }])
    assert.equal((await request('PUT', route, family(patch))).status, 400, JSON.stringify(patch));
  const saved = await (await request('PUT', route, family({ totalSeats: null, occupiedSeats: 0, receivedContribution: '0', estimatedContribution: null }))).json();
  assert.equal(saved.familySharing.frequency, 'lifetime');
  assert.equal(saved.familySharing.receivedContribution, '0.00');
  assert.equal(saved.price, '120.00');
  assert.equal(saved.nextRenewal, original.nextRenewal);
});
test('additive startup migrations are repeatable and preserve existing categories, expenses and Family metadata', async () => {
  const original = await (await create({ category: 'music', note: 'Legacy data', isActive: false })).json();
  plusUsers.add(1);
  await request('PUT', '/subscriptions/' + original.id + '/family', family());
  const before = (await pool.query('SELECT * FROM subscriptions WHERE id = $1', [original.id])).rows[0];
  const sql = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8').match(/await pool.query\(`([\s\S]*?)`\);/)[1];
  if (db) await db.exec(sql); else await pool.query(sql);
  assert.deepEqual((await pool.query('SELECT * FROM subscriptions WHERE id = $1', [original.id])).rows[0], before);
});
test('upgrade from the pre-Family schema adds only nullable metadata and preserves existing records', async () => {
  // This database/schema is disposable and created by the test harness only.
  await pool.query('ALTER TABLE subscriptions DROP COLUMN family_sharing');
  const sql = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8').match(/await pool.query\(`([\s\S]*?)`\);/)[1];
  try {
    await pool.query("INSERT INTO subscriptions (user_id, name, price, frequency, category, note, is_active) VALUES (1, 'Old record', 18, 'yearly', 'music', 'Keep', false)");
    const before = (await pool.query('SELECT * FROM subscriptions')).rows[0];
    if (db) await db.exec(sql); else await pool.query(sql);
    assert.deepEqual((await pool.query('SELECT * FROM subscriptions')).rows[0], { ...before, family_sharing: null });
  } finally { if (db) await db.exec(sql); else await pool.query(sql); }
});

test('unauthenticated/forged-token calls never write, even with a claimed demo or Plus identity', async () => {
  assert.equal((await create({}, null)).status, 401);
  const fake = jwt.sign({ id: 1, isPlus: true }, 'wrong-secret');
  assert.equal((await request('POST', '/subscriptions', item({ isPlus: true, mode: 'demo' }), null, { Authorization: 'Bearer ' + fake })).status, 401);
  assert.equal((await ids()).length, 0);
});
test('5 free active records include trials/zero-price/lifetime; sixth direct request ignores all client claims', async () => {
  await seed(3);
  assert.equal((await create({ isTrial: true, price: 0, trialEndsAt: '2000-01-01' })).status, 201);
  assert.equal((await create({ frequency: 'lifetime' })).status, 201);
  assert.deepEqual(lookups, []);
  for (const extra of [{ isPlus: true }, { userId: 2, appUserID: 'pigeonsub_user_2', entitlements: { plus: true } }, { mode: 'demo', isGuest: true }])
    assert.equal((await create(extra)).status, 403);
  assert.equal((await ids()).length, 5);
  assert(lookups.every(id => id === 1));
});
test('boolean coercion and malformed dates cannot bypass active counting', async () => {
  for (const value of [null, 'false', 'true', 0, 1, {}, []]) assert.equal((await create({ isActive: value })).status, 400);
  assert.equal((await create({ cancelledEffectiveOn: '2026-02-30' })).status, 400);
  assert.equal((await ids()).length, 0);
});
test('archiving releases a slot, reactivation is guarded, and ownership cannot be reassigned', async () => {
  await seed(5);
  const first = (await ids())[0].id;
  const archived = await (await create({ isActive: false })).json();
  assert.equal((await request('PUT', '/subscriptions/' + archived.id, { isActive: true })).status, 403);
  assert.equal((await request('PUT', '/subscriptions/' + first, { isActive: false })).status, 200);
  assert.equal((await request('PUT', '/subscriptions/' + archived.id, { isActive: true, userId: 2 })).status, 200);
  assert.equal((await ids()).length, 5);
  assert.equal((await ids(2)).length, 0);
  assert.equal((await request('PUT', '/subscriptions/' + archived.id, { isActive: true }, 2)).status, 404);
  assert.equal((await request('DELETE', '/subscriptions/' + archived.id, undefined, 2)).status, 404);
});
test('effective cancellations free a slot only when due; undo is guarded as reactivation', async () => {
  await seed(5); const id = (await ids())[0].id;
  assert.equal((await request('PUT', '/subscriptions/' + id, { cancelledEffectiveOn: '2099-01-01' })).status, 200);
  assert.equal((await create()).status, 403);
  assert.equal((await request('PUT', '/subscriptions/' + id, { cancelledEffectiveOn: '2000-01-01' })).status, 200);
  assert.equal((await create()).status, 201);
  assert.equal((await request('PUT', '/subscriptions/' + id, { cancelledEffectiveOn: null })).status, 403);
  assert.equal((await request('PUT', '/subscriptions/' + id, { cancelledEffectiveOn: '2099-01-01' })).status, 403);
});
test('parallel creates and mixed reactivations cannot cross the free quota', async () => {
  await seed(4);
  const archived = await (await create({ isActive: false })).json();
  const responses = await Promise.all([
    request('PUT', '/subscriptions/' + archived.id, { isActive: true }),
    ...Array.from({ length: 10 }, () => create()),
  ]);
  assert.equal(responses.filter(r => r.ok).length, 1);
  assert(responses.filter(r => !r.ok).every(r => r.status === 403));
  assert.equal((await ids()).length, 5);
});
test('verified Plus can exceed 5; expiry/downgrade preserves reads, edits, archive/delete and blocks new growth', async () => {
  plusUsers.add(1); await seed(7);
  plusUsers.delete(1);
  assert.equal((await request('GET', '/subscriptions?includeArchived=true')).status, 200);
  const all = await ids();
  assert.equal((await request('PUT', '/subscriptions/' + all[6].id, { note: 'kept' })).status, 200);
  assert.equal((await create()).status, 403);
  assert.equal((await request('DELETE', '/subscriptions/' + all[6].id)).status, 204);
  assert.equal((await ids()).length, 6);
});
test('safety customization uses stable free slots; disabling remains free after downgrade', async () => {
  plusUsers.add(1); await seed(6); plusUsers.clear();
  const all = await ids();
  assert.equal((await request('PUT', '/subscriptions/' + all[0].id, { safetyDate: '2026-11-01', useSafetyDate: true })).status, 200);
  assert.equal((await request('PUT', '/subscriptions/' + all[5].id, { safetyDate: '2026-11-01', useSafetyDate: true })).status, 403);
  assert.equal((await request('PUT', '/subscriptions/' + all[5].id, { safetyDate: null, useSafetyDate: false })).status, 200);
});
test('billing outage/missing key fail closed for protected writes but do not freeze free operations', async () => {
  unavailable = true;
  await seed(5);
  const first = (await ids())[0].id;
  assert.equal((await create()).status, 503);
  assert.equal((await request('PUT', '/subscriptions/' + first, { name: 'Renamed' })).status, 200);
  assert.equal((await request('GET', '/subscriptions')).status, 200);
  assert.equal((await request('DELETE', '/subscriptions/' + first)).status, 204);
  assert.equal((await create()).status, 201);
  assert.equal((await request('GET', '/billing/entitlements')).status, 503);
});
test('batch requires server Plus even below 5 and cannot impersonate another paid account', async () => {
  plusUsers.add(2);
  const res = await request('POST', '/subscriptions/import', { items: [item(), item({ name: 'Second' })], isPlus: true, userId: 2 });
  assert.equal(res.status, 403); assert.equal((await ids()).length, 0);
  assert.equal((await request('POST', '/subscriptions/import', { items: [item(), item({ name: 'Second' })] }, 2)).status, 201);
  assert.equal((await ids(2)).length, 2);
});
test('batch validates all before writing, retries without duplication, and rolls back on SQL failure', async () => {
  plusUsers.add(1);
  assert.equal((await request('POST', '/subscriptions/import', { items: [item(), item({ isActive: 'false' })] })).status, 400);
  assert.equal((await ids()).length, 0);
  const batch = { items: [item(), item({ name: 'Second' })] };
  assert.equal((await request('POST', '/subscriptions/import', batch)).status, 201);
  assert.equal((await request('POST', '/subscriptions/import', batch)).status, 201);
  assert.equal((await ids()).length, 2);
  // A database constraint, not mocked application control flow, forces rollback.
  const failed = await request('POST', '/subscriptions/import', { items: [item({ name: 'Rollback' }), item({ name: 'Too long', categoryColor: 'x'.repeat(51) })] });
  assert.equal(failed.status, 500);
  assert.equal((await ids()).length, 2);
  assert.equal((await create({ name: 'After rollback' })).status, 201);
});
test('authenticated entitlement endpoint is scoped and sandbox access is explicitly allowlisted', async () => {
  plusUsers.add(1); sandboxUsers.add(1);
  assert.equal((await request('GET', '/billing/entitlements', undefined, null)).status, 401);
  assert.equal((await (await request('GET', '/billing/entitlements?userId=1', undefined, 2)).json()).isPlus, false);
  assert.equal((await (await request('GET', '/billing/entitlements')).json()).isPlus, false);
  env.REVENUECAT_SANDBOX_USER_IDS = '1';
  const res = await request('GET', '/billing/entitlements');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal((await res.json()).isPlus, true);
});

test('trial payment carryover preserves only the recorded safety offset, not arbitrary Premium settings', async () => {
  plusUsers.add(1); await seed(5);
  const trial = await (await create({ isTrial: true, trialEndsAt: '2026-01-01', nextRenewal: '2026-01-02', safetyDate: '2025-12-30', useSafetyDate: true })).json();
  plusUsers.clear();
  assert.equal((await request('PUT', '/subscriptions/' + trial.id, { isTrial: false, nextRenewal: '2026-02-01', safetyDate: '2026-01-30' })).status, 403);
  assert.equal((await request('PUT', '/subscriptions/' + trial.id, { isTrial: false, nextRenewal: '2026-01-02', safetyDate: '2026-01-01' })).status, 403);
  assert.equal((await request('PUT', '/subscriptions/' + trial.id, { isTrial: false, nextRenewal: '2026-01-02', safetyDate: '2025-12-31' })).status, 200);
});
