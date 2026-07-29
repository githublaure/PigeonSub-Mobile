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
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await subscriptions.get(Number(id));
      setSub(data);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load subscription');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (values: SubscriptionFormValues) => {
    await subscriptions.update(Number(id), {
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
      safetyDate: values.useSafetyDate ? dateFieldToIso(values.safetyDate) : null,
      purchaseDate: dateFieldToIso(values.purchaseDate),
      rating: values.rating ?? null,
      note: values.note || null,
      isActive: values.isActive,
      isFlagged: values.isFlagged,
    });
    router.back();
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
    usageFrequency: (sub.usageFrequency as SubscriptionFormValues['usageFrequency']) ?? 'used',
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
      title="Edit subscription"
      submitLabel="Save changes"
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
