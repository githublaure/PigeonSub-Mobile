import Constants from 'expo-constants';

/**
 * Base URL for the PigeonSub backend API.
 * Priority:
 *   1. EXPO_PUBLIC_API_BASE_URL env variable (set in mobile/.env)
 *   2. app.json extra.apiBaseUrl
 *   3. Empty string (causes a clear network error rather than a silent fallback)
 */
const extraApiUrl = (
  Constants.expoConfig?.extra as Record<string, string> | undefined
)?.apiBaseUrl;

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (extraApiUrl && extraApiUrl !== 'REPLACE_WITH_YOUR_BACKEND_URL'
    ? extraApiUrl
    : '');

if (!API_BASE_URL) {
  console.warn(
    '[PigeonSub] API_BASE_URL is not set. ' +
      'Create mobile/.env with EXPO_PUBLIC_API_BASE_URL=https://your-backend-url'
  );
}
