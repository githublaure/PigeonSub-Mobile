'use strict';
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getAccess, sendAccessError } = require('../services/entitlements');
const router = express.Router();
router.use(requireAuth);
router.get('/entitlements', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    res.json({ ...(await getAccess(req.user.id)), freeLimit: 5 });
  } catch (error) {
    if (!sendAccessError(res, error)) res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;
