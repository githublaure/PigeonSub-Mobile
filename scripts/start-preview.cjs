#!/usr/bin/env node
const { preflight } = require('./mobile-build');
const path = require('node:path');

const mode = process.argv[2];
if (!['native', 'web'].includes(mode)) {
  console.error('Usage: node scripts/start-preview.cjs <native|web>');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const cli = preflight(root);
const port = mode === 'web' ? 8083 : 8081;
process.chdir(root);

// Expo 57's desktop debugger cannot run on the headless Replit host.
// Keep dependency, architecture and web prerequisites enabled: headless mode
// otherwise changes their defaults as well as disabling the desktop shell.
process.env.EXPO_UNSTABLE_HEADLESS = '1';
process.env.EXPO_NO_DEPENDENCY_VALIDATION = '0';
process.env.EXPO_NO_NEW_ARCH_COMPAT_CHECK = '0';
process.env.EXPO_NO_WEB_SETUP = '0';
process.env.BROWSER = 'none';

if (!process.env.EXPO_PUBLIC_API_BASE_URL && process.env.REPLIT_DEV_DOMAIN) {
  process.env.EXPO_PUBLIC_API_BASE_URL = `https://${process.env.REPLIT_DEV_DOMAIN}:3000/api`;
}

if (mode === 'web') {
  // A native Expo proxy inherited from the Shell must not redirect web assets
  // or hot reload to the native server on 8081.
  delete process.env.EXPO_PACKAGER_PROXY_URL;
  delete process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  if (process.env.REPLIT_DEV_DOMAIN) {
    process.env.EXPO_PACKAGER_PROXY_URL = `https://${process.env.REPLIT_DEV_DOMAIN}:3001`;
    console.log(`[PigeonSub] Ouvrir la preview web : ${process.env.EXPO_PACKAGER_PROXY_URL}`);
  }
  console.log('[PigeonSub] Preview web : ouvrir le port 8083 (port externe 3001) dans Preview, ou son lien dans un nouvel onglet.');
} else if (process.env.REPLIT_EXPO_DEV_DOMAIN) {
  process.env.EXPO_PACKAGER_PROXY_URL = `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`;
}

// Run the installed CLI in this process so Stop/Ctrl+C stops Metro itself.
// Keep caches between runs; pass --clear explicitly when troubleshooting.
process.argv = [process.execPath, cli, 'start', mode === 'web' ? '--web' : '--go',
  '--host', 'lan', '--port', String(port), '--max-workers', '2', ...process.argv.slice(3)];
require(cli);
