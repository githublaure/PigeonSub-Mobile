'use strict';
const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function toMonthly(price, frequency) {
  const p = parseFloat(price) || 0;
  switch ((frequency || '').toLowerCase()) {
    case 'weekly':      return p * 52 / 12;
    case 'biweekly':    return p * 26 / 12;
    case 'monthly':     return p;
    case 'quarterly':   return p / 3;
    case 'biannual':
    case 'semiannual':  return p / 6;
    case 'annual':
    case 'yearly':      return p / 12;
    default:            return p;
  }
}

// GET /api/stats
router.get('/', async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  try {
    const q = includeArchived
      ? 'SELECT * FROM subscriptions WHERE user_id = $1'
      : 'SELECT * FROM subscriptions WHERE user_id = $1 AND is_active = TRUE';
    const { rows: subs } = await pool.query(q, [req.user.id]);

    const { rows: settingsRows } = await pool.query(
      'SELECT budget_cap FROM user_settings WHERE user_id = $1', [req.user.id]
    );
    const budgetCap = settingsRows[0]?.budget_cap ? Number(settingsRows[0].budget_cap) : 0;

    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400 * 1000);
    const in30 = new Date(now.getTime() + 30 * 86400 * 1000);

    let totalMonthlyCost = 0;
    let suspectMonthly = 0;
    let upcomingRenewals = 0;
    let trialsEnding = 0;
    let trialCount = 0;
    const categoryTotals = {};
    const usageBreakdown = { very_used: 0, used: 0, rarely_used: 0 };

    for (const s of subs) {
      const monthly = toMonthly(s.price, s.frequency);
      totalMonthlyCost += monthly;

      if (s.is_suspect) suspectMonthly += monthly;

      if (s.next_renewal) {
        const nr = new Date(s.next_renewal);
        if (nr >= now && nr <= in7) upcomingRenewals++;
      }

      if (s.is_trial) {
        trialCount++;
        if (s.trial_ends_at) {
          const te = new Date(s.trial_ends_at);
          if (te >= now && te <= in30) trialsEnding++;
        }
      }

      const cat = s.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + monthly;

      const usage = s.usage_frequency || 'used';
      if (usage in usageBreakdown) usageBreakdown[usage]++;
      else usageBreakdown[usage] = (usageBreakdown[usage] || 0) + 1;
    }

    const suspectCount = subs.filter(s => s.is_suspect).length;
    const wastedEstimate = suspectMonthly * 0.5;
    const budgetGap = budgetCap > 0 ? budgetCap - totalMonthlyCost : 0;

    res.json({
      totalMonthlyCost: totalMonthlyCost.toFixed(2),
      activeSubscriptions: subs.filter(s => s.is_active).length,
      upcomingRenewals,
      trialsEnding,
      trialCount,
      suspectMonthly: suspectMonthly.toFixed(2),
      wastedEstimate: wastedEstimate.toFixed(2),
      budgetCap,
      budgetGap: budgetGap.toFixed(2),
      suspectCount,
      categoryTotals,
      usageBreakdown,
    });
  } catch (err) {
    console.error('[stats]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
