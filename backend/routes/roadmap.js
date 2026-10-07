'use strict';
const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const ids = new Set(require('../../shared/roadmap.json').map(feature => feature.id));
const router = express.Router();
router.use(requireAuth);
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT feature_id FROM roadmap_votes WHERE user_id = $1', [req.user.id]);
    res.json(rows.map(row => row.feature_id).filter(id => ids.has(id)));
  } catch { res.status(500).json({ error: 'Les votes sont momentanément indisponibles.' }); }
});
router.put('/:feature', async (req, res) => {
  if (!ids.has(req.params.feature) || typeof req.body?.interested !== 'boolean')
    return res.status(400).json({ error: 'Vote invalide.' });
  try {
    if (req.body.interested) await pool.query('INSERT INTO roadmap_votes (user_id, feature_id) VALUES ($1, $2) ON CONFLICT (user_id, feature_id) DO NOTHING', [req.user.id, req.params.feature]);
    else await pool.query('DELETE FROM roadmap_votes WHERE user_id = $1 AND feature_id = $2', [req.user.id, req.params.feature]);
    res.json({ interested: req.body.interested });
  } catch { res.status(500).json({ error: 'Vote non enregistré. Réessayez.' }); }
});
module.exports = router;
