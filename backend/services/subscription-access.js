'use strict';
const { AccessError } = require('./entitlements');
const FREE_LIMIT = 5;
// A confirmed cancellation frees a slot on its effective calendar day in Paris.
// Trials (even overdue) and lifetime entries occupy a slot while active.
const ACTIVE_SQL = "is_active IS NOT FALSE AND (cancelled_effective_on IS NULL OR cancelled_effective_on > (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date)";
const LIMIT_MESSAGE = 'PLUS_LIMIT: La version gratuite permet 5 abonnements actifs, essais compris.';

async function withUserLock(pool, userId, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // A row exists even for a user with zero subscriptions. All create/update/
    // delete/import paths take this same lock, across processes and devices.
    const { rows } = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!rows.length) throw new AccessError(401, 'INVALID_ACCOUNT', 'Reconnectez votre compte.');
    const value = await work(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

function validateSubscription(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AccessError(400, 'INVALID_SUBSCRIPTION', 'Abonnement invalide.');
  for (const field of ['isActive', 'isTrial', 'isSuspect', 'isFlagged', 'useSafetyDate']) {
    if (field in body && typeof body[field] !== 'boolean') throw new AccessError(400, 'INVALID_BOOLEAN', `${field} doit être un booléen.`);
  }
  for (const field of ['name', 'category']) {
    if ((!partial || field in body) && (typeof body[field] !== 'string' || !body[field].trim() || body[field].length > (field === 'name' ? 255 : 100)))
      throw new AccessError(400, 'INVALID_SUBSCRIPTION', `${field} requis.`);
  }
  if ((!partial || 'frequency' in body) && !['weekly', 'monthly', 'yearly', 'lifetime'].includes(body.frequency))
    throw new AccessError(400, 'INVALID_SUBSCRIPTION', 'Fréquence invalide.');
  if ((!partial || 'price' in body) && (!['string', 'number'].includes(typeof body.price) || String(body.price).trim() === '' || !Number.isFinite(Number(body.price)) || Number(body.price) < 0 || Number(body.price) > 99999999.99))
    throw new AccessError(400, 'INVALID_SUBSCRIPTION', 'Prix invalide.');
  for (const field of ['nextRenewal', 'safetyDate', 'trialEndsAt', 'purchaseDate', 'cancelledEffectiveOn']) {
    const value = body[field];
    if (value != null && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value))
      throw new AccessError(400, 'INVALID_DATE', `${field} : date invalide.`);
  }
}

async function activeIds(client, userId) {
  return (await client.query(`SELECT id FROM subscriptions WHERE user_id = $1 AND ${ACTIVE_SQL} ORDER BY created_at ASC, id ASC`, [userId])).rows.map(r => r.id);
}

async function isActiveAfter(client, current, body) {
  const active = body.isActive ?? current?.is_active ?? true;
  const end = Object.hasOwn(body, 'cancelledEffectiveOn') ? body.cancelledEffectiveOn : current?.cancelled_effective_on;
  const { rows } = await client.query("SELECT ($1::boolean AND ($2::date IS NULL OR $2::date > (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Paris')::date)) AS active", [active, end ?? null]);
  return rows[0].active;
}

module.exports = { FREE_LIMIT, ACTIVE_SQL, LIMIT_MESSAGE, withUserLock, validateSubscription, activeIds, isActiveAfter };
