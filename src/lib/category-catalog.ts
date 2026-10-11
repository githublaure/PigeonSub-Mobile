import { categoryIcons, iconChoices, type CategoryIconName } from './categories';
import { categoryLabels } from './labels';

export type CategoryEntry = { id: string; name: string; icon: CategoryIconName | null };
export type CategoryCatalog = {
  custom: CategoryEntry[];
  overrides: Record<string, { name?: string; icon?: CategoryIconName | null }>;
  hidden: string[];
};
export const emptyCatalog = (): CategoryCatalog => ({ custom: [], overrides: {}, hidden: [] });
export const CATEGORY_DEFAULTS = Object.keys(categoryIcons);
export function categoryName(id: string | undefined, catalog: CategoryCatalog): string {
  if (!id) return 'Autre';
  return catalog.custom.find(row => row.id === id)?.name ??
    catalog.overrides[id]?.name ?? categoryLabels[id] ?? id;
}
export function categoryIcon(id: string, catalog: CategoryCatalog): CategoryIconName {
  return catalog.custom.find(row => row.id === id)?.icon ??
    catalog.overrides[id]?.icon ?? categoryIcons[id as keyof typeof categoryIcons] ?? 'grid-outline';
}
export function visibleCategories(catalog: CategoryCatalog, referenced: string[] = []): CategoryEntry[] {
  const ids = new Set(['other', ...catalog.custom.map(row => row.id),
    ...referenced.filter(id => !!id && id !== 'all')]);
  return [...ids].filter(id => id === 'other' || !catalog.hidden.includes(id))
    .map(id => ({ id, name: categoryName(id, catalog), icon: categoryIcon(id, catalog) }));
}
export function validCategoryName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > 45 || /[\x00-\x1f\x7f]/.test(name)) throw new Error('Choisissez un nom de 1 à 45 caractères.');
  return name;
}
export function validCatalog(raw: unknown): CategoryCatalog {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyCatalog();
  const value = raw as Partial<CategoryCatalog>;
  const custom = Array.isArray(value.custom) ? value.custom.filter(row =>
    row && typeof row.id === 'string' && /^custom_[a-zA-Z0-9-]+$/.test(row.id) &&
    typeof row.name === 'string' && row.name.length > 0 &&
    (row.icon == null || (iconChoices as readonly string[]).includes(row.icon))) : [];
  const hidden = Array.isArray(value.hidden) ? value.hidden.filter(id =>
    id !== 'other' && typeof id === 'string' && CATEGORY_DEFAULTS.includes(id)) : [];
  const overrides = Object.fromEntries(Object.entries(value.overrides || {}).filter(([id, row]) =>
    CATEGORY_DEFAULTS.includes(id) && row && typeof row === 'object' &&
    (!row.icon || (iconChoices as readonly string[]).includes(row.icon))));
  return { custom, hidden, overrides };
}
