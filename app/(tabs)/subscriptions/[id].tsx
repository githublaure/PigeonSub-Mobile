import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Text, View } from 'react-native';
import { useSubscriptionData } from '../../../src/hooks/useSubscriptionData';
import { subscriptions } from '../../../src/lib/api';
import { categoryLabels, usageLabels } from '../../../src/lib/labels';
import {
  euro,
  frequencyLabels,
  isEnded,
  canCustomizeSubscription,
} from '../../../src/lib/subscription-math';
import { TrialStatus } from '../../../src/components/TrialStatus';
import { DecisionActions } from '../../../src/components/DecisionActions';
import {
  CancellationPanel,
  SafetyPanel,
} from '../../../src/components/SubscriptionFollowUp';
import { Page, useUI } from '../../../src/components/ui/Page';
import { Button } from '../../../src/components/ui/Button';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { useBilling } from '../../../src/contexts/BillingContext';
import { SubscriptionProofPreview } from '../../../src/components/SubscriptionProofPreview';
export default function SubscriptionScreen() {
  const ui = useUI();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { canUsePlus } = useBilling();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  const sub = data.find((s) => s.id === Number(id));
  if (loading) return <LoadingScreen />;
  if (error || !sub)
    return (
      <ErrorState
        message={error || 'Abonnement introuvable.'}
        onRetry={reload}
      />
    );
  const remove = () =>
    Alert.alert(
      'Supprimer cet abonnement ?',
      'Ses informations seront supprimées. Cela ne résilie pas votre contrat auprès du fournisseur.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await subscriptions.remove(sub.id);
              router.back();
            } catch (e) {
              Alert.alert(
                'Suppression impossible',
                e instanceof Error ? e.message : 'Réessayez.',
              );
            }
          },
        },
      ],
    );
  return (
    <Page
      title={sub.name}
      subtitle={`${categoryLabels[sub.category] ?? sub.category} · ${usageLabels[sub.usageFrequency] ?? sub.usageFrequency}`}
    >
      <Button title="Retour" variant="ghost" onPress={() => router.back()} />
      <View style={ui.card}>
        <Text style={ui.value}>{euro(Number(sub.price))}</Text>
        <Text style={ui.body}>
          {sub.frequency === 'lifetime'
            ? 'Achat unique'
            : `Par ${frequencyLabels[sub.frequency] ?? sub.frequency}`}
          {sub.isTrial ? ' · tarif après essai' : ''}
        </Text>
        {isEnded(sub, follow[sub.id]) && (
          <Text style={ui.small}>Terminé ou archivé</Text>
        )}
        <TrialStatus key={sub.id} sub={sub} follow={follow[sub.id]} detail />
        <DecisionActions inDetail sub={sub} follow={follow[sub.id]} />
      </View>
      <SubscriptionProofPreview sub={sub} />
      <CancellationPanel sub={sub} follow={follow[sub.id]} />
      <SafetyPanel
        key={sub.id}
        sub={sub}
        follow={follow[sub.id]}
        editable={canCustomizeSubscription(sub, data, canUsePlus, follow)}
        premium={!canCustomizeSubscription(sub, data, false, follow)}
      />
      {!!sub.note && (
        <View style={ui.card}>
          <Text style={ui.heading}>Vos notes</Text>
          <Text style={ui.body}>{sub.note}</Text>
        </View>
      )}
      <Button
        title="Modifier l’abonnement"
        variant="secondary"
        onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}/edit`)}
      />
      <Button title="Supprimer l’abonnement" variant="ghost" onPress={remove} />
    </Page>
  );
}
