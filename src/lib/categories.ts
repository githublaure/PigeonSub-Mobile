import { categoryLabels } from './labels';

export const categoryIcons = {
  entertainment: 'tv-outline', music: 'musical-notes-outline', productivity: 'briefcase-outline',
  design: 'color-palette-outline', cloud: 'cloud-outline', gaming: 'game-controller-outline',
  news: 'newspaper-outline', health: 'fitness-outline', education: 'school-outline',
  finance: 'wallet-outline', utilities: 'home-outline', other: 'grid-outline',
} as const;
export type Category = keyof typeof categoryIcons;
export const iconChoices = [...Object.values(categoryIcons), 'film-outline', 'headset-outline', 'camera-outline', 'book-outline', 'heart-outline', 'airplane-outline', 'leaf-outline', 'restaurant-outline', 'cart-outline', 'sparkles-outline'] as const;
export type CategoryIconName = typeof iconChoices[number];
export type CategoryIconPreferences = Partial<Record<Category, CategoryIconName>>;
export function normalizeCategory(value?: string): Category {
  return value && Object.prototype.hasOwnProperty.call(categoryLabels, value) ? value as Category : 'other';
}
export function validCategoryIcons(value: CategoryIconPreferences): CategoryIconPreferences {
  return Object.fromEntries(Object.entries(value ?? {}).filter(([category, icon]) => Object.prototype.hasOwnProperty.call(categoryIcons, category) && (iconChoices as readonly string[]).includes(icon)));
}
