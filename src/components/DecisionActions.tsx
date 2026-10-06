import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { Subscription } from '../lib/api';
import { updateFollowUp } from '../lib/local-data';
import {
  type FollowUp,
  monthlyCost,
  euro,
  isEnded,
} from '../lib/subscription-math';
import { Button } from './ui/Button';
import { ui } from './ui/Page';
export function DecisionActions({
  sub,
  follow = {},
  inDetail = false,
}: {
  sub: Subscription;
  follow?: FollowUp;
  inDetail?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = async (decision: 'keep' | 'cancel_requested') => {
    setBusy(true);
    setError('');
    try {
      await updateFollowUp(sub.id, {
        decision,
        decidedAt: new Date().toISOString(),
        effectiveOn: undefined,
        confirmationNote: undefined,
      });
      if (decision === 'cancel_requested' && !inDetail)
        router.push(`/(tabs)/subscriptions/${sub.id}`);
    } catch {
      setError('La décision n’a pas été enregistrée. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  if (follow.decision === 'cancel_confirmed')
    return (
      <Text style={[ui.body, ui.success]}>
        Résiliation confirmée par vous · effet le{' '}
        {follow.effectiveOn?.split('-').reverse().join('/')}
      </Text>
    );
  if (isEnded(sub, follow))
    return <Text style={ui.small}>Abonnement archivé</Text>;
  return (
    <View style={{ gap: 10 }}>
      {monthlyCost(sub) > 0 && (
        <Text style={ui.body}>
          Jusqu’à {euro(monthlyCost(sub) * 12)} / an évitables
        </Text>
      )}
      {follow.decision === 'keep' && (
        <Text style={[ui.small, ui.success]}>
          Vous avez choisi de le conserver.
        </Text>
      )}
      {follow.decision === 'cancel_requested' && (
        <Text style={[ui.small, ui.warning]}>
          Démarche à terminer · économie encore potentielle
        </Text>
      )}
      <View style={ui.row}>
        <Button
          title="Conserver"
          variant="secondary"
          disabled={busy}
          onPress={() => void choose('keep')}
          style={{ flex: 1 }}
        />
        <Button
          title={
            follow.decision === 'cancel_requested'
              ? inDetail
                ? 'À confirmer ci-dessous'
                : 'Continuer'
              : 'Résilier'
          }
          loading={busy}
          disabled={inDetail && follow.decision === 'cancel_requested'}
          onPress={() => void choose('cancel_requested')}
          style={{ flex: 1 }}
        />
      </View>
      {error ? <Text style={ui.error}>{error}</Text> : null}
    </View>
  );
}
