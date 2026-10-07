import { assertIconChangeAllowed, saveSubscriptionIcon, type IconDraft } from '../../../../src/lib/subscription-icons';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { saveFormPhotos } from '../../../../src/lib/form-photos';
import type { PendingPhoto } from '../../../../src/lib/subscription-photos';
import { getDataSession } from '../../../../src/lib/local-data';
import { useSubscriptionData } from '../../../../src/hooks/useSubscriptionData';
import { useBilling } from '../../../../src/contexts/BillingContext';
import { canCustomizeSubscription } from '../../../../src/lib/subscription-math';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  dateFieldToIso,
  isoToDateField,
  SubscriptionForm,
  SubscriptionFormValues,
} from '../../../../src/components/forms/SubscriptionForm';
import { ErrorState } from '../../../../src/components/ui/ErrorState';
import { LoadingScreen } from '../../../../src/components/ui/LoadingScreen';
import { Subscription, subscriptions } from '../../../../src/lib/api';

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { scope } = useAuth();
  const close = () => router.canGoBack() ? router.back() : router.replace(`/(tabs)/subscriptions/${id}`);
  const { canUsePlus } = useBilling();
  const { data, follow } = useSubscriptionData();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await subscriptions.get(Number(id));
      setSub(data);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (values: SubscriptionFormValues, photos: PendingPhoto[], icon: IconDraft) => {
    if (getDataSession().scope !== scope) throw new Error('La session a changé.');
    assertIconChangeAllowed(scope, icon);
    const updated = await subscriptions.update(Number(id), {
      name: values.name,
      price: values.price,
      frequency: values.frequency,
      category: values.category,
      categoryColor: values.categoryColor || sub?.categoryColor || '#7C3AED',
      usageFrequency: values.usageFrequency,
      nextRenewal: dateFieldToIso(values.nextRenewal),
      isTrial: values.isTrial,
      trialEndsAt: values.isTrial ? dateFieldToIso(values.trialEndsAt) : null,
      useSafetyDate: values.useSafetyDate,
      safetyDate: values.useSafetyDate
        ? dateFieldToIso(values.safetyDate)
        : null,
      purchaseDate: dateFieldToIso(values.purchaseDate),
      rating: values.rating ?? null,
      note: values.note || null,
      isActive: values.isActive,
      isFlagged: values.isFlagged,
    });
    try { await saveSubscriptionIcon(scope, updated.id, icon); }
    catch (e) { throw new Error(`Abonnement enregistré, icône non enregistrée. ${e instanceof Error ? e.message : 'Réessayez.'} Vous pouvez réessayer ici.`); }
    await saveFormPhotos(scope, updated, photos);
    close();
  };

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!sub) return <LoadingScreen />;

  // Map existing subscription to form default values
  const defaultValues: Partial<SubscriptionFormValues> = {
    name: sub.name,
    price: sub.price,
    frequency: sub.frequency as SubscriptionFormValues['frequency'],
    category: sub.category,
    categoryColor: sub.categoryColor ?? '',
    usageFrequency:
      (sub.usageFrequency as SubscriptionFormValues['usageFrequency']) ??
      'used',
    nextRenewal: isoToDateField(sub.nextRenewal),
    isTrial: sub.isTrial,
    trialEndsAt: isoToDateField(sub.trialEndsAt),
    useSafetyDate: sub.useSafetyDate,
    safetyDate: isoToDateField(sub.safetyDate),
    purchaseDate: isoToDateField(sub.purchaseDate),
    rating: sub.rating ?? null,
    note: sub.note ?? '',
    isActive: sub.isActive,
    isFlagged: sub.isFlagged,
  };

  return (
    <SubscriptionForm
      title="Modifier l’abonnement"
      submitLabel="Enregistrer"
      defaultValues={defaultValues}
      photoSub={sub}
      premiumCustomization={!canCustomizeSubscription(sub, data, false, follow)}
      safetyEditable={canCustomizeSubscription(sub, data, canUsePlus, follow)}
      onSubmit={handleSubmit}
      onCancel={close}
    />
  );
}
