const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
const { checkLock, preflight, build } = require('../scripts/mobile-build');

const root = path.resolve(__dirname, '..');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-build-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(root, name), path.join(dir, name));
  }
  return dir;
}
function installExpo(dir, version = '54.0.37') {
  const expo = path.join(dir, 'node_modules/expo');
  fs.mkdirSync(path.join(expo, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(expo, 'package.json'), JSON.stringify({ version }));
  fs.writeFileSync(path.join(expo, 'bin/cli'), '');
}

test('mobile lockfile pins SDK 54 and only public npm tarballs with integrity', () => {
  assert.equal(checkLock(root), '54.0.37');
});

test('preflight rejects a clean checkout without installing or downloading Expo', (t) => {
  const dir = fixture(t);
  assert.throws(() => preflight(dir), /Local Expo is missing/);
  assert.equal(fs.existsSync(path.join(dir, 'node_modules')), false);
});

test('preflight rejects wrong SDK, wrong patch version, and incomplete CLI', (t) => {
  const dir = fixture(t);
  for (const version of ['57.0.26', '54.0.36']) {
    installExpo(dir, version);
    assert.throws(() => preflight(dir), /does not match locked Expo/);
  }
  installExpo(dir);
  assert.equal(preflight(dir), path.join(dir, 'node_modules/expo/bin/cli'));
  fs.unlinkSync(path.join(dir, 'node_modules/expo/bin/cli'));
  assert.throws(() => preflight(dir), /CLI is missing/);
});

test('private registry URLs are rejected before installation', (t) => {
  const dir = fixture(t);
  const file = path.join(dir, 'package-lock.json');
  const original = fs.readFileSync(file, 'utf8');
  for (const host of ['package-firewall.replit.internal/npm', 'package-firewall.replit.local/npm']) {
    fs.writeFileSync(file, original.replace('https://registry.npmjs.org', `http://${host}`));
    assert.throws(() => build('prepare', dir, () => assert.fail('must not install')), /Non-portable/);
  }
});

test('prepare installs at mobile root before preflight and uses only the local CLI', (t) => {
  const dir = fixture(t);
  const calls = [];
  build('prepare', dir, (command, args, cwd) => {
    calls.push({ command, args, cwd });
    if (command === 'npm') installExpo(dir);
  });
  assert.deepEqual(calls, [
    { command: 'npm', args: ['ci', '--include=dev', '--registry=https://registry.npmjs.org', '--no-audit', '--no-fund'], cwd: dir },
    { command: process.execPath, args: [path.join(dir, 'node_modules/expo/bin/cli'), 'prebuild', '--no-install', '--platform', 'ios'], cwd: dir },
  ]);
});

test('failed or ineffective install cannot proceed to prebuild', (t) => {
  const dir = fixture(t);
  let calls = 0;
  assert.throws(() => build('prepare', dir, () => {
    calls++;
    throw new Error('install failed');
  }), /install failed/);
  assert.equal(calls, 1);
  assert.throws(() => build('prepare', dir, () => {}), /Local Expo is missing/);
});

test('export requires local dependencies and uses a production iOS export', (t) => {
  const dir = fixture(t);
  assert.throws(() => build('export', dir, () => assert.fail('must not export')), /Local Expo is missing/);
  installExpo(dir);
  build('export', dir, (command, args, cwd) => {
    assert.equal(command, process.execPath);
    assert.equal(cwd, dir);
    assert.deepEqual(args.slice(1), ['export', '--platform', 'ios', '--output-dir', 'dist/ios', '--max-workers', '2']);
  });
});

test('CLI anchors itself to the mobile root even when invoked from backend', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/mobile-build.js'), 'lock'], {
    cwd: path.join(root, 'backend'), encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.throws(() => checkLock(path.join(root, 'backend')), /root mobile project/);
});