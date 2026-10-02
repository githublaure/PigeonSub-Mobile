const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { buildApiUrl, stripQueryForLog } = require('../src/lib/api-url');

const origin = 'https://backend.example.com';
const authPaths = ['/auth/login', '/auth/register'];
const baseUrls = [origin, `${origin}/`, `${origin}/api`, `${origin}/api/`];

test('login and register URLs contain exactly one /api prefix', () => {
  for (const baseUrl of baseUrls) {
    for (const authPath of authPaths) {
      assert.equal(buildApiUrl(baseUrl, authPath), `${origin}/api${authPath}`);
    }
  }
});

test('login and register share the tested URL builder and POST method', () => {
  const apiClient = fs.readFileSync(path.join(__dirname, '../src/lib/api.ts'), 'utf8');

  assert.match(apiClient, /const requestUrl = buildApiUrl\(API_BASE_URL, path\)/);
  assert.match(apiClient, /login:[\s\S]*?apiFetch<AuthResponse>\(['"]\/auth\/login['"][\s\S]*?method: ['"]POST['"]/);
  assert.match(apiClient, /register:[\s\S]*?apiFetch<AuthResponse>\(['"]\/auth\/register['"][\s\S]*?method: ['"]POST['"]/);
});

test('Expo reads the API base URL statically and has no development-server fallback', () => {
  const config = fs.readFileSync(path.join(__dirname, '../src/lib/config.ts'), 'utf8');
  const runtimeSources = [
    config,
    fs.readFileSync(path.join(__dirname, '../src/lib/api.ts'), 'utf8'),
    fs.readFileSync(path.join(__dirname, '../src/contexts/AuthContext.tsx'), 'utf8'),
    fs.readFileSync(path.join(__dirname, '../app/(auth)/login.tsx'), 'utf8'),
    fs.readFileSync(path.join(__dirname, '../app/(auth)/register.tsx'), 'utf8'),
  ].join('\n');

  assert.equal((config.match(/process\.env\.EXPO_PUBLIC_API_BASE_URL/g) || []).length, 1);
  assert.doesNotMatch(config, /process\.env\[['"]EXPO_PUBLIC_API_BASE_URL['"]\]/);
  assert.doesNotMatch(config, /\{[^}]*EXPO_PUBLIC_API_BASE_URL[^}]*\}\s*=\s*process\.env/);
  assert.doesNotMatch(runtimeSources, /localhost|replit\.dev|PigeonSubscription/i);
});

test('development diagnostics strip queries before logging', () => {
  assert.equal(
    stripQueryForLog(`${origin}/api/auth/login?email=private@example.com`),
    `${origin}/api/auth/login`
  );
});

test('Express exposes matching login and register POST routes', () => {

  const server = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');
  const authRoutes = fs.readFileSync(path.join(__dirname, '../backend/routes/auth.js'), 'utf8');
  assert.match(server, /app\.use\(['"]\/api\/auth['"],\s*require\(['"]\.\/routes\/auth['"]\)\)/);
  assert.match(authRoutes, /router\.post\(['"]\/login['"]/);
  assert.match(authRoutes, /router\.post\(['"]\/register['"]/);
});
