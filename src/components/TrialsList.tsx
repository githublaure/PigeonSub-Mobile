import { PlusBadge } from './ui/PlusBadge';
import React, { useState } from 'react';
import { CategoryBadge, CategoryFilters } from './CategoryFilters';
import { normalizeCategory } from '../lib/categories';
import { SubscriptionIcon } from './ui/SubscriptionIcon';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscriptionData } from '../hooks/useSubscriptionData';
import { useBilling } from '../contexts/BillingContext';
import {
  canAddSubscription,
  deadlines,
  isEnded,
  shortDate,
} from '../lib/subscription-math';
import { TrialStatus } from './TrialStatus';
import { DecisionActions } from './DecisionActions';
import { Button } from './ui/Button';
import { useUI } from './ui/Page';
import { LoadingScreen } from './ui/LoadingScreen';
import { ErrorState } from './ui/ErrorState';
export function TrialsList() {
  const ui = useUI();
  const router = useRouter();
  const { canUsePlus } = useBilling();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  const [category, setCategory] = useState('all');
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const trials = data
    .filter((s) => s.isTrial && !isEnded(s, follow[s.id]))
    .sort((a, b) => (a.trialEndsAt ?? '').localeCompare(b.trialEndsAt ?? ''));
  return (
    <View style={{ gap: 16 }}>
      <Text style={ui.heading}>Décidez avant le premier prélèvement.</Text>
      <View style={ui.row}><Text style={ui.small}>5 abonnements et essais gratuits · illimités avec Plus</Text><PlusBadge /></View>
      <Button
        title="Ajouter un essai gratuit"
        onPress={() =>
          router.push(
            canAddSubscription(data, canUsePlus, follow)
              ? '/(tabs)/subscriptions/new?trial=1'
              : '/(tabs)/premium?reason=limit',
          )
        }
      />
      <CategoryFilters value={category} onChange={setCategory} categories={trials.map(s => s.category)} />
      {!!trials.length && !trials.some(s => category === 'all' || normalizeCategory(s.category) === category) && <Text style={ui.body}>Aucun essai dans cette catégorie.</Text>}
      {!trials.length && (
        <Text style={ui.body}>
          Aucun essai à suivre. Ajoutez sa date de fin et le tarif prévu après
          la période gratuite.
        </Text>
      )}
      {trials.filter(s => category === 'all' || normalizeCategory(s.category) === category).map((sub) => (
        <View key={sub.id} style={ui.card}>
          <View style={ui.row}><SubscriptionIcon id={sub.id} name={sub.name} /><Text style={[ui.heading, { flex: 1 }]}>{sub.name}</Text></View>
          <CategoryBadge category={sub.category} />
          <TrialStatus sub={sub} follow={follow[sub.id]} />
          <Text style={ui.small}>
            Date de sûreté : {shortDate(deadlines(sub, follow[sub.id]).safety)}
          </Text>
          <Button
            title="Voir l’essai et régler son rappel"
            variant="secondary"
            onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
          />
          <DecisionActions sub={sub} follow={follow[sub.id]} />
        </View>
      ))}
    </View>
  );
}
