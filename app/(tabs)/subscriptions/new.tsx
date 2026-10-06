import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
  dateFieldToIso,
  SubscriptionForm,
  SubscriptionFormValues,
} from '../../../src/components/forms/SubscriptionForm';
import { subscriptions, type Subscription } from '../../../src/lib/api';

import { useAuth } from '../../../src/contexts/AuthContext';
import { saveFormPhotos } from '../../../src/lib/form-photos';
import type { PendingPhoto } from '../../../src/lib/subscription-photos';
import { getDataSession } from '../../../src/lib/local-data';
import { useSubscriptionData } from '../../../src/hooks/useSubscriptionData';
import { canAddSubscription } from '../../../src/lib/subscription-math';

export default function NewSubscriptionScreen() {
  const router = useRouter();
  const { scope } = useAuth();
  const saved = useRef<Subscription | null>(null);
  const { data, follow } = useSubscriptionData();
  const { trial } = useLocalSearchParams<{ trial?: string }>();

  const handleSubmit = async (values: SubscriptionFormValues, photos: PendingPhoto[]) => {
    if (getDataSession().scope !== scope) throw new Error('La session a changé.');
    const payload = {
      name: values.name,
      price: values.price,
      frequency: values.frequency,
      category: values.category,
      categoryColor: values.categoryColor || '#7C3AED',
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
    };
    const created = saved.current
      ? await subscriptions.update(saved.current.id, payload)
      : await subscriptions.create(payload);
    saved.current = created;
    await saveFormPhotos(scope, created, photos);
    router.replace(`/(tabs)/subscriptions/${created.id}`);
  };

  return (
    <SubscriptionForm
      title={trial === '1' ? 'Nouvel essai gratuit' : 'Nouvel abonnement'}
      defaultValues={{ isTrial: trial === '1' }}
      submitLabel="Ajouter cet abonnement"
      premiumCustomization={!canAddSubscription(data, false, follow)}
      onSubmit={handleSubmit}
      onCancel={() => saved.current ? router.replace(`/(tabs)/subscriptions/${saved.current.id}`) : router.back()}
    />
  );
}
