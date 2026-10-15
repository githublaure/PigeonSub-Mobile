const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const cache = new Map();
function load(name) {
  const file = path.resolve(__dirname, '../src/lib', `${name}.ts`);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(
    name => name.startsWith('./') ? load(name) : require(name), module, module.exports);
  return module.exports;
}
const math = load('subscription-math');
const { categoryBreakdown } = load('category-breakdown');
const { statsScenario, availableStatsView, STATS_VIEWS } = load('stats-views');
const { costProjection } = load('stats-projection');
const { categoryName, emptyCatalog } = load('category-catalog');
const now = math.parseDay('2026-10-12');
const sub = (patch = {}) => ({
  id: 1, name: 'Achat', price: '120', frequency: 'lifetime',
  purchaseDate: '2026-09-12', nextRenewal: null, createdAt: '2026-10-12',
  isActive: true, isTrial: false, category: 'other', rating: null,
  usageFrequency: 'used', ...patch,
});
const amortize = (patch, day = '2026-10-12') => math.lifetimeAmortization(sub(patch), math.parseDay(day));
const breakdown = (items, options = {}, follow = {}) => categoryBreakdown(items, follow, { now, ...options });
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('amortization is price / 12 from the purchase day until the exclusive first anniversary', () => {
  assert.equal(amortize({ purchaseDate: '2026-10-13' }).status, 'future');
  assert.equal(amortize({ purchaseDate: '2026-10-13' }).monthly, 0);
  assert.equal(amortize({ purchaseDate: '2026-10-12' }).monthly, 10);
  assert.equal(amortize({ purchaseDate: '2025-10-13' }).monthly, 10);
  assert.equal(amortize({ purchaseDate: '2025-10-12' }).status, 'expired');
  assert.equal(amortize({ purchaseDate: '2025-10-12' }).monthly, 0);
  assert.equal(amortize({ purchaseDate: '2020-01-01' }).monthly, 0);
  assert.equal(amortize({ price: '99,99' }).monthly, 99.99 / 12);
  assert.equal(amortize({ purchaseDate: '2026-10-12T23:59:00Z' }).monthly, 10);
});

test('calendar anniversaries handle leap days, month ends and time of day without a 365-day shortcut', () => {
  const leap = { purchaseDate: '2024-02-29' };
  assert.equal(amortize(leap, '2025-02-27').monthly, 10);
  assert.equal(amortize(leap, '2025-02-28').monthly, 0);
  assert.equal(amortize(leap, '2025-02-27').endsOn, '2025-02-28');
  assert.equal(amortize({ purchaseDate: '2023-03-01' }, '2024-02-29').monthly, 10);
  assert.equal(amortize({ purchaseDate: '2025-10-31' }, '2026-10-30').monthly, 10);
  assert.equal(amortize({ purchaseDate: '2025-10-31' }, '2026-10-31').monthly, 0);
  assert.equal(math.lifetimeAmortization(sub({ purchaseDate: '2026-10-12' }), new Date(2026, 9, 12, 0, 1)).monthly, 10);
});

test('missing or impossible purchase dates never fall back to creation/renewal dates', () => {
  for (const purchaseDate of [null, undefined, '', 'bad', '2026-02-30', '2026-13-01', 0]) {
    const result = amortize({ purchaseDate, nextRenewal: '2026-10-12' });
    assert.equal(result.status, 'missing_date');
    assert.equal(result.monthly, 0);
    assert.equal(result.startsOn, null);
    assert.equal(result.endsOn, null);
  }
});

test('null, zero, invalid and numeric prices remain finite and non-negative', () => {
  for (const price of [null, undefined, '', '0', 0, 'invalid', NaN, Infinity, '-1', -2, {}, true]) {
    assert.equal(amortize({ price }).monthly, 0);
    assert.equal(math.monthlyCost(sub({ price, frequency: 'monthly' })), 0);
  }
  assert.equal(amortize({ price: 120 }).monthly, 10);
  assert.equal(amortize({ price: ' 120,00 ' }).monthly, 10);
  assert.equal(amortize({ isTrial: true }).monthly, 0);
  assert.equal(amortize({ frequency: 'yearly' }).monthly, 0);
});

test('the default breakdown excludes lifetime costs; the opt-in uses one basis for groups and details', () => {
  const items = [sub(), sub({ id: 2, category: 'music', price: '20', frequency: 'monthly' }),
    sub({ id: 3, category: 'music', price: '240' }), sub({ id: 4, purchaseDate: '2020-01-01' })];
  assert.equal(breakdown(items).monthly, 20);
  const result = breakdown(items, { includeLifetime: true });
  assert.equal(result.monthly, 50);
  assert.equal(result.recurringMonthly, 20);
  assert.equal(result.amortizedMonthly, 30);
  assert.deepEqual(result.groups.map(g => [g.key, g.monthly, g.percent]), [['music', 40, 80], ['other', 10, 20]]);
  close(result.groups.reduce((n, g) => n + g.share, 0), 1);
  for (const group of result.groups) {
    close(group.items.reduce((n, item) => n + item.monthly, 0), group.monthly);
    close(group.share, group.monthly / result.monthly);
  }
  const lifetime = result.groups[0].items.find(item => item.sub.id === 3);
  assert.equal(lifetime.amortization.paid, 240);
  assert.equal(lifetime.monthly, 20);
  assert.equal(breakdown(items).monthly, 20, 'switching off restores the recurring view');
});

test('empty, lifetime-only, invalid-date and zero-cost views avoid divisions by zero', () => {
  const items = [sub({ purchaseDate: null }), sub({ id: 2, price: null }),
    sub({ id: 3, purchaseDate: '2020-01-01' }), sub({ id: 4, price: '0' })];
  for (const result of [breakdown([]), breakdown([sub()]), breakdown(items, { includeLifetime: true })]) {
    assert.equal(result.monthly, 0);
    assert.deepEqual(result.groups, []);
  }
  assert.deepEqual(breakdown(items, { includeLifetime: true }).missingDates.map(s => s.id), [1]);
  assert.deepEqual(breakdown(items).missingDates, []);
  const single = breakdown([sub()], { includeLifetime: true });
  assert.equal(single.groups[0].percent, 100);
  assert.equal(single.groups[0].share, 1);
});

test('archived, effectively cancelled and unconfirmed trial records stay excluded', () => {
  const items = [sub({ isActive: false }), sub({ id: 2, cancelledEffectiveOn: '2026-10-12' }),
    sub({ id: 3 }), sub({ id: 4, isTrial: true }), sub({ id: 5, frequency: 'monthly', isTrial: true })];
  const result = breakdown(items, { includeLifetime: true }, { 3: { decision: 'cancel_confirmed', effectiveOn: '2026-10-12' } });
  assert.equal(result.monthly, 0);
  assert.deepEqual(result.missingDates, []);
});

test('every statistical view composes with the toggle and overlapping exclusions count once', () => {
  const items = [sub({ id: 1, rating: 1, usageFrequency: 'rarely_used' }),
    sub({ id: 2, frequency: 'monthly', price: '20', rating: 2 }),
    sub({ id: 3, price: '240' }), sub({ id: 4, frequency: 'yearly', price: '120' })];
  const follow = { 1: { decision: 'cancel_requested' } };
  const expected = { current: [30, 60], cancellations: [30, 50], underused: [30, 50], low_rated: [10, 30], optimized: [10, 30] };
  const before = JSON.stringify({ items, follow });
  for (const { id } of STATS_VIEWS) {
    const scenario = statsScenario(items, follow, id, now);
    assert.equal(breakdown(scenario.included, {}, follow).monthly, expected[id][0]);
    assert.equal(breakdown(scenario.included, { includeLifetime: true }, follow).monthly, expected[id][1]);
    assert.equal(scenario.avoidedMonthly, 30 - expected[id][0]);
  }
  const downgraded = statsScenario(items, follow, availableStatsView('optimized', false), now);
  assert.equal(breakdown(downgraded.included, { includeLifetime: true }, follow).monthly, 60);
  assert.equal(JSON.stringify({ items, follow }), before, 'simulation must not mutate records or decisions');
});

test('an independent recurring simulation combines without invoking it on lifetime or trial records', () => {
  const items = [sub(), sub({ id: 2, price: '20', frequency: 'monthly' }), sub({ id: 3, isTrial: true })];
  const seen = [];
  const recurringCost = s => { seen.push(s.id); return 15; };
  for (const includeLifetime of [false, true]) {
    const result = breakdown(items, { includeLifetime, recurringCost });
    assert.equal(result.monthly, includeLifetime ? 25 : 15);
    assert.equal(result.amortizedMonthly, includeLifetime ? 10 : 0);
    assert.equal(result.recurringMonthly, 15);
  }
  assert.deepEqual(seen, [2, 2]);
  assert.equal(breakdown(items, { includeLifetime: true }).monthly, 30);
  for (const value of [null, undefined, NaN, -1, Infinity])
    assert.equal(breakdown(items, { recurringCost: () => value }).monthly, 0);
});

test('moving, renaming or deleting categories recomputes groups and preserves total costs', () => {
  const items = [sub({ category: 'custom_tools' }), sub({ id: 2, price: '20', frequency: 'monthly', category: 'music' })];
  const initial = breakdown(items, { includeLifetime: true });
  const moved = breakdown(items.map(s => s.id === 1 ? { ...s, category: 'music' } : s), { includeLifetime: true });
  assert.equal(initial.monthly, moved.monthly);
  assert.equal(moved.groups.length, 1);
  assert.equal(moved.groups[0].percent, 100);
  const catalog = emptyCatalog();
  catalog.custom.push({ id: 'custom_tools', name: 'Outils renommés', icon: null });
  assert.equal(categoryName(initial.groups[1].key, catalog), 'Outils renommés');
  const deleted = breakdown(items.map(s => s.category === 'custom_tools' ? { ...s, category: 'other' } : s), { includeLifetime: true });
  assert.equal(deleted.monthly, initial.monthly);
  assert.equal(deleted.groups[1].key, 'other');
});

test('fractional monthly amounts and rounded percentages remain coherent', () => {
  const result = breakdown(['a', 'b', 'c'].map((category, id) => sub({ id, category, price: '9.99' })), { includeLifetime: true });
  close(result.monthly, 3 * 9.99 / 12);
  assert.deepEqual(result.groups.map(g => g.percent), [34, 33, 33]);
  assert.equal(result.groups.reduce((sum, g) => sum + g.percent, 0), 100);
});

test('lifetime records never affect recurring costs, savings, renewals or 3/6/12-month projections', () => {
  const items = [sub(), sub({ id: 2, price: '240' })];
  const follow = { 1: { decision: 'cancel_confirmed', effectiveOn: '2026-11-01' }, 2: { decision: 'cancel_requested' } };
  const summary = math.overview(items, follow, now);
  for (const key of ['monthly', 'annual', 'trialMonthly', 'confirmedAnnual', 'potentialAnnual']) assert.equal(summary[key], 0);
  for (const item of items) {
    assert.equal(math.monthlyCost(item), 0);
    assert.equal(math.currentMonthlyCost(item), 0);
    assert.equal(math.nextRenewal(item, now), null);
  }
  assert.deepEqual(math.upcomingRenewals(items, follow, now), []);
  for (const months of [3, 6, 12]) assert(costProjection(items, follow, months, now).every(point => point.amount === 0));
  assert.equal(breakdown(items, { includeLifetime: true }, follow).monthly, 30);
});
