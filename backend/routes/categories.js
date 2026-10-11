'use strict';
const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { withUserLock } = require('../services/subscription-access');

const router = express.Router();
router.use(requireAuth);

// Old category identifiers remain stable so existing subscriptions, trials,
// coupons, charts and exports keep their meaning after an app upgrade.
const BASE = {
  entertainment: 'Divertissement', music: 'Musique',
  productivity: 'Productivité', design: 'Création', cloud: 'Stockage',
  gaming: 'Jeux', news: 'Presse', health: 'Santé & sport',
  education: 'Formation', finance: 'Finance', utilities: 'Services',
  other: 'Autre',
};
const ICONS = new Set([
  'tv-outline','musical-notes-outline','briefcase-outline',
  'color-palette-outline','cloud-outline','game-controller-outline',
  'newspaper-outline','fitness-outline','school-outline','wallet-outline',
  'home-outline','grid-outline','film-outline','headset-outline','camera-outline',
  'book-outline','heart-outline','airplane-outline','leaf-outline',
  'restaurant-outline','cart-outline','sparkles-outline',
]);
const empty = () => ({ custom: [], overrides: {}, hidden: [] });
const normalize = name => typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
function bad(res, message, status = 400) {
  return res.status(status).json({ error: message });
}
function validateName(value) {
  const name = normalize(value);
  return name.length >= 1 && name.length <= 45 && !/[\x00-\x1f\x7f]/.test(name) ? name : null;
}
function validIcon(icon) {
  return icon === null || (typeof icon === 'string' && ICONS.has(icon));
}
function load(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty();
  return {
    custom: Array.isArray(raw.custom) ? raw.custom : [],
    overrides: raw.overrides && typeof raw.overrides === 'object' && !Array.isArray(raw.overrides)
      ? raw.overrides : {},
    hidden: Array.isArray(raw.hidden) ? raw.hidden : [],
  };
}
function isCustom(catalog, id) { return catalog.custom.some(row => row.id === id); }
function categoryExists(catalog, id) {
  return Object.hasOwn(BASE, id) || isCustom(catalog, id);
}
function duplicate(catalog, name, except) {
  const target = name.toLocaleLowerCase('fr');
  const candidates = [
    ...catalog.custom.map(row => ({ id: row.id, name: row.name })),
    ...Object.entries(catalog.overrides)
      .filter(([id, row]) => !catalog.hidden.includes(id) && typeof row?.name === 'string')
      .map(([id, row]) => ({ id, name: row.name })),
    { id: 'other', name: catalog.overrides.other?.name || 'Autre' },
  ];
  return candidates.some(row => row.id !== except && row.name.toLocaleLowerCase('fr') === target);
}
async function ensure(client, userId) {
  await client.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
}
async function change(userId, apply) {
  return withUserLock(pool, userId, async client => {
    await ensure(client, userId);
    const { rows } = await client.query(
      'SELECT category_catalog FROM user_settings WHERE user_id = $1 FOR UPDATE', [userId]);
    const catalog = load(rows[0]?.category_catalog);
    const result = await apply(catalog, client);
    await client.query(
      'UPDATE user_settings SET category_catalog = $1::jsonb, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(catalog), userId],
    );
    return result;
  });
}
function fail(res, error) {
  if (error?.categoryError) return bad(res, error.message, error.status || 400);
  console.error('[categories]', error.message);
  return res.status(500).json({ error: 'Impossible de modifier les catégories.' });
}
function rejected(message, status = 400) {
  const error = new Error(message); error.categoryError = true; error.status = status; throw error;
}
router.get('/', async (req, res) => {
  try {
    await pool.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [req.user.id]);
    const { rows } = await pool.query('SELECT category_catalog FROM user_settings WHERE user_id = $1', [req.user.id]);
    res.set('Cache-Control', 'no-store').json(load(rows[0]?.category_catalog));
  } catch (error) { fail(res, error); }
});
router.post('/', async (req, res) => {
  const name = validateName(req.body?.name);
  const icon = req.body?.icon ?? 'grid-outline';
  if (!name || !validIcon(icon)) return bad(res, 'Nom (1 à 45 caractères) ou icône invalide.');
  try {
    const created = await change(req.user.id, catalog => {
      if (catalog.custom.length >= 60) rejected('Limite de 60 catégories personnalisées atteinte.');
      if (duplicate(catalog, name)) rejected('Une catégorie porte déjà ce nom.');
      const row = { id: `custom_${crypto.randomUUID()}`, name, icon };
      catalog.custom.push(row);
      return row;
    });
    res.status(201).json(created);
  } catch (error) { fail(res, error); }
});
router.patch('/:id', async (req, res) => {
  const id = req.params.id;
  const name = validateName(req.body?.name);
  const icon = req.body?.icon;
  if (!name || (icon !== undefined && !validIcon(icon))) return bad(res, 'Nom ou icône invalide.');
  try {
    const updated = await change(req.user.id, catalog => {
      if (!categoryExists(catalog, id)) rejected('Catégorie introuvable.', 404);
      if (catalog.hidden.includes(id)) rejected('Cette catégorie a été supprimée.', 404);
      if (duplicate(catalog, name, id)) rejected('Une catégorie porte déjà ce nom.');
      const custom = catalog.custom.find(row => row.id === id);
      if (custom) {
        custom.name = name;
        if (icon !== undefined) custom.icon = icon;
        return custom;
      }
      const row = { ...(catalog.overrides[id] || {}), name };
      if (icon !== undefined) row.icon = icon;
      catalog.overrides[id] = row;
      return { id, ...row };
    });
    res.json(updated);
  } catch (error) { fail(res, error); }
});
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  if (id === 'other') return bad(res, 'La catégorie Autre doit rester disponible.');
  try {
    const result = await change(req.user.id, async (catalog, client) => {
      if (!categoryExists(catalog, id)) rejected('Catégorie introuvable.', 404);
      // No subscription is deleted. Referential integrity is kept in the same
      // database transaction as the catalogue edit, under the user row lock.
      const migrated = await client.query(
        "UPDATE subscriptions SET category = 'other' WHERE user_id = $1 AND category = $2", [req.user.id, id]);
      catalog.custom = catalog.custom.filter(row => row.id !== id);
      if (Object.hasOwn(BASE, id) && !catalog.hidden.includes(id)) catalog.hidden.push(id);
      delete catalog.overrides[id];
      return { reassignedSubscriptions: migrated.rowCount || 0 };
    });
    res.json(result);
  } catch (error) { fail(res, error); }
});
module.exports = router;
