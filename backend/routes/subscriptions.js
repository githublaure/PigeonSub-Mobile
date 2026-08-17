'use strict';
const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

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
    isActive: row.is_active,
    isTrial: row.is_trial,
    trialEndsAt: row.trial_ends_at,
    purchaseDate: row.purchase_date,
    createdAt: row.created_at,
  };
}

// GET /api/subscriptions
router.get('/', async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  try {
    const q = includeArchived
      ? 'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM subscriptions WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC';
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
       WHERE user_id = $1 AND is_active = TRUE
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

// POST /api/subscriptions
router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.price || !b.frequency || !b.category)
    return res.status(400).json({ error: 'name, price, frequency, category required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO subscriptions
        (user_id, name, price, frequency, category, category_color, usage_frequency,
         next_renewal, safety_date, icon_class, bg_color, note,
         purchase_proof_image, unsubscribe_proof_image, rating,
         is_suspect, is_flagged, use_safety_date, is_active, is_trial,
         trial_ends_at, purchase_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        req.user.id, b.name, b.price, b.frequency, b.category,
        b.categoryColor ?? '#7C3AED', b.usageFrequency ?? 'used',
        b.nextRenewal ?? null, b.safetyDate ?? null,
        b.iconClass ?? null, b.bgColor ?? null, b.note ?? null,
        b.purchaseProofImage ?? null, b.unsubscribeProofImage ?? null,
        b.rating ?? null,
        b.isSuspect ?? false, b.isFlagged ?? false, b.useSafetyDate ?? false,
        b.isActive ?? true, b.isTrial ?? false,
        b.trialEndsAt ?? null, b.purchaseDate ?? null,
      ]
    );
    res.status(201).json(toRow(rows[0]));
  } catch (err) {
    console.error('[subscriptions/create]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/subscriptions/:id
router.put('/:id', async (req, res) => {
  const b = req.body || {};
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Subscription not found' });
    const cur = existing[0];
    const { rows } = await pool.query(
      `UPDATE subscriptions SET
        name = $1, price = $2, frequency = $3, category = $4,
        category_color = $5, usage_frequency = $6, next_renewal = $7,
        safety_date = $8, icon_class = $9, bg_color = $10, note = $11,
        purchase_proof_image = $12, unsubscribe_proof_image = $13,
        rating = $14, is_suspect = $15, is_flagged = $16,
        use_safety_date = $17, is_active = $18, is_trial = $19,
        trial_ends_at = $20, purchase_date = $21
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
      ]
    );
    res.json(toRow(rows[0]));
  } catch (err) {
    console.error('[subscriptions/update]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM subscriptions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Subscription not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
