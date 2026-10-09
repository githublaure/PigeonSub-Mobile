import type { SessionMode } from './local-data';

// The SDK is authoritative only for purchases in the local guest space.
// Connected accounts never fall back to a client claim on API errors.
export async function resolvePlusAccess(
  mode: SessionMode,
  sdkPlus: boolean,
  verify: () => Promise<{ isPlus: boolean }>,
): Promise<boolean> {
  if (mode === 'account') return (await verify()).isPlus === true;
  return mode === 'guest' && sdkPlus;
}
