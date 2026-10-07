import { HomeSavingsCard } from '../../src/components/HomeSavingsCard';
import { AddSubscriptionButton } from '../../src/components/ui/AddSubscriptionButton';
import { PlusBadge } from '../../src/components/ui/PlusBadge';
import { useTheme, useThemedStyles } from '../../src/contexts/ThemeContext';
import type { Palette } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useBilling } from '../../src/contexts/BillingContext';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { DecisionActions } from '../../src/components/DecisionActions';
import { Button } from '../../src/components/ui/Button';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { Page, useUI } from '../../src/components/ui/Page';
import {
  canAddSubscription,
  dayKey,
  euro,
  frequencyLabels,
  overview,
  shortDate,
  trialLabel,
  upcomingRenewals,
} from '../../src/lib/subscription-math';

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  const router = useRouter();
  const { mode, user } = useAuth();
  const { canUsePlus, isPlus } = useBilling();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const total = overview(data, follow);
  const renewals = upcomingRenewals(data, follow);
  const upcoming = renewals.slice(0, 5);
  // A later renewal may need attention earlier. Keep that safety date visible
  // even when the subscription is outside the five nearest renewals.
  const priority = renewals
    .filter(
      ({ sub, dates }) =>
        dates.safety && follow[sub.id]?.decision !== 'cancel_confirmed',
    )
    .reduce<(typeof renewals)[number] | undefined>(
      (first, item) =>
        !first || item.dates.safety! < first.dates.safety! ? item : first,
      undefined,
    );
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
      headerAccessory={
        mode === 'demo' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compte de démonstration : gérer ou quitter la démo"
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.demoBadge}
          >
            <Ionicons
              name="flask-outline"
              size={13}
              color={colors.textSecondary}
            />
            <Text style={styles.demoText}>Démo</Text>
          </Pressable>
        ) : undefined
      }
    >
      <HomeSavingsCard
        monthly={total.monthly}
        potentialAnnual={total.potentialAnnual}
        confirmedAnnual={total.confirmedAnnual}
        pendingNames={data.filter((s) => s.isActive && follow[s.id]?.decision === 'cancel_requested').map((s) => s.name)}
        onDetails={() => router.push('/(tabs)/savings')}
      />

      {total.trialCount > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir mes essais gratuits"
          style={styles.trialLink}
          onPress={() => router.push('/(tabs)/coupons?view=trials')}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.trialTitle}>
              {total.trialCount} essai{total.trialCount > 1 ? 's' : ''} · +
              {euro(total.trialMonthly)}/mois si conservé
              {total.trialCount > 1 ? 's' : ''}
            </Text>
            {total.expiredTrials > 0 && (
              <Text style={[ui.small, ui.warning]}>
                {total.expiredTrials} statut
                {total.expiredTrials > 1 ? 's' : ''} à vérifier
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      )}

      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={ui.heading}>Prochaines échéances</Text>
        </View>
        <AddSubscriptionButton onPress={add} premium={!canAddSubscription(data, false, follow)} />
      </View>
      {priority && priority.sub.id !== upcoming[0]?.sub.id && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Date de sûreté prioritaire : ${priority.sub.name}`}
          onPress={() => router.push(`/(tabs)/subscriptions/${priority.sub.id}`)}
          style={styles.deadline}
        >
          <Ionicons name="time-outline" size={15} color={colors.warning} />
          <Text style={styles.deadlineText}>
            Sûreté prioritaire · {priority.sub.name} ·{' '}
            {shortDate(priority.dates.safety)}
          </Text>
          <Ionicons name="chevron-forward" size={15} color={colors.warning} />
        </Pressable>
      )}
      {!upcoming.length && (
        <View style={ui.card}>
          <Text style={ui.heading}>
            {data.length
              ? 'Aucune échéance à venir.'
              : 'Ajoutez votre premier abonnement.'}
          </Text>
          <Text style={ui.body}>
            Renseignez une date pour suivre le prochain prélèvement.
          </Text>

        </View>
      )}
      {upcoming.map(({ sub, dates }) => (
        <View
          key={sub.id}
          testID={`home-renewal-${sub.id}`}
          style={[ui.card, { gap: 10, padding: 16 }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Voir ${sub.name}`}
            onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
            style={{ gap: 8 }}
          >
            <View
              style={[
                ui.row,
                { justifyContent: 'space-between', alignItems: 'flex-start' },
              ]}
            >
              <Text style={[ui.heading, { flexShrink: 1 }]}>{sub.name}</Text>
              <Text style={ui.pill}>
                {sub.isTrial ? 'Après essai · ' : ''}
                {euro(Number(sub.price.replace(',', '.')))} /{' '}
                {frequencyLabels[sub.frequency] ?? sub.frequency}
              </Text>
            </View>
            <View style={ui.row}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.renewalDate}>
                {sub.isTrial ? 'Fin de l’essai' : 'Renouvellement'} ·{' '}
                {shortDate(dates.renewal)}
              </Text>
            </View>
            {sub.isTrial && <Text style={ui.small}>{trialLabel(sub)}</Text>}
            {dates.safety && follow[sub.id]?.decision !== 'cancel_confirmed' && (
              <View style={styles.deadline}>
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={colors.warning}
                />
                <Text style={styles.deadlineText}>
                  {dayKey(dates.safety) < dayKey(new Date())
                    ? 'Sûreté dépassée · '
                    : 'Sûreté · '}
                  {shortDate(dates.safety)}
                </Text>
              </View>
            )}
          </Pressable>
          <DecisionActions
            sub={sub}
            follow={follow[sub.id]}
            showSavings={false}
          />
        </View>
      ))}
      {renewals.length > 5 && (
        <Button
          title="Voir toutes les échéances"
          variant="secondary"
          onPress={() => router.push('/(tabs)/calendar')}
        />
      )}
      {!!data.length && !isPlus && (
        <View
          style={[
            ui.card,
            {
              backgroundColor: colors.goldSurface,
              borderColor: colors.goldBorder,
            },
          ]}
        >
          <View style={ui.row}><PlusBadge /><Text style={[ui.label, { color: colors.gold }]}>PIGEONSUB PLUS</Text></View>
          <Text style={ui.heading}>Comparez vos budgets possibles.</Text>
          <Text style={ui.body}>
            Vues avancées · abonnements et essais illimités.
          </Text>
          <Button
            title="Découvrir PigeonSub Plus"
            variant="secondary"
            onPress={() => router.push('/(tabs)/premium?reason=limit')}
          />
        </View>
      )}

    </Page>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    demoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 44,
      paddingHorizontal: 9,
      borderRadius: 14,
      backgroundColor: c.surfaceRaised,
    },
    demoText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
    trialLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 44,
      borderRadius: 14,
      backgroundColor: c.surfaceRaised,
    },
    trialTitle: { color: c.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    renewalDate: { color: c.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
    deadline: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: c.warningSurface,
    },
    deadlineText: {
      color: c.warning,
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 1,
    },
  });
