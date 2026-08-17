const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { buildApiUrl } = require('../src/lib/api-url');

test('registration URL matches the Express POST /api/auth/register route', () => {
  assert.equal(
    buildApiUrl('https://backend.example.com', '/auth/register'),
    'https://backend.example.com/api/auth/register'
  );
  assert.equal(
    buildApiUrl('https://backend.example.com/api/', '/auth/register'),
    'https://backend.example.com/api/auth/register'
  );

  const server = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf8');
  const authRoutes = fs.readFileSync(path.join(__dirname, '../backend/routes/auth.js'), 'utf8');
  assert.match(server, /app\.use\(['"]\/api\/auth['"],\s*require\(['"]\.\/routes\/auth['"]\)\)/);
  assert.match(authRoutes, /router\.post\(['"]\/register['"]/);
});
