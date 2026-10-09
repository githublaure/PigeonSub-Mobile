'use strict';
const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requirePlus, sendAccessError } = require('../services/entitlements');
const { FREE_LIMIT, ACTIVE_SQL, LIMIT_MESSAGE, withUserLock, validateSubscription, activeIds, isActiveAfter } = require('../services/subscription-access');

const router = express.Router();
router.use(requireAuth);

function toRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    price: row.price,
    frequency: row.frequency,
    category: row.category,
    categoryColor: row.category_color,
    usageFrequency: row.usage_frequency,
    nextRenewal: row.next_renewal,
    safetyDate: row.safety_date,
    iconClass: row.icon_class,
    bgColor: row.bg_color,
    note: row.note,
    purchaseProofImage: row.purchase_proof_image,
    unsubscribeProofImage: row.unsubscribe_proof_image,
    rating: row.rating,
    isSuspect: row.is_suspect,
    isFlagged: row.is_flagged,
    useSafetyDate: row.use_safety_date,
    isActive: row.is_active !== false,
    isTrial: row.is_trial,
    trialEndsAt: row.trial_ends_at,
    purchaseDate: row.purchase_date,
    createdAt: row.created_at,
    cancelledEffectiveOn: row.cancelled_effective_on instanceof Date ? `${row.cancelled_effective_on.getFullYear()}-${String(row.cancelled_effective_on.getMonth() + 1).padStart(2, '0')}-${String(row.cancelled_effective_on.getDate()).padStart(2, '0')}` : row.cancelled_effective_on,
  };
}

// GET /api/subscriptions
router.get('/', async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  try {
    const q = includeArchived
      ? 'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC'
      : `SELECT * FROM subscriptions WHERE user_id = $1 AND ${ACTIVE_SQL} ORDER BY created_at DESC`;
    const { rows } = await pool.query(q, [req.user.id]);
    res.json(rows.map(toRow));
  } catch (err) {
    console.error('[subscriptions/list]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/subscriptions/upcoming/:days
router.get('/upcoming/:days', async (req, res) => {
  const days = parseInt(req.params.days, 10) || 7;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND ${ACTIVE_SQL}
         AND next_renewal BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2 || ' days')::INTERVAL
       ORDER BY next_renewal ASC`,
      [req.user.id, days]
    );
    res.json(rows.map(toRow));
  } catch (err) {
    console.error('[subscriptions/upcoming]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/subscriptions/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Subscription not found' });
    res.json(toRow(rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function insertSubscription(client, userId, b) {
  const { rows } = await client.query(
      `INSERT INTO subscriptions
        (user_id, name, price, frequency, category, category_color, usage_frequency,
         next_renewal, safety_date, icon_class, bg_color, note,
         purchase_proof_image, unsubscribe_proof_image, rating,
         is_suspect, is_flagged, use_safety_date, is_active, is_trial,
         trial_ends_at, purchase_date, cancelled_effective_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [
        userId, b.name, b.price, b.frequency, b.category,
        b.categoryColor ?? '#7C3AED', b.usageFrequency ?? 'used',
        b.nextRenewal ?? null, b.safetyDate ?? null,
        b.iconClass ?? null, b.bgColor ?? null, b.note ?? null,
        b.purchaseProofImage ?? null, b.unsubscribeProofImage ?? null,
        b.rating ?? null,
        b.isSuspect ?? false, b.isFlagged ?? false, b.useSafetyDate ?? false,
        b.isActive ?? true, b.isTrial ?? false,
        b.trialEndsAt ?? null, b.purchaseDate ?? null, b.cancelledEffectiveOn ?? null,
      ]
    );
  return toRow(rows[0]);
}

// POST /api/subscriptions: all old clients also receive the server quota.
router.post('/', async (req, res) => {
  const b = req.body || {};
  try {
    validateSubscription(b);
    const result = await withUserLock(pool, req.user.id, async client => {
      if (await isActiveAfter(client, null, b)) {
        if ((await activeIds(client, req.user.id)).length >= FREE_LIMIT)
          await requirePlus(req.user.id, 'PLUS_LIMIT', LIMIT_MESSAGE);
      }
      return insertSubscription(client, req.user.id, b);
    });
    res.status(201).json(result);
  } catch (err) {
    if (sendAccessError(res, err)) return;
    console.error('[subscriptions/create]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Atomic Premium batch. There is deliberately no fallback to unprotected POSTs.
router.post('/import', async (req, res) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length < 2 || items.length > 50)
      return res.status(400).json({ error: 'Sélectionnez de 2 à 50 abonnements.' });
    items.forEach(b => validateSubscription(b));
    const result = await withUserLock(pool, req.user.id, async client => {
      await requirePlus(req.user.id, 'PLUS_IMPORT', 'PLUS_IMPORT: L’import groupé nécessite PigeonSub Plus.');
      const saved = [];
      for (const item of items) {
        // Retrying after a lost response must not duplicate an import. Re-check
        // inside the account lock, including duplicates within this same batch.
        const { rows } = await client.query(`SELECT * FROM subscriptions
          WHERE user_id = $1 AND lower(trim(name)) = lower(trim($2))
            AND price = $3 AND frequency = $4 AND next_renewal IS NOT DISTINCT FROM $5::date
          ORDER BY id LIMIT 1`, [req.user.id, item.name, item.price, item.frequency, item.nextRenewal ?? null]);
        saved.push(rows.length ? toRow(rows[0]) : await insertSubscription(client, req.user.id, item));
      }
      return saved;
    });
    res.status(201).json(result);
  } catch (err) {
    if (sendAccessError(res, err)) return;
    console.error('[subscriptions/import]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/subscriptions/:id
router.put('/:id', async (req, res) => {
  const b = req.body || {};
  try {
    validateSubscription(b, true);
    const result = await withUserLock(pool, req.user.id, async client => {
      const { rows: existing } = await client.query(
        'SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
      if (!existing.length) return null;
      const cur = existing[0];
      const ids = await activeIds(client, req.user.id);
      if (!ids.includes(cur.id) && await isActiveAfter(client, cur, b) && ids.length >= FREE_LIMIT)
        await requirePlus(req.user.id, 'PLUS_LIMIT', LIMIT_MESSAGE);
      const day = value => value instanceof Date ? value.toISOString().slice(0, 10) : value;
      const safetyChanged = ('safetyDate' in b && b.safetyDate !== day(cur.safety_date)) ||
        ('useSafetyDate' in b && b.useSafetyDate !== cur.use_safety_date);
      // Carrying an existing safety offset when an observed trial becomes paid is
      // still free. Changing the offset/flag is customization and remains gated.
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
      const firstPayment = Math.max(Date.parse(cur.trial_ends_at), Date.parse(cur.next_renewal) || 0);
      const preservedOffset = cur.is_trial && b.isTrial === false &&
        day(cur.trial_ends_at) < today && firstPayment <= Date.parse(today) &&
        Date.parse(b.nextRenewal) === firstPayment &&
        (!('trialEndsAt' in b) || b.trialEndsAt === day(cur.trial_ends_at)) &&
        (b.useSafetyDate ?? cur.use_safety_date) === cur.use_safety_date &&
        b.nextRenewal && cur.trial_ends_at && cur.safety_date && b.safetyDate &&
        Date.parse(b.nextRenewal) - Date.parse(b.safetyDate) === Date.parse(cur.trial_ends_at) - Date.parse(cur.safety_date);
      const removingSafety = b.useSafetyDate === false && (b.safetyDate == null || b.safetyDate === day(cur.safety_date));
      if (safetyChanged && !removingSafety && !preservedOffset && !ids.slice(0, FREE_LIMIT).includes(cur.id))
        await requirePlus(req.user.id, 'PLUS_SAFETY', 'PLUS_LIMIT: Les dates de sûreté sont incluses pour vos 5 abonnements gratuits.');
      const { rows } = await client.query(
        `UPDATE subscriptions SET
          name = $1, price = $2, frequency = $3, category = $4,
          category_color = $5, usage_frequency = $6, next_renewal = $7,
          safety_date = $8, icon_class = $9, bg_color = $10, note = $11,
          purchase_proof_image = $12, unsubscribe_proof_image = $13,
          rating = $14, is_suspect = $15, is_flagged = $16,
          use_safety_date = $17, is_active = $18, is_trial = $19,
          trial_ends_at = $20, purchase_date = $21, cancelled_effective_on = $24
         WHERE id = $22 AND user_id = $23 RETURNING *`,
        [
          b.name ?? cur.name, b.price ?? cur.price,
          b.frequency ?? cur.frequency, b.category ?? cur.category,
          b.categoryColor ?? cur.category_color, b.usageFrequency ?? cur.usage_frequency,
          'nextRenewal' in b ? (b.nextRenewal ?? null) : cur.next_renewal,
          'safetyDate' in b ? (b.safetyDate ?? null) : cur.safety_date,
          'iconClass' in b ? (b.iconClass ?? null) : cur.icon_class,
          'bgColor' in b ? (b.bgColor ?? null) : cur.bg_color,
          'note' in b ? (b.note ?? null) : cur.note,
          'purchaseProofImage' in b ? (b.purchaseProofImage ?? null) : cur.purchase_proof_image,
          'unsubscribeProofImage' in b ? (b.unsubscribeProofImage ?? null) : cur.unsubscribe_proof_image,
          'rating' in b ? (b.rating ?? null) : cur.rating,
          b.isSuspect ?? cur.is_suspect, b.isFlagged ?? cur.is_flagged,
          b.useSafetyDate ?? cur.use_safety_date, b.isActive ?? cur.is_active,
          b.isTrial ?? cur.is_trial,
          'trialEndsAt' in b ? (b.trialEndsAt ?? null) : cur.trial_ends_at,
          'purchaseDate' in b ? (b.purchaseDate ?? null) : cur.purchase_date,
          req.params.id, req.user.id,
          'cancelledEffectiveOn' in b ? (b.cancelledEffectiveOn ?? null) : cur.cancelled_effective_on,
        ]
      );
      return toRow(rows[0]);
    });
    if (!result) return res.status(404).json({ error: 'Subscription not found' });
    res.json(result);
  } catch (err) {
    if (sendAccessError(res, err)) return;
    console.error('[subscriptions/update]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await withUserLock(pool, req.user.id, client => client.query(
      'DELETE FROM subscriptions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    ));
    if (!rowCount) return res.status(404).json({ error: 'Subscription not found' });
    res.status(204).end();
  } catch (err) {
    if (sendAccessError(res, err)) return;
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
