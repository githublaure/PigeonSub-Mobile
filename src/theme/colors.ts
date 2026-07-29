export const Colors = {
  primary: '#7C3AED',        // violet-600
  primaryLight: '#EDE9FE',   // violet-100
  primaryDark: '#5B21B6',    // violet-800

  background: '#0F0A1E',     // dark purple-black
  surface: '#1C1433',        // card background
  surfaceRaised: '#261D42',  // elevated surface

  text: '#F5F3FF',           // primary text (violet-50)
  textSecondary: '#A78BFA',  // muted text (violet-400)
  textMuted: '#6D5FA6',      // very muted

  border: '#3B2D6E',         // border colour
  divider: '#2D2152',        // divider

  success: '#10B981',        // emerald-500
  warning: '#F59E0B',        // amber-500
  danger: '#EF4444',         // red-500
  info: '#3B82F6',           // blue-500

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

export type ColorKey = keyof typeof Colors;
