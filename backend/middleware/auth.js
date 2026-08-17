'use strict';
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  console.error('[auth] FATAL: SESSION_SECRET is not set. Refusing to start with an insecure fallback.');
  process.exit(1);
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { requireAuth, signToken };
