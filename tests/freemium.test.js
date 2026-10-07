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
    getAllKeys: async () => [...memory.keys()],
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
test('home renewals sort by renewal while retaining earlier safety dates and unresolved trials', () => {
  const now = date('2026-10-06');
  const items = [
    sub({ id: 1, nextRenewal: '2026-10-20', useSafetyDate: true, safetyDate: '2026-10-07' }),
    sub({ id: 2, nextRenewal: '2026-10-10' }),
    sub({ id: 3, isActive: false }),
    sub({ id: 4, frequency: 'lifetime' }),
    sub({ id: 5, nextRenewal: null }),
    sub({ id: 6, isTrial: true, trialEndsAt: '2026-10-05' }),
    sub({ id: 7, nextRenewal: '2026-10-08' }),
    sub({ id: 8, nextRenewal: '2026-10-09' }),
  ];
  const follow = {
    2: { decision: 'keep' },
    7: { decision: 'cancel_confirmed', effectiveOn: '2026-10-07' },
    8: { decision: 'cancel_confirmed', effectiveOn: '2026-10-15' },
  };
  const result = math.upcomingRenewals(items, follow, now);
  assert.deepEqual(result.map(({ sub }) => sub.id), [6, 8, 2, 1]);
  assert.equal(math.dayKey(result[3].dates.safety), '2026-10-07');
  assert.equal(math.dayKey(result[0].dates.renewal), '2026-10-05');
  assert.equal(items[0].id, 1, 'input order is untouched');
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
test('free and premium reminders honor the chosen lead, cancel effective renewals and cap iOS queue', () => {
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
    '2026-10-13',
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
          introPrice: {
            ...item.product.introPrice,
            periodNumberOfUnits: 3,
          },
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
    16,
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
    offers.validateOffer({
      ...draft,
      url: 'https://example.com',
      used: true,
    }).url,
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

test('chosen safety day drives free notifications and recurs by calendar-day offset', () => {
  const custom = sub({ useSafetyDate: true, safetyDate: '2026-10-10' });
  const follow = {
    1: { reminderEnabled: true, noticeDays: 2, leadDays: 1 },
  };
  const plan = reminderPlan([custom], follow, false, date('2026-10-06'));
  assert.equal(math.dayKey(plan[0].at), '2026-10-10');
  assert.equal(plan[0].at.getHours(), 9);
  assert.equal(math.dayKey(plan[1].at), '2026-11-10');
  // Don't replace a missed custom date with a different date this cycle.
  assert.equal(
    math.dayKey(math.deadlines(custom, follow[1], date('2026-10-12')).safety),
    '2026-10-10',
  );
  assert.equal(
    math.dayKey(
      reminderPlan([custom], follow, false, date('2026-10-12'))[0].at,
    ),
    '2026-11-10',
  );
  assert.equal(
    math.dayKey(
      math.deadlines(custom, { noticeDays: 15 }, date('2026-10-01')).safety,
    ),
    '2026-10-05',
  );
});
test('five stable free slots survive reversed API ordering; Plus lifts the limit', () => {
  const all = Array.from({ length: 7 }, (_, i) =>
    sub({ id: i + 1, createdAt: `2026-01-0${i + 1}` }),
  );
  assert(math.canCustomizeSubscription(all[4], [...all].reverse(), false));
  assert.equal(math.canCustomizeSubscription(all[5], all, false), false);
  assert(math.canCustomizeSubscription(all[6], all, true));
  const follow = {
    1: { decision: 'cancel_confirmed', effectiveOn: '2020-01-01' },
  };
  assert(math.canCustomizeSubscription(all[5], all, false, follow));
  const alerts = Object.fromEntries(
    all.map((s) => [s.id, { reminderEnabled: true }]),
  );
  const notified = new Set(
    reminderPlan(all, alerts, false, date('2026-10-06')).map(
      (p) => p.subscriptionId,
    ),
  );
  assert.equal(notified.size, 5);
  assert.equal(notified.has(6), false);
});
test('photo quotas count legacy receipts; concurrent adds cannot exceed five or ten', async () => {
  const h = harness(),
    photos = h.load('subscription-photos');
  const item = sub({
    purchaseProofImage: 'https://example.com/old.jpg',
    unsubscribeProofImage: 'https://example.com/proof.jpg',
  });
  const uri = 'data:image/jpeg;base64,YWJj';
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () =>
      photos.addPhoto('guest', item, [item], {}, false, uri, 'Test'),
    ),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 3);
  assert.equal((await photos.getPhotos('guest', item)).length, 5);
  for (let i = 0; i < 5; i++)
    await photos.addPhoto('guest', item, [item], {}, true, uri, 'Plus');
  await assert.rejects(
    photos.addPhoto('guest', item, [item], {}, true, uri, 'Full'),
    /Retirez-en une/,
  );
  // Downgrade preserves all photos, including legacy fields, and still permits removals.
  assert.equal((await photos.getPhotos('guest', item)).length, 10);
  await assert.rejects(
    photos.addPhoto('guest', item, [item], {}, false, uri, 'Free'),
  );
  const rows = await photos.getPhotos('guest', item);
  await photos.removePhoto('guest', item.id, rows[2].id);
  assert.equal((await photos.getPhotos('guest', item)).length, 9);
  assert.equal(item.purchaseProofImage, 'https://example.com/old.jpg');
});
test('photo limits apply per subscription, reject sixth free subscription and temporary file URIs', async () => {
  const h = harness(),
    photos = h.load('subscription-photos');
  const all = Array.from({ length: 6 }, (_, i) => sub({ id: i + 1 }));
  const uri = 'data:image/jpeg;base64,YWJj';
  await assert.rejects(
    photos.addPhoto('guest', all[5], all, {}, false, uri, 'Test'),
  );
  await photos.addPhoto('guest', all[5], all, {}, true, uri, 'Test');
  await photos.addPhoto('guest', all[0], all, {}, false, uri, 'Other');
  assert.equal((await photos.getPhotos('guest', all[0])).length, 1);
  await assert.rejects(
    photos.addPhoto(
      'guest',
      all[0],
      all,
      {},
      false,
      'file:///cache/photo.jpg',
      'Test',
    ),
  );
  await assert.rejects(
    photos.addPhoto(
      'guest',
      all[0],
      all,
      {},
      false,
      uri + 'A'.repeat(photos.MAX_PHOTO_LENGTH),
      'Test',
    ),
  );
});
test('photo persistence is isolated between guest/demo/accounts; deletion clears only its owner', async () => {
  const h = harness(),
    photos = h.load('subscription-photos'),
    local = h.load('local-data');
  const item = sub(),
    uri = 'data:image/jpeg;base64,YWJj';
  for (const scope of ['guest', 'demo', 'account:1', 'account:2'])
    await photos.addPhoto(scope, item, [item], {}, false, uri, scope);
  assert.equal(
    (await photos.getPhotos('account:2', item))[0].label,
    'account:2',
  );
  await local.clearAccountFollowUps('account:1');
  assert.equal((await photos.getPhotos('account:1', item)).length, 0);
  assert.equal((await photos.getPhotos('account:2', item)).length, 1);
  await local.seedDemo();
  assert.equal((await photos.getPhotos('demo', item)).length, 2);
  assert.ok((await photos.getPhotos('demo', item)).every(p => p.label.startsWith('Démo ·')));
  assert.equal((await photos.getPhotos('guest', item)).length, 1);
  await photos.clearPhotos('guest', item.id);
  assert.equal((await photos.getPhotos('guest', item)).length, 0);
});
test('failed photo index write rolls back image and keeps previous gallery', async () => {
  const h = harness(),
    photos = h.load('subscription-photos'),
    item = sub();
  const uri = 'data:image/jpeg;base64,YWJj';
  await photos.addPhoto('guest', item, [item], {}, false, uri, 'Original');
  const original = h.storage.setItem;
  h.storage.setItem = async (key, value) => {
    if (key.endsWith('.index')) throw new Error('Storage full');
    return original(key, value);
  };
  await assert.rejects(
    photos.addPhoto('guest', item, [item], {}, false, uri, 'Failure'),
    /Storage full/,
  );
  assert.equal((await photos.getPhotos('guest', item)).length, 1);
  assert.equal(h.memory.size, 2);
});

test('trial expiry is a single calendar event and never silently confirms a paid subscription', () => {
  const item = sub({
    isTrial: true,
    trialEndsAt: '2026-10-10',
    nextRenewal: '2026-10-15',
  });
  assert.equal(math.trialState(item, date('2026-10-10')), 'active');
  assert.equal(math.trialState(item, date('2026-10-11')), 'expired');
  assert.equal(
    math.dayKey(math.nextRenewal(item, date('2027-02-01'))),
    '2026-10-10',
  );
  assert.equal(math.currentMonthlyCost(item), 0);
  assert.equal(
    math.trialState(sub({ isTrial: true, trialEndsAt: null })),
    'missing_date',
  );
  assert.equal(
    math.nextRenewal(sub({ isTrial: true, trialEndsAt: null })),
    null,
  );
  assert.match(math.trialLabel(item, date('2026-10-10')), /aujourd’hui/);
  assert.match(math.trialLabel(item, date('2026-10-11')), /terminé/);
});
test('current totals exclude trials while hypothetical totals include their future tariffs', () => {
  const trial = sub({
    id: 2,
    isTrial: true,
    trialEndsAt: '2026-10-10',
    price: '120',
    frequency: 'yearly',
  });
  const total = math.overview([sub(), trial], {}, date('2026-10-11'));
  assert.equal(total.monthly, 12);
  assert.equal(total.trialMonthly, 10);
  assert.equal(total.afterTrialsMonthly, 22);
  assert.equal(total.active, 2);
  assert.equal(total.expiredTrials, 1);
  const cancelled = math.overview(
    [sub(), trial],
    { 2: { decision: 'cancel_confirmed', effectiveOn: '2026-10-10' } },
    date('2026-10-11'),
  );
  assert.equal(cancelled.afterTrialsMonthly, 12);
  assert.equal(cancelled.active, 1);
});
test('trial and paid subscriptions share five free slots, including overdue unresolved trials', () => {
  const rows = Array.from({ length: 5 }, (_, i) =>
    sub({ id: i + 1, isTrial: i > 2, trialEndsAt: '2020-01-01' }),
  );
  assert.equal(math.canAddSubscription(rows, false), false);
  assert.equal(math.canAddSubscription(rows, true), true);
  assert.equal(
    math.canAddSubscription(rows, false, {
      5: { decision: 'cancel_confirmed', effectiveOn: '2020-01-01' },
    }),
    true,
  );
});
test('trial reminder fires once before its end, honors custom safety date, and never recurs', () => {
  const item = sub({
    isTrial: true,
    trialEndsAt: '2026-10-10',
    nextRenewal: '2026-10-15',
    useSafetyDate: true,
    safetyDate: '2026-10-08',
  });
  const follow = { 1: { reminderEnabled: true } };
  const plan = reminderPlan([item], follow, false, date('2026-10-06'));
  assert.equal(plan.length, 1);
  assert.equal(math.dayKey(plan[0].at), '2026-10-08');
  assert.equal(plan[0].isTrial, true);
  assert.equal(
    reminderPlan([item], follow, true, date('2026-10-11')).length,
    0,
  );
  assert.equal(
    reminderPlan(
      [item],
      {
        1: {
          ...follow[1],
          decision: 'cancel_confirmed',
          effectiveOn: '2026-10-09',
        },
      },
      false,
      date('2026-10-06'),
    ).length,
    0,
  );
});
test('confirming the paid transition uses the first paid date and preserves the safety offset', () => {
  const item = sub({
    isTrial: true,
    trialEndsAt: '2026-10-10',
    nextRenewal: '2026-10-15',
    useSafetyDate: true,
    safetyDate: '2026-10-08',
  });
  assert.throws(() => math.paidTrialPatch(item, date('2026-10-09')));
  assert.throws(() => math.paidTrialPatch(item, date('2026-10-12')));
  const paid = {
    ...item,
    ...math.paidTrialPatch(item, date('2026-10-16')),
  };
  assert.equal(paid.isTrial, false);
  assert.equal(paid.nextRenewal, '2026-10-15');
  assert.equal(paid.safetyDate, '2026-10-13');
  assert.equal(
    math.dayKey(math.nextRenewal(paid, date('2026-10-16'))),
    '2026-11-15',
  );
  assert.equal(math.currentMonthlyCost(paid), 12);
});
test('conditional projections charge trials only from their first planned payment', () => {
  const { costProjection } = load('stats-projection');
  const trial = sub({
    isTrial: true,
    trialEndsAt: '2026-11-01',
    nextRenewal: '2026-12-01',
  });
  const result = costProjection(
    [sub({ id: 2 }), trial],
    {},
    3,
    date('2026-10-06'),
  );
  assert.deepEqual(
    result.map((p) => p.amount),
    [12, 12, 24],
  );
  const cancelled = costProjection(
    [trial],
    { 1: { decision: 'cancel_confirmed', effectiveOn: '2026-11-01' } },
    3,
    date('2026-10-06'),
  );
  assert.deepEqual(
    cancelled.map((p) => p.amount),
    [0, 0, 0],
  );
});
test('trial form requires a real end date even without safety enabled and rejects payment before expiry', () => {
  const { subscriptionFormSchema: schema } = load('subscription-form-schema');
  const base = {
    name: 'Essai',
    price: '9,99',
    frequency: 'monthly',
    category: 'other',
    isTrial: true,
    useSafetyDate: false,
  };
  for (const trialEndsAt of ['', '2026-02-30', undefined]) {
    const result = schema.safeParse({ ...base, trialEndsAt });
    assert.equal(result.success, false);
    assert(result.error.issues.some((i) => i.path[0] === 'trialEndsAt'));
  }
  assert.equal(
    schema.safeParse({
      ...base,
      trialEndsAt: '2026-10-12',
      nextRenewal: '2026-10-11',
    }).success,
    false,
  );
  assert.equal(
    schema.safeParse({
      ...base,
      trialEndsAt: '2026-10-12',
      nextRenewal: '',
    }).success,
    true,
  );
  assert.equal(
    schema.safeParse({
      ...base,
      trialEndsAt: '2026-10-12',
      frequency: 'lifetime',
    }).success,
    false,
  );
  assert.equal(
    schema.safeParse({
      ...base,
      trialEndsAt: '2026-10-12',
      useSafetyDate: true,
      safetyDate: '2026-10-13',
    }).success,
    false,
  );
});
test('safety calendar dates validate the real billing date and identify missing dependencies', () => {
  const { subscriptionFormSchema: schema } = load('subscription-form-schema');
  const base = {
    name: 'Service',
    price: '9,99',
    frequency: 'monthly',
    category: 'other',
    useSafetyDate: true,
    safetyDate: '2026-12-01',
  };
  assert.equal(
    schema.safeParse({ ...base, nextRenewal: '2026-12-31' }).success,
    true,
  );
  const missing = schema.safeParse({ ...base, nextRenewal: '' });
  assert.equal(missing.success, false);
  assert(missing.error.issues.some((issue) => issue.path[0] === 'nextRenewal'));
  assert(!missing.error.issues.some((issue) => issue.path[0] === 'safetyDate'));
  assert.equal(
    schema.safeParse({ ...base, nextRenewal: '2026-12-01' }).success,
    false,
  );
  assert.equal(
    schema.safeParse({ ...base, nextRenewal: '2026-11-30' }).success,
    false,
  );
  assert.equal(
    schema.safeParse({ ...base, useSafetyDate: false, nextRenewal: '' })
      .success,
    true,
  );
  assert.equal(
    schema.safeParse({
      ...base,
      isTrial: true,
      trialEndsAt: '2026-11-30',
      nextRenewal: '2026-12-31',
    }).success,
    false,
  );
  assert.equal(
    schema.safeParse({
      ...base,
      safetyDate: '2028-02-29',
      nextRenewal: '2028-03-01',
    }).success,
    true,
  );
});
test('cancellation links reject executable URLs and credentials but can be cleared', () => {
  const { cancellationUrl } = load('cancellation-url');
  assert.equal(cancellationUrl(''), '');
  assert.equal(
    cancellationUrl(' https://example.com/account '),
    'https://example.com/account',
  );
  for (const url of [
    'javascript:alert(1)',
    'file:///tmp/test',
    'https://user:pass@example.com',
    'http://example.com',
  ])
    assert.throws(() => cancellationUrl(url));
});

test('budget scenarios use explicit ratings, exclude archived costs and never double-count overlaps', () => {
  const views = load('stats-views');
  const all = [
    sub({ id: 1, price: '10', usageFrequency: 'rarely_used', rating: 2 }),
    sub({ id: 2, price: '20', rating: 1 }),
    sub({ id: 3, price: '30', usageFrequency: 'rarely_used', rating: 5 }),
    sub({ id: 4, price: '5', rating: null }),
    sub({ id: 5, price: '7', rating: 0 }),
    sub({ id: 6, price: '11', isTrial: true, usageFrequency: 'rarely_used', rating: 1 }),
    sub({ id: 7, price: '100', isActive: false, rating: 1 }),
  ];
  const before = JSON.stringify(all);
  const follow = { 1: { decision: 'cancel_requested' } };
  const now = date('2026-10-07');
  assert.equal(views.statsScenario(all, follow, 'current', now).monthly, 72);
  assert.equal(views.statsScenario(all, follow, 'cancellations', now).monthly, 62);
  assert.equal(views.statsScenario(all, follow, 'underused', now).monthly, 32);
  assert.equal(views.statsScenario(all, follow, 'low_rated', now).monthly, 42);
  const combined = views.statsScenario(all, follow, 'optimized', now);
  assert.equal(combined.monthly, 12);
  assert.equal(combined.avoidedMonthly, 60);
  assert.deepEqual(combined.excluded.map((s) => s.id), [1, 2, 3, 6]);
  assert.equal(JSON.stringify(all), before);
});
test('advanced views fall back to current when Plus access is lost', () => {
  const views = load('stats-views');
  for (const v of ['underused', 'low_rated', 'optimized']) {
    assert.equal(views.availableStatsView(v, false), 'current');
    assert.equal(views.availableStatsView(v, true), v);
  }
  assert.equal(views.availableStatsView('cancellations', false), 'cancellations');
});
test('budget input accepts zero and comma cents, rejects incomplete and ambiguous amounts', () => {
  const { parseMonthlyBudget } = load('stats-views');
  assert.equal(parseMonthlyBudget('80,50'), 80.5);
  assert.equal(parseMonthlyBudget('0'), 0);
  assert.equal(parseMonthlyBudget(' 42.75 '), 42.75);
  for (const bad of ['', '-1', '1,234', '1.2.3', 'NaN', 'Infinity', '1e3', '1000001'])
    assert.throws(() => parseMonthlyBudget(bad));
});
test('form photo batch rolls back a partial write and retries without duplicate attachments', async () => {
  const h = harness(), photos = h.load('subscription-photos'), item = sub();
  const uri = 'data:image/jpeg;base64,YWJj';
  await photos.addPhoto('guest', item, [item], {}, false, uri, 'Original');
  const set = h.storage.setItem;
  let blobs = 0;
  h.storage.setItem = async (key, value) => {
    if (!key.endsWith('.index') && ++blobs === 2) throw new Error('Disk full');
    return set(key, value);
  };
  const drafts = ['A', 'B', 'C'].map((label) => ({ uri, label }));
  await assert.rejects(photos.addPhotos('guest', item, [item], {}, false, drafts), /Disk full/);
  assert.equal((await photos.getPhotos('guest', item)).length, 1);
  assert.equal(h.memory.size, 2);
  h.storage.setItem = set;
  await photos.addPhotos('guest', item, [item], {}, false, drafts);
  assert.equal((await photos.getPhotos('guest', item)).length, 4);
  await assert.rejects(photos.addPhotos('guest', item, [item], {}, false, drafts), /5 photos/);
  assert.equal((await photos.getPhotos('guest', item)).length, 4);
});


test('rich demo seeds coherent subscriptions, trials, offers and offline proof images without personal data changes', async () => {
  const h = harness();
  const local = h.load('local-data');
  const photos = h.load('subscription-photos');
  const offers = h.load('offers');
  const breakdown = h.load('savings-breakdown');
  h.memory.set('pigeonsub.v2.guest.data', 'personal-data');
  h.memory.set('pigeonsub.photos.account%3A9.saved', 'private-image');
  await local.seedDemo();
  local.setDataSession('demo', 'demo');
  const rows = await local.localRequest('/subscriptions?includeArchived=true');
  const follow = await local.getFollowUps();
  const overview = math.overview(rows, follow);
  assert.equal(rows.length, 16);
  assert.equal(overview.trialCount, 4);
  assert.equal(overview.expiredTrials, 1);
  assert.equal(overview.potentialAnnual.toFixed(2), '161.88');
  assert.equal(overview.confirmedAnnual.toFixed(2), '206.79');
  assert.equal(overview.monthly.toFixed(2), '130.66');
  assert.equal((await local.localRequest('/settings')).budgetCap, '120');
  assert.deepEqual(breakdown.savingsBreakdown(rows, follow).pending.map(r => r.sub.name), ['Netflix']);
  const saved = await local.getSavedOffers();
  assert.equal(saved.length, 8);
  assert(saved.every(o => o.demo && o.url === ''));
  assert(saved.some(o => offers.offerDays(o) === 0));
  assert(saved.some(o => offers.offerDays(o) < 0));
  assert(saved.some(o => o.used));
  saved.forEach(o => offers.validateOffer(o));
  const gallery = (await Promise.all(rows.map(s => photos.getPhotos('demo', s)))).flat();
  assert.equal(gallery.length, 8);
  for (const p of gallery) {
    assert(p.label.startsWith('Démo ·'));
    assert(p.uri.length < photos.MAX_PHOTO_LENGTH);
    assert.equal(Buffer.from(p.uri.split(',')[1], 'base64').subarray(0, 3).toString('hex'), 'ffd8ff');
  }
  await photos.removePhoto('demo', 1, (await photos.getPhotos('demo', rows[0]))[0].id);
  await local.seedDemo();
  assert.equal((await photos.getPhotos('demo', rows[0])).length, 2);
  assert.equal([...h.memory.keys()].filter(k => k.startsWith('pigeonsub.photos.demo.')).length, 9);
  assert.equal(h.memory.get('pigeonsub.v2.guest.data'), 'personal-data');
  assert.equal(h.memory.get('pigeonsub.photos.account%3A9.saved'), 'private-image');
  const created = await local.localRequest('/subscriptions', { method: 'POST', body: JSON.stringify({ name: 'New example', price: '1', frequency: 'monthly', category: 'other' }) });
  assert.equal(created.id, 17);
});

test('savings explanation follows actual billing periods and matches overview across statuses', () => {
  const { annualSavingsCalculation, savingsBreakdown } = load('savings-breakdown');
  for (const [frequency, price, expected] of [['monthly', '13.49', '12 mois'], ['yearly', '109.99', '1 an'], ['weekly', '4', '52 semaines'], ['quarterly', '30', '4 trimestres'], ['semiannual', '50', '2 semestres']]) {
    assert(annualSavingsCalculation(sub({ frequency, price })).includes(expected));
  }
  const rows = [sub(), sub({ id: 2, isActive: false }), sub({ id: 3, isTrial: true }), sub({ id: 4, frequency: 'yearly', price: '99.99', isActive: false }), sub({ id: 5, rating: 1, usageFrequency: 'rarely_used' })];
  const follow = { 1: { decision: 'cancel_requested' }, 2: { decision: 'cancel_requested' }, 3: { decision: 'cancel_requested' }, 4: { decision: 'cancel_confirmed' } };
  const result = savingsBreakdown(rows, follow), summary = math.overview(rows, follow);
  assert.deepEqual(result.pending.map(r => r.sub.id), [1, 3]);
  assert.equal(result.pending.reduce((s, r) => s + r.annual, 0), summary.potentialAnnual);
  assert.equal(result.confirmed.reduce((s, r) => s + r.annual, 0), summary.confirmedAnnual);
});

test('demo photo refresh failure retains previous gallery and never touches personal photos', async () => {
  const h = harness(), photos = h.load('subscription-photos');
  const examples = [{ id: 'a', subscriptionId: 1, uri: 'data:image/jpeg;base64,YWJj', label: 'Original demo' }];
  await photos.replaceDemoPhotos(examples);
  const before = new Map(h.memory);
  const set = h.storage.setItem;
  h.storage.setItem = async (key, value) => {
    if (key === 'pigeonsub.photos.demo.index') throw new Error('Full');
    return set(key, value);
  };
  await assert.rejects(photos.replaceDemoPhotos([{ ...examples[0], label: 'Changed' }]), /Full/);
  assert.deepEqual(h.memory, before);
  assert.equal((await photos.getPhotos('demo', sub()))[0].label, 'Original demo');
});

test('subscription views and review suggestions separate trials, archives, kept decisions and billing intervals', () => {
  const { filterSubscriptions, reviewCandidates } = load('subscription-views');
  const now = date('2026-10-07');
  const items = [
    sub({ id: 1, usageFrequency: 'rarely_used', rating: 2, nextRenewal: '2026-10-10' }),
    sub({ id: 2, usageFrequency: 'rarely_used', rating: 1, nextRenewal: '2026-10-09' }),
    sub({ id: 3, isTrial: true, trialEndsAt: '2026-10-06', rating: null, usageFrequency: 'used' }),
    sub({ id: 4, isActive: false, rating: 1 }),
    sub({ id: 5, frequency: 'lifetime', rating: 1, usageFrequency: 'rarely_used' }),
    sub({ id: 6, rating: 2, nextRenewal: '2026-10-20' }),
    sub({ id: 7, rating: null, usageFrequency: 'used', nextRenewal: '2026-11-20' }),
  ];
  const follow = { 1: { decision: 'cancel_requested' }, 2: { decision: 'keep' }, 6: { decision: 'cancel_confirmed', effectiveOn: '2026-10-20' } };
  const ids = rows => rows.map(s => s.id);
  assert.deepEqual(ids(filterSubscriptions(items, follow, 'archived', now)), [4]);
  assert.deepEqual(ids(filterSubscriptions(items, follow, 'trials', now)), [3]);
  assert.deepEqual(ids(filterSubscriptions(items, follow, 'soon', now)), [1, 2, 3]);
  assert.deepEqual(ids(filterSubscriptions(items, follow, 'cancelling', now)), [1]);
  assert.deepEqual(ids(reviewCandidates(items, follow, now)), [1]);
  assert.equal(filterSubscriptions(items, follow, 'low_rated', now).some(s => s.id === 7), false);
  assert.equal(filterSubscriptions(items, follow, 'active', date('2026-10-21')).some(s => s.id === 6), false);
});

test('budget gauges cap the fill while preserving overruns and handle a zero or absent budget', () => {
  const { budgetUsage } = load('subscription-views');
  assert.deepEqual(budgetUsage(87, 100), { percent: 87, over: 0 });
  assert.deepEqual(budgetUsage(130, 120), { percent: 100, over: 10 });
  assert.deepEqual(budgetUsage(20, 0), { percent: 100, over: 20 });
  assert.deepEqual(budgetUsage(0, 0), { percent: 0, over: 0 });
  assert.deepEqual(budgetUsage(20, null), { percent: 0, over: 0 });
});

test('shared calendar events include safety dates before a later renewal and exclude ended subscriptions', () => {
  const { calendarEvents } = load('calendar-events');
  const now = date('2026-10-07');
  const items = [
    sub({ id: 1, nextRenewal: '2026-10-10', useSafetyDate: true, safetyDate: '2026-10-08' }),
    sub({ id: 2, nextRenewal: '2026-11-06' }),
    sub({ id: 3, nextRenewal: '2026-10-10', isActive: false }),
  ];
  const events = calendarEvents(items, { 2: { noticeDays: 30, leadDays: 1 } }, now, date('2026-10-13'), now);
  assert(events.some(e => e.id === 1 && e.day === '2026-10-08' && e.kind === 'Date de sûreté'));
  assert(events.some(e => e.id === 1 && e.day === '2026-10-10' && e.kind === 'Prélèvement'));
  assert.equal(events.some(e => e.id === 3), false);
  const earlier = calendarEvents(items, { 2: { noticeDays: 30, leadDays: 1 } }, date('2026-10-01'), date('2026-10-07'), date('2026-10-01'));
  assert(earlier.some(e => e.id === 2 && e.day === '2026-10-06' && e.kind === 'Date de sûreté'));
});

test('guide progress is recoverable and every step targets a populated demonstration', () => {
  const { guideSteps, readGuideProgress } = load('product-guide');
  assert.deepEqual(readGuideProgress(null), { status: 'new', index: 0 });
  assert.deepEqual(readGuideProgress('{bad'), { status: 'new', index: 0 });
  assert.deepEqual(readGuideProgress('{"status":"paused","index":99}'), { status: 'new', index: 0 });
  assert.deepEqual(readGuideProgress('{"status":"paused","index":4}'), { status: 'paused', index: 4 });
  assert.equal(new Set(guideSteps().map(s => s.id)).size, guideSteps().length);
  assert.equal(guideSteps().find(s => s.id === 'photos').route, '/(tabs)/subscriptions/1');
  assert(guideSteps().every(s => !s.route.endsWith('/new')));
  assert.equal(guideSteps(42).find(s => s.id === 'photos').route, '/(tabs)/subscriptions/42');
  assert(guideSteps().every(s => s.plus && s.reason && s.anchor));
});


test('temporary guided demo preserves scheduled personal reminders and resumes syncing on return', async () => {
  const h = harness();
  const local = h.load('local-data');
  const calls = [];
  const filename = path.resolve(__dirname, '../src/lib/notifications.ts');
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const stubs = {
    'expo-constants': { executionEnvironment: 'standalone' },
    'react-native': { Platform: { OS: 'ios' } },
    './api': { subscriptions: { list: async () => [] } },
    './local-data': local,
    './entitlements-state': { hasPlusAccess: () => false },
    './reminder-plan': { reminderPlan: () => [] },
    'expo-notifications': {
      getAllScheduledNotificationsAsync: async () => [{ identifier: 'personal', content: { data: { pigeonsub: true } } }],
      cancelScheduledNotificationAsync: async id => calls.push(id),
      getPermissionsAsync: async () => ({ granted: false }),
    },
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(name => {
    assert(name in stubs, name);
    return stubs[name];
  }, module, module.exports);
  local.setDataSession('demo', 'demo', true);
  await module.exports.syncReminders();
  assert.deepEqual(calls, [], 'tour must neither cancel nor schedule reminders');
  local.setDataSession('account', 'account:42');
  await module.exports.syncReminders();
  assert.deepEqual(calls, ['personal'], 'normal synchronization resumes after leaving tour');
});


test('safety sorting prioritizes long notice periods and overdue trials without dropping undated or ended records', () => {
  const { sortBySafetyDate, subscriptionSafetyDate } = load('subscription-views');
  const now = date('2026-10-07');
  const items = [
    sub({ id: 1, nextRenewal: '2026-10-09' }),
    sub({ id: 2, nextRenewal: '2026-11-08' }),
    sub({ id: 3, isTrial: true, trialEndsAt: '2026-10-06' }),
    sub({ id: 4, nextRenewal: '2026-10-15', useSafetyDate: true, safetyDate: '2026-10-07' }),
    sub({ id: 5, nextRenewal: null }),
    sub({ id: 6, nextRenewal: '2026-10-08' }),
    sub({ id: 7, isActive: false }),
    sub({ id: 8, frequency: 'lifetime' }),
    sub({ id: 9, nextRenewal: '2026-10-09' }),
  ];
  const follow = { 2: { noticeDays: 32, leadDays: 1 }, 6: { decision: 'cancel_confirmed', effectiveOn: '2026-12-01' } };
  const result = sortBySafetyDate(items, follow, now);
  assert.deepEqual(result.slice(0, 5).map(s => s.id), [3, 2, 4, 1, 9]);
  assert.equal(result.length, items.length, 'sorting must not remove subscriptions');
  assert.deepEqual(items.map(s => s.id), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'original order is preserved');
  for (const id of [5, 6, 7, 8]) assert.equal(subscriptionSafetyDate(items.find(s => s.id === id), follow, now), null);
  assert.equal(sortBySafetyDate(items.slice().reverse(), follow, now).findIndex(s => s.id === 1) < sortBySafetyDate(items.slice().reverse(), follow, now).findIndex(s => s.id === 9), true, 'ties remain stable regardless of API order');
});

test('custom icons require Plus, keep existing images on downgrade and allow removal', async () => {
  const h = harness(), local = h.load('local-data'), icons = h.load('subscription-icons'), billing = h.load('entitlements-state');
  const uri = 'data:image/jpeg;base64,QUJD';
  local.setDataSession('guest', 'guest');
  await assert.rejects(icons.saveSubscriptionIcon('guest', 1, uri), /PLUS_ICON/);
  assert.equal(await icons.getSubscriptionIcon('guest', 1), null);
  billing.setPlusAccess(true, 'guest');
  await icons.saveSubscriptionIcon('guest', 1, uri);
  billing.setPlusAccess(false, 'guest');
  assert.equal(await icons.getSubscriptionIcon('guest', 1), uri);
  await icons.saveSubscriptionIcon('guest', 1, undefined);
  await assert.rejects(icons.saveSubscriptionIcon('guest', 1, uri + 'AA'), /PLUS_ICON/);
  assert.equal(await icons.getSubscriptionIcon('guest', 1), uri);
  await icons.saveSubscriptionIcon('guest', 1, null);
  assert.equal(await icons.getSubscriptionIcon('guest', 1), null);
});

test('custom icons isolate accounts and demo, reject stale sessions and invalid images', async () => {
  const h = harness(), local = h.load('local-data'), icons = h.load('subscription-icons'), billing = h.load('entitlements-state');
  const uri = 'data:image/jpeg;base64,QUJD';
  local.setDataSession('account', 'account:1'); billing.setPlusAccess(true, 'account:1');
  await icons.saveSubscriptionIcon('account:1', 1, uri);
  local.setDataSession('account', 'account:2');
  await assert.rejects(icons.saveSubscriptionIcon('account:1', 1, null), /session/);
  await assert.rejects(icons.saveSubscriptionIcon('account:2', 1, uri), /PLUS_ICON/);
  assert.equal(await icons.getSubscriptionIcon('account:2', 1), null);
  local.setDataSession('demo', 'demo');
  await icons.saveSubscriptionIcon('demo', 1, uri);
  for (const value of ['file:///tmp/photo.jpg', 'https://example.com/p.jpg', 'data:image/svg+xml;base64,QUJD', uri + 'A'.repeat(icons.MAX_ICON_LENGTH)])
    await assert.rejects(icons.saveSubscriptionIcon('demo', 1, value), /icône/);
  assert.equal(await icons.getSubscriptionIcon('demo', 1), uri);
  const write = h.storage.setItem;
  h.storage.setItem = async () => { throw new Error('Disk full'); };
  await assert.rejects(icons.saveSubscriptionIcon('demo', 1, uri + 'AA'), /Disk full/);
  assert.equal(await icons.getSubscriptionIcon('demo', 1), uri);
  h.storage.setItem = write;
  await local.seedDemo();
  assert.equal(await icons.getSubscriptionIcon('demo', 1), null);
  assert.equal(await icons.getSubscriptionIcon('account:1', 1), uri);
  await local.clearAccountFollowUps('account:1');
  assert.equal(await icons.getSubscriptionIcon('account:1', 1), null);
});
