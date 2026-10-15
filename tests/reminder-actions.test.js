const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness() {
  const session = { scope: 'guest', mode: 'guest' }, follow = { 1: { reminderEnabled: false } }, writes = [];
  let sync = async () => {};
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/reminder-actions.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name => name === './notifications'
    ? { syncReminders: () => sync() }
    : { getDataSession: () => session, getFollowUps: async () => follow, updateFollowUp: async (id, patch) => { writes.push({ ...patch }); follow[id] = { ...follow[id], ...patch }; } }, module, module.exports);
  return { ...module.exports, follow, session, writes, setSync: value => { sync = value; } };
}
test('notification scheduling failure restores the stored choice', async () => {
  const h = harness();
  h.setSync(async () => { throw new Error('Native scheduler failed'); });
  await assert.rejects(h.changeReminder(1, true, 'guest'), /Native scheduler failed/);
  assert.equal(h.follow[1].reminderEnabled, false);
  assert.equal(h.writes.length, 2);
});
test('notification scheduling success persists and session changes never roll back another account', async () => {
  const h = harness();
  await h.changeReminder(1, true, 'guest');
  assert.equal(h.follow[1].reminderEnabled, true);
  h.setSync(async () => { h.session.scope = 'account:2'; throw new Error('Session changed'); });
  await assert.rejects(h.changeReminder(1, false, 'guest'), /Session changed/);
  assert.equal(h.writes.length, 2, 'no write to the new session');
});
