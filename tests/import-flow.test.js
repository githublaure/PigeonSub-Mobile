const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(name, stubs) {
  const filename = path.resolve(__dirname, '../src/lib/' + name + '.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(id => {
    if (!(id in stubs)) throw new Error('Unmocked: ' + id);
    return stubs[id];
  }, module, module.exports);
  return module.exports;
}
const math = load('subscription-math', {});
const csv = load('csv-import', { './subscription-math': math });
const sample = id => ({ id, name: id, price: '9.99', frequency: 'monthly', nextRenewal: '2026-11-01', occurrences: 2, variable: false });
function harness() {
  let scope = 'guest', plus = false, failed = false;
  const rows = [], completed = [];
  const api = { list: async () => rows, create: async payload => { if (failed) throw new Error('Network failure'); const row = { ...payload, id: rows.length + 1 }; rows.push(row); return row; } };
  const run = load('run-csv-import', { './api': { subscriptions: api }, './local-data': { getDataSession: () => ({ scope, mode: scope === 'demo' ? 'demo' : 'guest' }) }, './entitlements-state': { hasPlusAccess: () => plus }, './csv-import': csv });
  return { rows, completed, api, run: selected => run.runCsvImport('guest', selected, (...args) => completed.push(args)), setScope: value => scope = value, setPlus: value => plus = value, fail: value => failed = value };
}
test('CSV batch paywall, prevalidation, cancellation boundary and partial retry prevent duplicate writes', async () => {
  const h = harness();
  await assert.rejects(h.run([sample('A'), sample('B')]), /PLUS_IMPORT/);
  assert.equal(h.rows.length, 0);
  h.setPlus(true);
  await assert.rejects(h.run([sample('A'), { ...sample('B'), price: '-1' }]), /prix positif/);
  assert.equal(h.rows.length, 0, 'validate all before any write');
  const create = h.api.create;
  h.api.create = async payload => { const row = await create(payload); h.fail(true); return row; };
  await assert.rejects(h.run([sample('A'), sample('B')]), /Network/);
  assert.equal(h.rows.length, 1);
  h.fail(false); h.api.create = create;
  await h.run([sample('A'), sample('B')]);
  assert.equal(h.rows.length, 2);
  assert(h.completed.some(([id, saved]) => id === 'A' && saved === null), 'retry skips existing subscription');
  assert(h.rows.every(row => !row.useSafetyDate && !row.isTrial));
});
test('CSV import stops after a session change while loading existing subscriptions', async () => {
  const h = harness();
  h.api.list = async () => { h.setScope('demo'); return []; };
  await assert.rejects(h.run([sample('A')]), /session/);
  assert.equal(h.rows.length, 0);
});
test('notification diagnostics are scoped; tests require permission and avoid the demo', async () => {
  let mode = 'guest', scope = 'guest', granted = true;
  const scheduled = [];
  const native = {
    getPermissionsAsync: async () => ({ granted }), requestPermissionsAsync: async () => ({ granted }),
    getAllScheduledNotificationsAsync: async () => [
      { content: { data: { pigeonsub: true, scope: 'guest', scheduledAt: '2099-10-07T09:00:00Z' } } },
      { content: { data: { pigeonsub: true, scope: 'account:2' } } },
      { content: { data: { pigeonsub: true, scope: 'guest', diagnostic: true } } },
    ],
    scheduleNotificationAsync: async value => { scheduled.push(value); },
    SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
  };
  const notifications = load('notifications', {
    'expo-constants': { executionEnvironment: 'standalone' }, 'react-native': { Platform: { OS: 'ios' } },
    './api': {}, './local-data': { getDataSession: () => ({ mode, scope }), isGuidePreview: () => false },
    './entitlements-state': {}, './reminder-plan': {}, 'expo-notifications': native,
  });
  assert.equal((await notifications.getReminderStatus()).count, 1);
  await notifications.sendTestReminder();
  assert.equal(scheduled[0].trigger.seconds, 10);
  assert.equal(scheduled[0].content.data.diagnostic, true);
  granted = false;
  await assert.rejects(notifications.sendTestReminder(), /Autorisez/);
  assert.equal((await notifications.getReminderStatus()).state, 'denied');
  mode = 'demo'; scope = 'demo';
  await assert.rejects(notifications.sendTestReminder(), /hors démo/);
  assert.equal((await notifications.getReminderStatus()).state, 'demo');
  assert.equal(scheduled.length, 1);
});

test('connected batch uses the protected endpoint once and never falls back to individual writes', async () => {
  let scope = 'account:1', calls = 0, fail = false;
  const run = load('run-csv-import', {
    './api': { subscriptions: { importBatch: async payloads => { calls++; if (fail) throw new Error('BILLING_UNAVAILABLE'); return payloads.map((p,i) => ({ ...p, id: i + 1 })); }, create: () => assert.fail('no POST fallback'), list: () => assert.fail('server handles retry') } },
    './local-data': { getDataSession: () => ({ mode: 'account', scope }) },
    './entitlements-state': { hasPlusAccess: () => true }, './csv-import': csv,
  });
  const completed = [];
  await run.runCsvImport(scope, [sample('A'), sample('B')], (...args) => completed.push(args));
  assert.equal(calls, 1); assert.equal(completed.length, 2);
  fail = true;
  await assert.rejects(run.runCsvImport(scope, [sample('C'), sample('D')], () => assert.fail()), /BILLING/);
  assert.equal(calls, 2);
  await assert.rejects(run.runCsvImport('account:2', [sample('A'), sample('B')], () => assert.fail()), /session/);
  assert.equal(calls, 2);
});
test('connected Plus ignores SDK claims and fails closed on every server failure; guest/demo stay local', async () => {
  const { resolvePlusAccess } = load('billing-access', {});
  assert.equal(await resolvePlusAccess('account', true, async () => ({ isPlus: false })), false);
  assert.equal(await resolvePlusAccess('account', false, async () => ({ isPlus: true })), true);
  for (const status of [401, 403, 404, 500, 503]) {
    await assert.rejects(resolvePlusAccess('account', true, async () => { throw new Error(String(status)); }), new RegExp(String(status)));
  }
  assert.equal(await resolvePlusAccess('guest', true, () => assert.fail()), true);
  assert.equal(await resolvePlusAccess('guest', false, () => assert.fail()), false);
  // Demo is granted by the explicit local mode, never reported as a paid account.
  assert.equal(await resolvePlusAccess('demo', true, () => assert.fail()), false);
});
