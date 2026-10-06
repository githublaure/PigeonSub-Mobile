#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function checkLock(root) {
  const manifest = readJson(path.join(root, 'package.json'));
  const lock = readJson(path.join(root, 'package-lock.json'));
  if (manifest.name !== 'pigeonsub-mobile' || !manifest.dependencies?.expo) {
    throw new Error('Expected the root mobile project, not backend/.');
  }
  const expo = lock.packages?.['node_modules/expo'];
  if (!expo?.version?.startsWith('57.') ||
      manifest.dependencies.expo !== lock.packages[''].dependencies.expo) {
    throw new Error('Expected locked Expo SDK 57 and matching mobile manifests.');
  }
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!name) continue;
    let url;
    try { url = new URL(entry.resolved); } catch { /* rejected below */ }
    if (!url || url.protocol !== 'https:' || url.hostname !== 'registry.npmjs.org' ||
        url.port || url.username || url.password || !entry.integrity) {
      throw new Error(`Non-portable mobile dependency: ${name}; require public npm HTTPS URL and integrity.`);
    }
  }
  return expo.version;
}

function preflight(root) {
  const expected = checkLock(root);
  // Absolute paths deliberately disallow ancestor/global/npx cache resolution.
  const expoRoot = path.join(root, 'node_modules', 'expo');
  const packageFile = path.join(expoRoot, 'package.json');
  if (!fs.existsSync(packageFile)) {
    throw new Error('Local Expo is missing. Run npm run mobile:prepare:ios at the repository root to install mobile dependencies.');
  }
  const installed = readJson(packageFile);
  if (installed.version !== expected) {
    throw new Error(`Local Expo ${installed.version} does not match locked Expo ${expected}. Run npm ci --include=dev at the mobile root.`);
  }
  const cli = path.join(expoRoot, 'bin', 'cli');
  if (!fs.existsSync(cli)) throw new Error('Local Expo CLI is missing; reinstall mobile dependencies.');
  console.log(`Mobile preflight: local Expo ${installed.version} (SDK 57) at ${expoRoot}`);
  return cli;
}

function run(command, args, root) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, CI: '1' },
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (${result.error?.message || result.signal || result.status}); mobile build stopped.`);
  }
}

function build(mode, root = projectRoot, execute = run) {
  if (!['check', 'prepare', 'export', 'lock'].includes(mode)) {
    throw new Error('Usage: node scripts/mobile-build.js <check|prepare|export|lock>');
  }
  checkLock(root);
  if (mode === 'lock') return;
  if (mode === 'prepare') {
    execute('npm', ['ci', '--include=dev', '--registry=https://registry.npmjs.org', '--no-audit', '--no-fund'], root);
  }
  const cli = preflight(root);
  if (mode === 'prepare') {
    execute(process.execPath, [cli, 'prebuild', '--no-install', '--platform', 'ios'], root);
  } else if (mode === 'export') {
    execute(process.execPath, [cli, 'export', '--platform', 'ios', '--output-dir', 'dist/ios', '--max-workers', '2'], root);
  }
}

if (require.main === module) {
  try {
    build(process.argv[2]);
  } catch (error) {
    console.error(`Mobile build error: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { checkLock, preflight, build };