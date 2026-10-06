const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Load pure TypeScript and the storage adapter with a deterministic in-memory
// AsyncStorage boundary. No native runtime, network, or Apple credentials.
function harness() {
  const memory = new Map();
  const cache = new Map();
  const storage = {
    getItem: async (key) => memory.get(key) ?? null,
    setItem: async (key, value) => {
      memory.set(key, value);
    },
    removeItem: async (key) => {
      memory.delete(key);
    },
  };
  function load(name) {
    const filename = path.resolve(
      __dirname,
      '../src/lib',
      name.endsWith('.ts') ? name : `${name}.ts`,
    );
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    const requireLocal = (name) =>
      name === '@react-native-async-storage/async-storage'
        ? storage
        : name.startsWith('./')
          ? load(name)
          : require(name);
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, {
      filename,
    })(requireLocal, module, module.exports);
    return module.exports;
  }
  return { memory, storage, load };
}
const { load } = harness();
const math = load('subscription-math');
const { reminderPlan } = load('reminder-plan');
const { hasSevenDayTrial } = load('billing-policy');
const date = (value) => math.parseDay(value);
const sub = (patch = {}) => ({
  id: 1,
  name: 'Test',
  price: '12',
  frequency: 'monthly',
  isActive: true,
  nextRenewal: '2026-10-20',
  isTrial: false,
  category: 'other',
  usageFrequency: 'used',
  ...patch,
});

test('annual, weekly and lifetime prices do not inflate recurring costs', () => {
  assert.equal(
    math.monthlyCost(sub({ price: '120', frequency: 'yearly' })),
    10,
  );
  assert.equal(math.monthlyCost(sub({ price: '3', frequency: 'weekly' })), 13);
  assert.equal(
    math.monthlyCost(sub({ price: '34.99', frequency: 'lifetime' })),
    0,
  );
  assert.equal(math.monthlyCost(sub({ price: '2,99' })), 2.99);
  assert.equal(math.monthlyCost(sub({ price: 'invalid' })), 0);
});
test('renewals retain the original day after February and across leap years', () => {
  const jan = sub({ nextRenewal: '2026-01-31' });
  assert.equal(
    math.dayKey(math.nextRenewal(jan, date('2026-02-01'))),
    '2026-02-28',
  );
  assert.equal(
    math.dayKey(math.nextRenewal(jan, date('2026-03-01'))),
    '2026-03-31',
  );
  assert.equal(
    math.dayKey(
      math.nextRenewal(
        sub({ nextRenewal: '2024-02-29', frequency: 'yearly' }),
        date('2027-03-01'),
      ),
    ),
    '2028-02-29',
  );
});
test('calendar date validation rejects impossible dates without UTC rollover', () => {
  assert.equal(math.parseDay('2026-02-30'), null);
  assert.equal(math.parseDay('2026-13-01'), null);
  assert.equal(math.dayKey(date('2026-10-06')), '2026-10-06');
  assert.equal(math.nextRenewal(sub({ frequency: 'lifetime' })), null);
});
test('safety date includes notice and selected lead, including an expired notice', () => {
  const dates = math.deadlines(
    sub(),
    { noticeDays: 30, leadDays: 3 },
    date('2026-10-06'),
  );
  assert.equal(math.dayKey(dates.actionBy), '2026-09-20');
  assert.equal(math.dayKey(dates.safety), '2026-09-17');
  assert.equal(
    math.dayKey(
      math.deadlines(
        sub({ useSafetyDate: true, safetyDate: '2026-10-12' }),
        {},
        date('2026-10-06'),
      ).safety,
    ),
    '2026-10-12',
  );
});
test('requesting cancellation does not reduce costs; future confirmed end is respected', () => {
  const subs = [sub()];
  const now = date('2026-10-06');
  const pending = math.overview(
    subs,
    { 1: { decision: 'cancel_requested' } },
    now,
  );
  assert.equal(pending.monthly, 12);
  assert.equal(pending.potentialAnnual, 144);
  assert.equal(pending.confirmedAnnual, 0);
  const follow = {
    1: { decision: 'cancel_confirmed', effectiveOn: '2026-10-10' },
  };
  assert.equal(math.overview(subs, follow, now).monthly, 12);
  assert.equal(math.overview(subs, follow, date('2026-10-10')).monthly, 0);
  assert.equal(math.overview(subs, follow, now).confirmedAnnual, 144);
  assert.equal(math.deadlines(sub(), follow[1], now).renewal, null);
});
test('free quota permits five, blocks sixth, preserves old records after Plus expires', () => {
  const four = Array.from({ length: 4 }, (_, i) => sub({ id: i + 1 }));
  assert.equal(math.canAddSubscription(four, false), true);
  const five = [...four, sub({ id: 5 })];
  assert.equal(math.canAddSubscription(five, false), false);
  assert.equal(math.canAddSubscription(five, true), true);
  assert.equal(
    math.canAddSubscription([...five, sub({ id: 6 })], false),
    false,
  );
  assert.equal(
    math.canAddSubscription(five, false, {
      1: { decision: 'cancel_confirmed', effectiveOn: '2020-01-01' },
    }),
    true,
  );
  assert.equal(five.length, 5);
});
test('reminders use one standard alert, honor premium lead, cancel effective renewals and cap iOS queue', () => {
  const now = date('2026-10-06');
  const follow = {
    1: {
      reminderEnabled: true,
      noticeDays: 2,
      leadDays: 5,
      advancedReminder: true,
    },
  };
  assert.equal(
    math.dayKey(reminderPlan([sub()], follow, false, now)[0].at),
    '2026-10-17',
  );
  assert.equal(
    math.dayKey(reminderPlan([sub()], follow, true, now)[0].at),
    '2026-10-13',
  );
  assert.equal(
    reminderPlan(
      [sub()],
      {
        1: {
          ...follow[1],
          decision: 'cancel_confirmed',
          effectiveOn: '2026-10-20',
        },
      },
      true,
      now,
    ).length,
    0,
  );
  const many = Array.from({ length: 20 }, (_, id) =>
    sub({ id, frequency: 'weekly' }),
  );
  const metadata = Object.fromEntries(
    many.map((s) => [s.id, { reminderEnabled: true }]),
  );
  assert.equal(reminderPlan(many, metadata, true, now).length, 60);
  assert(reminderPlan(many, metadata, true, now).every((p) => p.at > now));
});
test('trial shown only for a verified eligible free seven-day offer', () => {
  const item = {
    product: {
      identifier: 'annual',
      introPrice: {
        price: 0,
        cycles: 1,
        periodUnit: 'DAY',
        periodNumberOfUnits: 7,
      },
    },
  };
  assert.equal(hasSevenDayTrial(item, { annual: true }), true);
  assert.equal(hasSevenDayTrial(item, {}), false);
  assert.equal(hasSevenDayTrial(item, { annual: false }), false);
  assert.equal(
    hasSevenDayTrial(
      {
        product: {
          ...item.product,
          introPrice: { ...item.product.introPrice, price: 1 },
        },
      },
      { annual: true },
    ),
    false,
  );
  assert.equal(
    hasSevenDayTrial(
      {
        product: {
          ...item.product,
          introPrice: { ...item.product.introPrice, periodNumberOfUnits: 3 },
        },
      },
      { annual: true },
    ),
    false,
  );
  assert.equal(hasSevenDayTrial(undefined, {}), false);
});
test('guest and demo persist independently; entering demo never alters guest or contacts backend', async () => {
  const h = harness();
  const local = h.load('local-data');
  local.setDataSession('guest', 'guest');
  const item = await local.localRequest('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Mon abonnement',
      price: '9',
      frequency: 'monthly',
      category: 'music',
    }),
  });
  await local.updateFollowUp(item.id, { decision: 'keep' });
  await local.seedDemo();
  local.setDataSession('demo', 'demo');
  assert.equal(
    (await local.localRequest('/subscriptions?includeArchived=true')).length,
    6,
  );
  await local.localRequest('/subscriptions/1', { method: 'DELETE' });
  local.setDataSession('guest', 'guest');
  assert.equal(
    (await local.localRequest('/subscriptions'))[0].name,
    'Mon abonnement',
  );
  assert.equal((await local.getFollowUps())[1].decision, 'keep');
  local.setDataSession('account', 'account:123');
  await assert.rejects(local.localRequest('/subscriptions'), /Session locale/);
});
test('concurrent metadata changes are serialized, and account namespaces never leak', async () => {
  const local = harness().load('local-data');
  local.setDataSession('account', 'account:1');
  await Promise.all([
    local.updateFollowUp(1, { decision: 'keep' }),
    local.updateFollowUp(2, { decision: 'cancel_requested' }),
  ]);
  assert.equal(Object.keys(await local.getFollowUps()).length, 2);
  local.setDataSession('account', 'account:2');
  assert.deepEqual(await local.getFollowUps(), {});
  local.setDataSession('account', 'account:1');
  assert.equal((await local.getFollowUps())[2].decision, 'cancel_requested');
});
test('corrupt storage produces an error without overwriting user data', async () => {
  const h = harness();
  const local = h.load('local-data');
  local.setDataSession('guest', 'guest');
  h.memory.set('pigeonsub.v2.guest.data', 'corrupt-json');
  await assert.rejects(
    local.localRequest('/subscriptions', { method: 'POST', body: '{}' }),
    /conservées/,
  );
  assert.equal(h.memory.get('pigeonsub.v2.guest.data'), 'corrupt-json');
});
test('paid access is scoped to verified user identity; demo preview does not transfer Plus', () => {
  const h = harness();
  const local = h.load('local-data');
  const entitlement = h.load('entitlements-state');
  local.setDataSession('account', 'account:1');
  entitlement.setPlusAccess(true, 'account:1');
  assert.equal(entitlement.hasPlusAccess(), true);
  local.setDataSession('guest', 'guest');
  assert.equal(entitlement.hasPlusAccess(), false);
  local.setDataSession('demo', 'demo');
  assert.equal(entitlement.hasPlusAccess(), true);
  local.setDataSession('guest', 'guest');
  assert.equal(entitlement.hasPlusAccess(), false);
});

test('color picker preserves stored colors including gray, black, white and shorthand', () => {
  const { hexToHsv, hsvToHex } = load('color-picker');
  for (const hex of [
    '#7C3AED',
    '#00FF00',
    '#DB2777',
    '#000000',
    '#FFFFFF',
    '#808080',
    '#123ABC',
  ]) {
    assert.equal(hsvToHex(hexToHsv(hex)), hex);
  }
  assert.equal(hsvToHex(hexToHsv('#f0a')), '#FF00AA');
  assert.equal(hsvToHex(hexToHsv('invalid stored color')), '#7C3AED');
});

test('color picker handles hue wrap and clamps gestures outside the gradient', () => {
  const { hsvToHex, clamp } = load('color-picker');
  assert.equal(hsvToHex({ h: 360, s: 1, v: 1 }), '#FF0000');
  assert.equal(hsvToHex({ h: 120, s: 1, v: 1 }), '#00FF00');
  assert.equal(hsvToHex({ h: 240, s: 1, v: 1 }), '#0000FF');
  assert.equal(hsvToHex({ h: -120, s: 1, v: 1 }), '#0000FF');
  assert.equal(clamp(-1), 0);
  assert.equal(clamp(1.2), 1);
});

test('appearance keeps explicit choices and migrates the old automatic mode once', () => {
  const { resolveThemePreference } = load('appearance');
  assert.equal(resolveThemePreference('dark', 'light'), 'dark');
  assert.equal(resolveThemePreference('light', 'dark'), 'light');
  assert.equal(resolveThemePreference('system', 'dark'), 'dark');
  assert.equal(resolveThemePreference('system', 'light'), 'light');
  assert.equal(resolveThemePreference(null, 'dark'), 'light');
  assert.equal(resolveThemePreference('invalid', 'dark'), 'light');
});

test('offers validate real dates and reject executable or credential-bearing links', () => {
  const offers = load('offers');
  const draft = {
    ...offers.emptyOffer(),
    provider: 'Test',
    title: 'Essai',
    expiresOn: '2026-10-12',
  };
  assert.equal(offers.validateOffer(draft).provider, 'Test');
  for (const url of [
    'javascript:alert(1)',
    'http://example.com',
    'https://user:pass@example.com',
  ])
    assert.throws(() => offers.validateOffer({ ...draft, url }));
  assert.throws(() =>
    offers.validateOffer({ ...draft, expiresOn: '2026-02-30' }),
  );
  assert.equal(
    offers.validateOffer({ ...draft, url: 'https://example.com', used: true })
      .url,
    'https://example.com',
  );
  assert.equal(offers.offerDays(draft, date('2026-10-12')), 0);
  assert.equal(offers.offerDays(draft, date('2026-10-13')), -1);
});
test('offer create/edit/status/delete persist and stay isolated from demo and other accounts', async () => {
  const h = harness();
  const store = h.load('local-data');
  const offers = h.load('offers');
  store.setDataSession('guest', 'guest');
  const draft = {
    ...offers.emptyOffer(),
    provider: 'Test',
    title: 'Offre',
    expiresOn: '2026-10-12',
  };
  await Promise.all([
    store.saveOffer(draft),
    store.saveOffer({ ...draft, provider: 'Autre' }),
  ]);
  let rows = await store.getSavedOffers();
  assert.equal(rows.length, 2);
  const id = rows[0].id;
  await store.saveOffer({ ...draft, code: 'BONPLAN' }, id);
  await store.changeOffer(id, 'used');
  rows = await store.getSavedOffers();
  assert.equal(rows.find((o) => o.id === id).used, true);
  assert.equal(rows.find((o) => o.id === id).code, 'BONPLAN');
  store.setDataSession('demo', 'demo');
  await store.seedDemo();
  assert.ok((await store.getSavedOffers()).every((o) => o.demo));
  store.setDataSession('account', 'account:1');
  assert.deepEqual(await store.getSavedOffers(), []);
  await store.saveOffer(draft);
  store.setDataSession('account', 'account:2');
  assert.deepEqual(await store.getSavedOffers(), []);
  await store.clearAccountFollowUps('account:1');
  assert.deepEqual(await store.getSavedOffers('account:1'), []);
  store.setDataSession('guest', 'guest');
  assert.equal((await store.getSavedOffers()).length, 2);
  await store.changeOffer(id, 'delete');
  assert.equal((await store.getSavedOffers()).length, 1);
});
test('cost projections apply confirmed end dates but not a cancellation intention', () => {
  const { costProjection } = load('stats-projection');
  const rows = [
    sub(),
    sub({ id: 2, price: '120', frequency: 'yearly' }),
    sub({ id: 3, isActive: false }),
  ];
  const projected = costProjection(
    rows,
    {
      1: { decision: 'cancel_requested' },
      2: { decision: 'cancel_confirmed', effectiveOn: '2026-11-12' },
    },
    3,
    date('2026-10-06'),
  );
  assert.deepEqual(
    projected.map((p) => p.amount),
    [22, 12, 12],
  );
  assert.deepEqual(
    projected.map((p) => p.month),
    ['2026-10', '2026-11', '2026-12'],
  );
  assert.equal(costProjection([], {}, 3)[0].amount, 0);
});
test('shell-quote rejects the reported command-injection vector without executing it', () => {
  const { quote } = require('shell-quote');
  assert.throws(
    () => quote(['echo', 'ok', { comment: 'x' }, 'a\nid;#']),
    TypeError,
  );
  assert.ok(quote(['hello world']).includes('hello world'));
});
