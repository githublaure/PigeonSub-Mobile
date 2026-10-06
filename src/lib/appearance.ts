export type ThemePreference = 'light' | 'dark';

/** Migrate an old automatic preference once; new installs start in light mode. */
export function resolveThemePreference(
  saved: string | null,
  systemScheme: string | null | undefined,
): ThemePreference {
  if (saved === 'light' || saved === 'dark') return saved;
  if (saved === 'system' && systemScheme === 'dark') return 'dark';
  return 'light';
}
