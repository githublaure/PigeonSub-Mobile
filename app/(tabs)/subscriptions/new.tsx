import { useRouter } from 'expo-router';
import React from 'react';
import {
  dateFieldToIso,
  SubscriptionForm,
  SubscriptionFormValues,
} from '../../../src/components/forms/SubscriptionForm';
import { subscriptions } from '../../../src/lib/api';

export default function NewSubscriptionScreen() {
  const router = useRouter();

  const handleSubmit = async (values: SubscriptionFormValues) => {
    const created = await subscriptions.create({
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
      safetyDate: values.useSafetyDate ? dateFieldToIso(values.safetyDate) : null,
      purchaseDate: dateFieldToIso(values.purchaseDate),
      rating: values.rating ?? null,
      note: values.note || null,
      isActive: values.isActive,
      isFlagged: values.isFlagged,
    });
    router.replace(`/(tabs)/subscriptions/${created.id}`);
  };

  return (
    <SubscriptionForm
      title="New subscription"
      submitLabel="Create subscription"
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
