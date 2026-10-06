import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useBilling } from '../../src/contexts/BillingContext';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { DecisionActions } from '../../src/components/DecisionActions';
import { Button } from '../../src/components/ui/Button';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { Page, ui } from '../../src/components/ui/Page';
import {
  canAddSubscription,
  dayKey,
  deadlines,
  euro,
  frequencyLabels,
  isEnded,
  overview,
  shortDate,
} from '../../src/lib/subscription-math';
import { Colors } from '../../src/theme/colors';
export default function HomeScreen() {
  const router = useRouter();
  const { mode, user, startGuest } = useAuth();
  const { canUsePlus } = useBilling();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const total = overview(data, follow);
  const upcoming = data
    .filter(
      (s) =>
        !isEnded(s, follow[s.id]) &&
        follow[s.id]?.decision !== 'cancel_confirmed',
    )
    .map((sub) => ({ sub, dates: deadlines(sub, follow[sub.id]) }))
    .sort(
      (a, b) =>
        ((a.dates.actionBy ?? a.dates.renewal)?.getTime() ?? Infinity) -
        ((b.dates.actionBy ?? b.dates.renewal)?.getTime() ?? Infinity),
    )
    .slice(0, 5);
  const add = () =>
    router.push(
      canAddSubscription(data, canUsePlus, follow)
        ? '/(tabs)/subscriptions/new'
        : '/(tabs)/premium?reason=limit',
    );
  return (
    <Page
      title={
        mode === 'demo'
          ? 'Bonjour Camille'
          : user?.name
            ? `Bonjour ${user.name}`
            : 'Vos abonnements'
      }
      subtitle="Décidez avant le prochain prélèvement."
    >
      {mode === 'demo' && (
        <View
          style={[
            ui.card,
            {
              borderColor: Colors.warning,
              padding: 8,
              gap: 6,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          ]}
        >
          <Text style={ui.label}>DÉMO FICTIVE</Text>
          <Button
            size="sm"
            variant="ghost"
            title="Mes abonnements"
            onPress={() => void startGuest()}
          />
        </View>
      )}
      <View
        style={[ui.card, { backgroundColor: '#261544', gap: 8, padding: 16 }]}
      >
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.label}>VOTRE COÛT MENSUEL</Text>
          <Image
            source={require('../../assets/mascots/pigeon-money-bag.png')}
            style={{ width: 32, height: 32 }}
          />
        </View>
        <Text style={ui.value}>{euro(total.monthly)}</Text>
        <Text style={ui.body}>
          {euro(total.annual)} / an · {total.active} abonnement
          {total.active > 1 ? 's' : ''} actif{total.active > 1 ? 's' : ''}
        </Text>
      </View>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.heading}>À venir</Text>
        <Button title="+ Ajouter" size="sm" variant="secondary" onPress={add} />
      </View>
      {!upcoming.length && (
        <View style={ui.card}>
          <Text style={ui.heading}>
            {data.length
              ? 'Aucune décision en attente.'
              : 'Votre premier déclic commence ici.'}
          </Text>
          <Text style={ui.body}>
            Ajoutez un abonnement et sa prochaine échéance pour découvrir votre
            coût annuel et quand agir.
          </Text>
          <Button title="Ajouter un abonnement" onPress={add} />
        </View>
      )}
      {upcoming.map(({ sub, dates }) => (
        <View key={sub.id} style={[ui.card, { gap: 8, padding: 16 }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
            style={{ gap: 8 }}
          >
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>{sub.name}</Text>
              <Text style={ui.pill}>
                {euro(Number(sub.price))} /{' '}
                {frequencyLabels[sub.frequency] ?? sub.frequency}
              </Text>
            </View>
            <Text style={ui.body}>
              Prélèvement : {shortDate(dates.renewal)}
            </Text>
            {dates.actionBy && (
              <Text
                style={[
                  ui.body,
                  dates.actionBy && dayKey(dates.actionBy) < dayKey(new Date())
                    ? ui.warning
                    : { color: Colors.text },
                ]}
              >
                Agir avant le {shortDate(dates.actionBy)}
              </Text>
            )}
            {dates.safety && (
              <Text style={ui.small}>
                Date de sûreté : {shortDate(dates.safety)}
              </Text>
            )}
          </Pressable>
          <DecisionActions sub={sub} follow={follow[sub.id]} />
        </View>
      ))}
      <View style={ui.row}>
        <View style={[ui.card, { flex: 1, minWidth: 140 }]}>
          <Text style={ui.label}>POTENTIELLES</Text>
          <Text style={[ui.heading, ui.warning]}>
            {euro(total.potentialAnnual)} / an
          </Text>
          <Text style={ui.small}>
            Si vous terminez les résiliations envisagées.
          </Text>
        </View>
        <View style={[ui.card, { flex: 1, minWidth: 140 }]}>
          <Text style={ui.label}>CONFIRMÉES PAR VOUS</Text>
          <Text style={[ui.heading, ui.success]}>
            {euro(total.confirmedAnnual)} / an
          </Text>
          <Text style={ui.small}>
            Projection après les dates de fin confirmées.
          </Text>
        </View>
      </View>
      <Text style={ui.small}>
        Les coûts sont mensualisés, hors achats à vie ; les essais utilisent le
        tarif après essai. Les économies sont des estimations annualisées, pas
        des remboursements ni une vérification bancaire.
      </Text>
      {!!data.length && !canUsePlus && (
        <View style={ui.card}>
          <Text style={ui.heading}>Votre pigeon veille avant le jour J.</Text>
          <Text style={ui.body}>
            Personnalisez votre avance de rappel avec Plus. Vos 5 abonnements et
            leurs rappels standards restent gratuits.
          </Text>
          <Button
            title="Découvrir PigeonSub Plus"
            variant="secondary"
            onPress={() => router.push('/(tabs)/premium?reason=safety')}
          />
        </View>
      )}
      <Text style={ui.small}>
        {mode === 'account'
          ? 'Abonnements liés à votre compte. Les décisions et réglages de rappel sont enregistrés sur cet appareil.'
          : mode === 'guest'
            ? 'Mode sans compte : vos données sont enregistrées sur cet appareil. Ne désinstallez pas l’app sans les avoir sauvegardées.'
            : 'Vous pouvez modifier librement les exemples de la démo.'}
      </Text>
    </Page>
  );
}
