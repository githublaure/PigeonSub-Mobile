import { GuideAnchor } from './guide/GuideScrollView';
import { PlusBadge } from './ui/PlusBadge';
import { useTheme } from '../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Switch, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useBilling } from '../contexts/BillingContext';
import { subscriptions, type Subscription } from '../lib/api';
import { getFollowUps, updateFollowUp } from '../lib/local-data';
import { askReminderPermission, syncReminders } from '../lib/notifications';
import {
  canAddSubscription,
  dayKey,
  deadlines,
  euro,
  isEnded,
  monthlyCost,
  parseDay,
  shortDate,
  type FollowUp,
} from '../lib/subscription-math';
import { DatePickerField } from './forms/DatePickerField';
import { Button } from './ui/Button';
import { useUI } from './ui/Page';

export function SafetyPanel({
  sub,
  follow = {},
  editable = true,
  premium = false,
}: {
  sub: Subscription;
  follow?: FollowUp;
  editable?: boolean;
  premium?: boolean;
}) {
  const { colors: Colors } = useTheme();
  const ui = useUI();

  const router = useRouter();
  const { mode } = useAuth();
  const [notice, setNotice] = useState(String(follow.noticeDays ?? 0));
  const [lead, setLead] = useState(String(follow.leadDays ?? 1));
  useEffect(() => {
    setNotice(String(follow.noticeDays ?? 0));
    setLead(String(follow.leadDays ?? 1));
  }, [follow.noticeDays, follow.leadDays]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dates = deadlines(sub, follow);
  const save = async (enabled = follow.reminderEnabled ?? false) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!editable && !enabled) {
        await updateFollowUp(sub.id, { reminderEnabled: false });
        if (mode !== 'demo') await syncReminders();
        setMessage('Rappel désactivé.');
        return;
      }
      if (!editable)
        throw new Error(
          'Plus permet de personnaliser tous vos abonnements. Vos dates existantes sont conservées.',
        );
      if (
        !/^\d{1,3}$/.test(notice) ||
        Number(notice) > 365 ||
        !/^\d{1,3}$/.test(lead) ||
        Number(lead) < 1 ||
        Number(lead) > 365
      )
        throw new Error(
          'Saisissez un préavis de 0 à 365 jours et une avance de 1 à 365 jours.',
        );
      if (enabled && !dates.renewal)
        throw new Error(
          'Renseignez la prochaine échéance avant d’activer le rappel.',
        );
      if (enabled && mode !== 'demo' && !(await askReminderPermission()))
        throw new Error(
          'Autorisez les notifications de PigeonSub dans les réglages du téléphone pour recevoir vos rappels.',
        );
      await updateFollowUp(sub.id, {
        noticeDays: Number(notice),
        leadDays: Number(lead),
        advancedReminder: true,
        reminderEnabled: enabled,
      });
      if (mode !== 'demo') await syncReminders();
      setMessage(
        mode === 'demo'
          ? 'Simulation enregistrée. Aucune notification réelle.'
          : enabled
            ? 'Rappels enregistrés. Les dates déjà passées ne sont pas notifiées.'
            : 'Réglages enregistrés.',
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Impossible de programmer le rappel.',
      );
    } finally {
      setBusy(false);
    }
  };
  if (
    isEnded(sub, follow) ||
    follow.decision === 'cancel_confirmed' ||
    sub.frequency === 'lifetime'
  )
    return null;
  return (
    <View style={ui.card}>
      <View style={ui.row}><Text style={ui.heading}>Votre date de sûreté</Text>{premium && <PlusBadge reason="safety" />}</View>
      <Text style={[ui.small, { color: premium ? Colors.textSecondary : Colors.success, fontWeight: '600' }]}>{premium ? 'Gratuit sur 5 abonnements actifs · sur tous avec Plus' : 'Inclus gratuitement · date personnalisée et rappel'}</Text>
      <Text style={ui.body}>
        {sub.isTrial ? 'Fin de l’essai' : 'Prochain prélèvement'} :{' '}
        {shortDate(dates.renewal)}
      </Text>
      <Text style={ui.body}>
        Date limite contractuelle estimée : {shortDate(dates.actionBy)}
      </Text>
      <Text style={[ui.heading, { color: Colors.textSecondary }]}>
        Agir dès le {shortDate(dates.safety)}
      </Text>
      {dates.actionBy && dayKey(dates.actionBy) < dayKey(new Date()) && (
        <Text style={[ui.body, ui.warning]}>
          Le préavis renseigné est déjà dépassé. Vérifiez auprès du fournisseur
          si le prochain prélèvement peut encore être évité.
        </Text>
      )}
      <Text style={ui.small}>Préavis du contrat · jours</Text>
      <TextInput
        accessibilityLabel="Préavis en jours"
        value={notice}
        editable={editable}
        onChangeText={setNotice}
        keyboardType="number-pad"
        maxLength={3}
        style={ui.input}
      />
      {sub.useSafetyDate && sub.safetyDate ? (
        <>
          <Button
            title="Modifier ma date de sûreté"
            variant="secondary"
            onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}/edit`)}
          />
        </>
      ) : (
        <>
          <Text style={ui.body}>Avance du rappel · jours</Text>
          <TextInput
            accessibilityLabel="Avance du rappel en jours"
            value={lead}
            onChangeText={setLead}
            keyboardType="number-pad"
            maxLength={3}
            style={ui.input}
            editable={editable}
          />
        </>
      )}

      {!editable && (
        <Button
          title="Personnaliser tous mes abonnements avec Plus"
          variant="secondary"
          onPress={() => router.push('/(tabs)/premium?reason=safety')}
        />
      )}
      <Button
        title="Enregistrer ces dates"
        variant="secondary"
        loading={busy}
        disabled={!editable}
        onPress={() => void save()}
      />
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.body}>Rappel à 9 h</Text>
        <Switch
          accessibilityLabel="Recevoir un rappel pour cet abonnement"
          value={follow.reminderEnabled ?? false}
          disabled={busy || (!editable && !follow.reminderEnabled)}
          onValueChange={(value) => void save(value)}
          trackColor={{ true: Colors.primary }}
        />
      </View>

      {message ? <Text style={[ui.small, ui.success]}>{message}</Text> : null}
      {error ? <Text style={ui.error}>{error}</Text> : null}
      {error.includes('réglages') && (
        <Button
          title="Ouvrir les réglages"
          variant="ghost"
          onPress={() => void Linking.openSettings()}
        />
      )}
    </View>
  );
}
export function CancellationPanel({
  sub,
  follow = {},
}: {
  sub: Subscription;
  follow?: FollowUp;
}) {
  const { colors: Colors } = useTheme();
  const ui = useUI();

  const router = useRouter();
  const { canUsePlus } = useBilling();
  const [effective, setEffective] = useState(
    follow.effectiveOn ?? dayKey(new Date()),
  );
  const [note, setNote] = useState(follow.confirmationNote ?? '');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (confirmed: boolean) => {
    setBusy(true);
    setError('');
    try {
      if (confirmed && (!parseDay(effective) || !ack))
        throw new Error(
          'Renseignez une date valide et confirmez avoir terminé la démarche auprès du fournisseur.',
        );
      if (!confirmed && sub.isActive && isEnded(sub, follow)) {
        const all = await subscriptions.list(true);
        if (!canAddSubscription(all, canUsePlus, await getFollowUps())) {
          router.push('/(tabs)/premium?reason=limit');
          return;
        }
      }
      await updateFollowUp(sub.id, {
        decision: confirmed ? 'cancel_confirmed' : 'keep',
        decidedAt: new Date().toISOString(),
        effectiveOn: confirmed ? effective : undefined,
        confirmationNote: confirmed ? note.trim() : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };
  if (
    follow.decision !== 'cancel_requested' &&
    follow.decision !== 'cancel_confirmed'
  )
    return null;
  return (
    <View style={ui.card}>
      <Text style={ui.heading}>
        {follow.decision === 'cancel_confirmed'
          ? 'Votre confirmation de résiliation'
          : 'Terminer la résiliation'}
      </Text>
      <Text style={ui.body}>
        Économie annualisée estimée : {euro(monthlyCost(sub) * 12)}
      </Text>
      {follow.decision === 'cancel_requested' ? (
        <>
          <Text style={ui.body}>
            1. Ouvrez votre espace client chez {sub.name}, ou les abonnements
            Apple si vous avez souscrit via l’App Store.
          </Text>
          <Text style={ui.body}>
            {sub.isTrial
              ? '2. Demandez l’arrêt de l’essai avant sa date limite et vérifiez qu’aucun premier prélèvement n’est dû.'
              : '2. Demandez la résiliation et vérifiez le préavis ainsi que la date du dernier prélèvement.'}
          </Text>
          <Text style={ui.body}>
            3. Conservez la confirmation du fournisseur, puis renseignez la date
            de fin ci-dessous.
          </Text>
          <Button
            title="Ouvrir mes abonnements Apple"
            variant="secondary"
            onPress={() =>
              void Linking.openURL(
                'https://apps.apple.com/account/subscriptions',
              )
            }
          />
          <Text style={[ui.small, ui.warning]}>
            PigeonSub ne résilie pas à votre place. L’économie reste potentielle
            tant que vous n’avez pas confirmé la démarche.
          </Text>
          <DatePickerField
            label="Date de fin effective"
            value={effective}
            onChange={setEffective}
          />
          <Text style={ui.body}>Référence de confirmation (facultatif)</Text>
          <TextInput
            accessibilityLabel="Référence de confirmation"
            style={ui.input}
            value={note}
            onChangeText={setNote}
            placeholder="E-mail reçu, numéro de dossier…"
            placeholderTextColor={Colors.textMuted}
          />
          <View style={ui.row}>
            <Switch
              value={ack}
              onValueChange={setAck}
              accessibilityLabel="Le fournisseur a confirmé la résiliation"
            />
            <Text style={[ui.body, { flex: 1 }]}>
              Le fournisseur a confirmé ma résiliation et cette date de fin.
            </Text>
          </View>
          <Button
            title="Confirmer ma résiliation"
            disabled={!ack}
            loading={busy}
            onPress={() => void save(true)}
          />
        </>
      ) : (
        <>
          <Text style={[ui.body, ui.success]}>
            Confirmée par vous. Fin le{' '}
            {effective.split('-').reverse().join('/')}.
          </Text>
          <Text style={ui.small}>
            {follow.confirmationNote || 'Aucune référence ajoutée.'}
          </Text>
        </>
      )}
      <Button
        title="Je conserve finalement cet abonnement"
        variant="ghost"
        disabled={busy}
        onPress={() => void save(false)}
      />
      <Button
        title="Joindre une photo ou une preuve"
        variant="secondary"
        onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}/receipts`)}
      />
      {error ? <Text style={ui.error}>{error}</Text> : null}
    </View>
  );
}

export function DecisionHistory({ follow = {} }: { follow?: FollowUp }) {
  const ui = useUI();
  const router = useRouter();
  const { canUsePlus } = useBilling();
  return <GuideAnchor id="subscription-history"><View style={ui.card}>
      <View style={ui.row}><Text style={ui.heading}>Historique</Text><PlusBadge reason="history" /></View>
      {canUsePlus ? (
        <>
          {(follow.history ?? [])
            .slice()
            .reverse()
            .map((item, index) => (
              <Text key={index} style={ui.small}>
                {new Date(item.at).toLocaleDateString('fr-FR')} ·{' '}
                {
                  {
                    keep: 'Conservé',
                    cancel_requested: 'Résiliation envisagée',
                    cancel_confirmed: 'Résiliation confirmée',
                  }[item.decision]
                }
              </Text>
            ))}
        </>
      ) : (
        <Button
          title="Historique des résiliations avec Plus"
          variant="secondary"
          onPress={() => router.push('/(tabs)/premium?reason=history')}
        />
      )}
      {canUsePlus && !follow.history?.length && <Text style={ui.small}>Vos prochaines décisions apparaîtront ici.</Text>}
    </View></GuideAnchor>;
}
