export const DarkColors = {
  primary: '#7C3AED', // violet-600
  primaryLight: '#EDE9FE', // violet-100
  primaryDark: '#5B21B6', // violet-800

  background: '#0F0A1E', // dark purple-black
  surface: '#1C1433', // card background
  surfaceRaised: '#261D42', // elevated surface

  text: '#F5F3FF', // primary text (violet-50)
  textSecondary: '#A78BFA', // muted text (violet-400)
  textMuted: '#AAA0C8', // very muted

  border: '#3B2D6E', // border colour
  divider: '#2D2152', // divider

  savingsBackground: '#102C25',
  savingsText: '#72E4B0',
  savingsBorder: '#285646',
  archiveBackground: '#24242A',
  archiveText: '#B6B6C0',
  archiveBorder: '#414148',
  warningSurface: '#2D2000',
  success: '#10B981', // emerald-500
  warning: '#F59E0B', // amber-500
  danger: '#EF4444', // red-500
  info: '#3B82F6', // blue-500

  // Category accent colours
  categories: {
    entertainment: '#EC4899',
    music: '#8B5CF6',
    productivity: '#3B82F6',
    gaming: '#10B981',
    news: '#F59E0B',
    health: '#EF4444',
    education: '#06B6D4',
    finance: '#84CC16',
    other: '#6B7280',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type Palette = {
  [K in keyof typeof DarkColors]: K extends 'categories'
    ? typeof DarkColors.categories
    : string;
};
export const LightColors: Palette = {
  ...DarkColors,
  background: '#FAF8FF',
  surface: '#FFFFFF',
  surfaceRaised: '#F0EBFA',
  text: '#211535',
  textSecondary: '#635174',
  textMuted: '#746281',
  border: '#D6CCE5',
  divider: '#E7DFEF',
  success: '#047857',
  warning: '#92400E',
  savingsBackground: '#ECF8F0',
  savingsText: '#116B46',
  savingsBorder: '#BDDDCB',
  archiveBackground: '#EFEFF2',
  archiveText: '#666671',
  archiveBorder: '#D1D1D9',
  warningSurface: '#FFF4D6',
  danger: '#B91C1C',
  info: '#1D4ED8',
};
export type ColorKey = keyof Palette;
