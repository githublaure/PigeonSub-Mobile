import { CancellationLink } from './CancellationLink';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { subscriptions, type Subscription } from '../lib/api';
import {
  trialState,
  trialLabel,
  firstPayment,
  shortDate,
  euro,
  frequencyLabels,
  isEnded,
  dayKey,
  type FollowUp,
} from '../lib/subscription-math';
import { useUI } from './ui/Page';
import { Button } from './ui/Button';

export function TrialStatus({
  sub,
  follow = {},
  detail = false,
}: {
  sub: Subscription;
  follow?: FollowUp;
  detail?: boolean;
}) {
  const ui = useUI();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!sub.isTrial || isEnded(sub, follow)) return null;
  const state = trialState(sub);
  const payment = firstPayment(sub);
  const canConfirm =
    state === 'expired' && payment && dayKey(payment) <= dayKey(new Date());
  const convert = async () => {
    setBusy(true);
    setError('');
    try {
      await subscriptions.confirmTrialPaid(sub.id);
      setConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirmation impossible.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={[ui.label, state === 'active' ? ui.success : ui.warning]}>
        {trialLabel(sub)}
      </Text>
      <Text style={ui.body}>
        {state === 'active'
          ? '0 € pendant l’essai, puis '
          : 'Tarif prévu après essai : '}
        {euro(Number(sub.price.replace(',', '.')))} /{' '}
        {frequencyLabels[sub.frequency] ?? sub.frequency}
      </Text>
      <Text style={ui.small}>
        Premier prélèvement prévu : {shortDate(payment)} · si vous conservez le
        service.
      </Text>
      {state !== 'active' && (
        <Text style={ui.small}>
          Le passage payant n’est pas confirmé. Ce montant est exclu du coût
          actuel jusqu’à votre confirmation.
        </Text>
      )}
      {detail && state === 'missing_date' && (
        <Button
          title="Renseigner la fin de l’essai"
          variant="secondary"
          onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}/edit`)}
        />
      )}
      {detail &&
        canConfirm &&
        follow.decision !== 'cancel_confirmed' &&
        (confirm ? (
          <>
            <Text style={ui.body}>
              Avez-vous vérifié que le service est devenu payant au tarif
              indiqué ? Cela l’intégrera à votre coût actuel. Aucune résiliation
              en cours ne sera annulée.
            </Text>
            <Button
              title="Oui, confirmer le passage payant"
              loading={busy}
              onPress={() => void convert()}
            />
            <Button
              title="Pas maintenant"
              variant="ghost"
              disabled={busy}
              onPress={() => setConfirm(false)}
            />
          </>
        ) : (
          <Button
            title="Le service est devenu payant"
            variant="secondary"
            onPress={() => setConfirm(true)}
          />
        ))}
      {detail && (
        <CancellationLink id={sub.id} saved={follow.cancellationUrl} />
      )}
      {error ? <Text style={ui.error}>{error}</Text> : null}
    </View>
  );
}
