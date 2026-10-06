import { useTheme } from '../contexts/ThemeContext';
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
import { useUI } from './ui/Page';
export function DecisionActions({
  sub,
  follow = {},
  inDetail = false,
  highlightSavings = false,
}: {
  sub: Subscription;
  follow?: FollowUp;
  inDetail?: boolean;
  highlightSavings?: boolean;
}) {
  const ui = useUI();
  const { colors } = useTheme();

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
      {monthlyCost(sub) > 0 &&
        (highlightSavings ? (
          <View
            style={{
              backgroundColor: colors.savingsBackground,
              borderRadius: 12,
              padding: 12,
              gap: 3,
            }}
          >
            <Text
              style={{
                color: colors.savingsText,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {sub.isTrial
                ? 'Dépense évitable si l’essai est arrêté à temps'
                : 'Économie possible si résilié'}
            </Text>
            <Text
              style={{
                color: colors.savingsText,
                fontSize: 24,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}
            >
              {euro(monthlyCost(sub) * 12)}{' '}
              <Text style={{ fontSize: 14, fontWeight: '500' }}>/ an</Text>
            </Text>
          </View>
        ) : (
          <Text style={ui.body}>
            Jusqu’à {euro(monthlyCost(sub) * 12)} / an évitables
          </Text>
        ))}
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
              : sub.isTrial
                ? 'Arrêter l’essai'
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
