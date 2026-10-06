import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { useAuth } from './AuthContext';
import { setPlusAccess } from '../lib/entitlements-state';
import { getDataSession } from '../lib/local-data';

interface BillingValue {
  isPlus: boolean;
  canUsePlus: boolean;
  ready: boolean;
  loading: boolean;
  error: string;
  packages: PurchasesPackage[];
  trialEligible: Record<string, boolean>;
  purchase: (item: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
  retry: () => void;
}
const BillingContext = createContext<BillingValue | null>(null);
let billingQueue: Promise<unknown> = Promise.resolve();
const sdk = () =>
  require('react-native-purchases')
    .default as typeof import('react-native-purchases').default;
const active = (info: CustomerInfo) => !!info.entitlements.active.plus;
export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { mode, scope, user, isLoading: authLoading } = useAuth();
  const [isPlus, setIsPlus] = useState(false);
  const [accessScope, setAccessScope] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [trialEligible, setTrialEligible] = useState<Record<string, boolean>>(
    {},
  );
  const accept = useCallback(
    (info: CustomerInfo) => {
      if (getDataSession().scope !== scope) return;
      setAccessScope(scope);
      setIsPlus(active(info));
      setPlusAccess(active(info), scope);
    },
    [scope],
  );
  const refresh = useCallback(async () => {
    if (!ready || mode === 'demo') return;
    try {
      accept(await sdk().getCustomerInfo());
    } catch {
      /* Preserve verified SDK cache during transient outages. */
    }
  }, [ready, mode, accept]);
  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;
    setLoading(false);
    setReady(false);
    setIsPlus(false);
    setPlusAccess(false, scope);
    setPackages([]);
    setTrialEligible({});
    setError('');
    if (authLoading || mode === 'none' || mode === 'demo') return;
    const apiKey =
      Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
    if (
      Platform.OS === 'web' ||
      Constants.executionEnvironment === 'storeClient' ||
      !apiKey
    ) {
      setError(
        'Les achats ne sont pas encore disponibles dans cette version. Vous pouvez continuer gratuitement.',
      );
      return;
    }
    if (mode === 'account' && !user) {
      setError('Reconnectez votre compte pour vérifier votre offre Plus.');
      return;
    }
    setLoading(true);
    const setup = async () => {
      try {
        if (cancelled) return;
        const Purchases = sdk();
        const guestId = await AsyncStorage.getItem('pigeonsub.billingGuestId');
        const target =
          mode === 'account' ? `pigeonsub_user_${user!.id}` : guestId;
        if (!(await Purchases.isConfigured()))
          Purchases.configure({
            apiKey,
            ...(target ? { appUserID: target } : {}),
          });
        else if (target) await Purchases.logIn(target);
        else if (!(await Purchases.isAnonymous())) await Purchases.logOut();
        if (mode === 'guest' && !guestId)
          await AsyncStorage.setItem(
            'pigeonsub.billingGuestId',
            await Purchases.getAppUserID(),
          );
        if (cancelled) return;
        const listener = (info: CustomerInfo) => {
          if (!cancelled) accept(info);
        };
        Purchases.addCustomerInfoUpdateListener(listener);
        removeListener = () =>
          Purchases.removeCustomerInfoUpdateListener(listener);
        accept(await Purchases.getCustomerInfo());
        if (!cancelled) setReady(true);
        const offerings = await Purchases.getOfferings();
        const available =
          offerings.current?.availablePackages.filter((p) =>
            ['MONTHLY', 'ANNUAL', 'LIFETIME'].includes(p.packageType),
          ) ?? [];
        if (!cancelled) setPackages(available);
        if (Platform.OS === 'ios' && available.length) {
          const eligibility =
            await Purchases.checkTrialOrIntroductoryPriceEligibility(
              available.map((p) => p.product.identifier),
            );
          if (!cancelled)
            setTrialEligible(
              Object.fromEntries(
                Object.entries(eligibility).map(([id, value]) => [
                  id,
                  value.status === 2,
                ]),
              ),
            );
        }
        if (!available.length && !cancelled)
          setError(
            'Aucune offre disponible pour le moment. Réessayez plus tard ou continuez gratuitement.',
          );
      } catch {
        if (!cancelled)
          setError(
            'Impossible de joindre la boutique. Vérifiez votre connexion puis réessayez.',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    billingQueue = billingQueue.then(setup, setup);
    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [mode, scope, user?.id, authLoading, accept, attempt]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  const purchase = async (item: PurchasesPackage) => {
    if (!ready || mode === 'demo' || getDataSession().scope !== scope)
      throw new Error('Achats indisponibles.');
    const result = await sdk().purchasePackage(item);
    accept(result.customerInfo);
    return active(result.customerInfo);
  };
  const restore = async () => {
    if (!ready || mode === 'demo')
      throw new Error('Restauration indisponible dans cette version.');
    const info = await sdk().restorePurchases();
    accept(info);
    return active(info);
  };
  return (
    <BillingContext.Provider
      value={{
        isPlus: isPlus && accessScope === scope,
        canUsePlus: (isPlus && accessScope === scope) || mode === 'demo',
        ready,
        loading,
        error,
        packages,
        trialEligible,
        purchase,
        restore,
        refresh,
        retry: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}
export function useBilling() {
  const value = useContext(BillingContext);
  if (!value) throw new Error('BillingProvider missing');
  return value;
}
