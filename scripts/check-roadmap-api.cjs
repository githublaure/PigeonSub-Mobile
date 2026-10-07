// Real HTTP/router checks with an isolated database boundary. No external writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const express = require('../backend/node_modules/express');
const votes = new Map();
const db = { query: async (sql, args) => {
  assert(sql.includes('$1'), 'all queries bind the authenticated user');
  const [user, feature] = args;
  const rows = votes.get(user) || new Set();
  if (sql.startsWith('INSERT')) rows.add(feature);
  if (sql.startsWith('DELETE')) rows.delete(feature);
  votes.set(user, rows);
  return { rows: [...rows].map(feature_id => ({ feature_id })) };
} };
const moduleMock = { exports: {} };
vm.runInThisContext('(function(require,module,exports){' + fs.readFileSync('backend/routes/roadmap.js', 'utf8') + '\n})')(
  name => ({ express, '../db': db, '../middleware/auth': { requireAuth: (req, res, next) => { const id = Number(req.headers['x-test-user']); if (!id) return res.sendStatus(401); req.user = { id }; next(); } }, '../../shared/roadmap.json': require('../shared/roadmap.json') })[name], moduleMock, moduleMock.exports);
const app = express(); app.use(express.json()); app.use('/api/roadmap', moduleMock.exports);
const server = app.listen(0, '127.0.0.1', async () => {
  try {
    const origin = 'http://127.0.0.1:' + server.address().port + '/api/roadmap';
    const request = (path = '', user = 1, body) => fetch(origin + path, { method: body ? 'PUT' : 'GET', headers: { 'content-type': 'application/json', ...(user ? { 'x-test-user': String(user) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal((await request('', null)).status, 401);
    assert.equal((await request('/image-import', 1, { interested: true })).status, 200);
    await request('/image-import', 1, { interested: true });
    assert.deepEqual(await (await request()).json(), ['image-import']);
    assert.deepEqual(await (await request('', 2)).json(), []);
    await request('/image-import', 2, { interested: false });
    assert.deepEqual(await (await request()).json(), ['image-import']);
    assert.equal((await request('/unknown', 1, { interested: true })).status, 400);
    assert.equal((await request('/image-import', 1, { interested: 'yes' })).status, 400);
    await request('/image-import', 1, { interested: false });
    assert.deepEqual(await (await request()).json(), []);
    console.log('PASS: roadmap authenticated route, idempotent votes, account isolation, removal and validation. Database mocked.');
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally { server.close(); }
});
