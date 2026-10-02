'use strict';
const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function ensureSettings(userId) {
  await pool.query(
    'INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [userId]
  );
}

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    await ensureSettings(req.user.id);
    const { rows } = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
    const s = rows[0];
    res.json({
      budgetCap: s.budget_cap !== null ? String(s.budget_cap) : null,
      monthlyOverrides: s.monthly_overrides || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/budget
router.put('/budget', async (req, res) => {
  const { budgetCap } = req.body || {};
  if (budgetCap === undefined) return res.status(400).json({ error: 'budgetCap required' });
  try {
    await ensureSettings(req.user.id);
    await pool.query(
      'UPDATE user_settings SET budget_cap = $1, updated_at = NOW() WHERE user_id = $2',
      [budgetCap, req.user.id]
    );
    res.json({ budgetCap: String(budgetCap) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/settings/monthly-overrides
router.patch('/monthly-overrides', async (req, res) => {
  const { monthlyOverrides } = req.body || {};
  if (!monthlyOverrides || typeof monthlyOverrides !== 'object')
    return res.status(400).json({ error: 'monthlyOverrides object required' });
  try {
    await ensureSettings(req.user.id);
    await pool.query(
      'UPDATE user_settings SET monthly_overrides = $1::jsonb, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(monthlyOverrides), req.user.id]
    );
    const stringified = Object.fromEntries(Object.entries(monthlyOverrides).map(([k, v]) => [k, String(v)]));
    res.json({ monthlyOverrides: stringified });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/settings/budgets
router.get('/budgets', async (req, res) => {
  const { start, months } = req.query;
  const numMonths = parseInt(months, 10) || 12;
  try {
    await ensureSettings(req.user.id);
    const { rows } = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
    const s = rows[0];
    const overrides = s.monthly_overrides || {};
    const defaultBudget = s.budget_cap !== null ? Number(s.budget_cap) : null;

    const startDate = start ? new Date(start + '-01') : new Date();
    startDate.setDate(1);
    const monthlyBudgets = [];
    const monthKeys = [];
    for (let i = 0; i < numMonths; i++) {
      const d = new Date(startDate);
      d.setMonth(startDate.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.push(key);
      if (overrides[key] !== undefined) {
        monthlyBudgets.push({ month: key, amount: Number(overrides[key]) });
      }
    }
    res.json({ defaultBudget, months: monthKeys, monthlyBudgets });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/budgets
router.put('/budgets', async (req, res) => {
  const { budgets, defaultBudget } = req.body || {};
  try {
    await ensureSettings(req.user.id);
    const { rows } = await pool.query('SELECT monthly_overrides FROM user_settings WHERE user_id = $1', [req.user.id]);
    let overrides = rows[0]?.monthly_overrides || {};
    if (Array.isArray(budgets)) {
      for (const b of budgets) overrides[b.month] = b.amount;
    }
    await pool.query(
      'UPDATE user_settings SET budget_cap = $1, monthly_overrides = $2::jsonb, updated_at = NOW() WHERE user_id = $3',
      [defaultBudget ?? null, JSON.stringify(overrides), req.user.id]
    );
    const monthlyBudgets = Object.entries(overrides).map(([month, amount]) => ({ month, amount: Number(amount) }));
    res.json({ success: true, defaultBudget: defaultBudget ?? null, monthlyBudgets });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
