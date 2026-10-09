'use strict';

class AccessError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const unavailable = () => new AccessError(503, 'BILLING_UNAVAILABLE',
  'La vérification de Plus est temporairement indisponible. Réessayez ; vos données sont conservées.');

// Keep the existing SDK identity. Never accept an appUserId, entitlement,
// environment, receipt or isPlus flag from the caller as authorization.
function revenueCatUserId(userId) {
  if (!Number.isSafeInteger(userId) || userId < 1)
    throw new AccessError(401, 'INVALID_ACCOUNT', 'Reconnectez votre compte.');
  return `pigeonsub_user_${userId}`;
}

function evaluateCustomer(body, { now = Date.now(), allowSandbox = false } = {}) {
  const subscriber = body?.subscriber;
  if (!subscriber || !subscriber.entitlements || typeof subscriber.entitlements !== 'object') throw unavailable();
  const entitlement = subscriber.entitlements.plus;
  if (!entitlement) return { isPlus: false, expiresAt: null };
  if (!entitlement.product_identifier || !Object.hasOwn(entitlement, 'expires_date')) throw unavailable();
  const expiry = entitlement.expires_date === null ? Infinity : Date.parse(entitlement.expires_date);
  const grace = entitlement.grace_period_expires_date == null ? 0 : Date.parse(entitlement.grace_period_expires_date);
  if (Number.isNaN(expiry) || Number.isNaN(grace)) throw unavailable();
  const until = Math.max(expiry, grace);
  if (until <= now) return { isPlus: false, expiresAt: null };

  const product = entitlement.product_identifier;
  const subscription = subscriber.subscriptions?.[product];
  // Match the purchase that actually supplies the entitlement, including lifetime.
  // Older production transactions must not authorize a newer sandbox grant.
  const purchases = subscription ? [subscription] : subscriber.non_subscriptions?.[product];
  if (!Array.isArray(purchases)) throw unavailable();
  const purchase = purchases.find(p => p.purchase_date === entitlement.purchase_date);
  if (!purchase || typeof purchase.is_sandbox !== 'boolean') throw unavailable();
  if (purchase.refunded_at || (purchase.is_sandbox && !allowSandbox))
    return { isPlus: false, expiresAt: null };
  return { isPlus: true, expiresAt: until === Infinity ? null : new Date(until).toISOString() };
}

function createEntitlementService({ fetchImpl = globalThis.fetch, env = process.env, now = Date.now } = {}) {
  async function getAccess(userId) {
    const appUserId = revenueCatUserId(userId);
    const key = env.REVENUECAT_SECRET_API_KEY;
    if (!key || !key.startsWith('sk_')) throw unavailable();
    // No stale positive cache: expiry/refund changes are checked on each protected
    // operation. Only read requests are made. No grants, purchases or transfers.
    try {
      const response = await fetchImpl(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw unavailable();
      return evaluateCustomer(await response.json(), {
        now: now(),
        allowSandbox: (env.REVENUECAT_SANDBOX_USER_IDS || '').split(',').map(id => id.trim()).includes(String(userId)),
      });
    } catch (error) {
      if (error instanceof AccessError) throw error;
      throw unavailable();
    }
  }
  async function requirePlus(userId, code = 'PLUS_REQUIRED', message = 'Cette fonction nécessite PigeonSub Plus.') {
    if (!(await getAccess(userId)).isPlus) throw new AccessError(403, code, message);
  }
  return { getAccess, requirePlus };
}

function sendAccessError(res, error) {
  if (!(error instanceof AccessError)) return false;
  res.status(error.status).json({ error: error.message, code: error.code });
  return true;
}

module.exports = { AccessError, evaluateCustomer, revenueCatUserId, createEntitlementService, sendAccessError, ...createEntitlementService() };
