'use strict';
const { AccessError } = require('./entitlements');
const DEFAULTS = new Set(['entertainment', 'music', 'productivity', 'design', 'cloud', 'gaming', 'news', 'health', 'education', 'finance', 'utilities', 'other']);

// Run inside the account lock shared by category deletion and subscription writes.
async function assertCategory(client, userId, category, previous) {
  const { rows } = await client.query('SELECT category_catalog FROM user_settings WHERE user_id = $1', [userId]);
  const catalog = rows[0]?.category_catalog || {};
  const hidden = Array.isArray(catalog.hidden) ? catalog.hidden : [];
  const custom = Array.isArray(catalog.custom) ? catalog.custom : [];
  if (!hidden.includes(category) && (DEFAULTS.has(category) || custom.some(row => row.id === category))) return;
  if (category === previous && !category.startsWith('custom_') && !hidden.includes(category)) return;
  throw new AccessError(409, 'CATEGORY_UNAVAILABLE', 'Cette catégorie a été supprimée ou n’existe pas dans votre espace. Choisissez une catégorie disponible.');
}
module.exports = { assertCategory };
