import { useTheme, useThemedStyles } from '../../src/contexts/ThemeContext';
import type { Palette } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  const router = useRouter();
  const { mode, user } = useAuth();
  const { canUsePlus } = useBilling();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const total = overview(data, follow);
  const pending = data.filter(
    (s) => s.isActive && follow[s.id]?.decision === 'cancel_requested',
  ).length;
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
      <View style={styles.savingsCard} testID="home-summary">
        <View style={styles.heroAccent} />
        <View style={styles.spendingBlock}>
          <Text style={styles.costLabel}>CE QUE VOUS DÉPENSEZ</Text>
          <View style={styles.amountRow}>
            <Text style={styles.costAmount}>{euro(total.monthly)}</Text>
            <Text style={styles.costPeriod}>/ mois</Text>
          </View>
          <Text style={styles.annualCost}>
            {euro(total.annual)} / an · hors essais
          </Text>
        </View>
        <View style={ui.row}>
          <Ionicons
            name="sparkles-outline"
            size={20}
            color={colors.savingsText}
          />
          <Text style={styles.savingsLabel}>ÉCONOMIES POTENTIELLES</Text>
        </View>
        <View style={styles.amountRow}>
          <Text
            style={[
              styles.savingsAmount,
              width < 360 && { fontSize: 36, lineHeight: 44 },
            ]}
          >
            {euro(total.potentialAnnual)}
          </Text>
          <Text style={styles.savingsPeriod}>/ an</Text>
        </View>
        <Text style={styles.savingsHint}>
          {pending
            ? `${euro(total.potentialAnnual / 12)} / mois · ${pending} démarche${pending > 1 ? 's' : ''} à terminer`
            : 'Sélectionnez les abonnements à résilier.'}
        </Text>
        {total.confirmedAnnual > 0 && (
          <View style={styles.confirmedRow}>
            <View style={styles.confirmedLabel}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={colors.savingsText}
              />
              <Text style={styles.savingsHint}>Résiliations confirmées</Text>
            </View>
            <Text style={styles.confirmedAmount}>
              {euro(total.confirmedAnnual)} / an
            </Text>
          </View>
        )}
        {(pending > 0 || total.confirmedAnnual > 0) && (
          <Text style={styles.savingsNote}>Estimation après résiliation.</Text>
        )}
      </View>

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
        <Button title="+ Ajouter" size="sm" variant="secondary" onPress={add} />
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
          <Button title="Ajouter un abonnement" onPress={add} />
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
      <Button
        title="Voir mes stats et mes économies"
        variant="secondary"
        onPress={() => router.push('/(tabs)/stats')}
      />
      {!!data.length && !canUsePlus && (
        <View
          style={[
            ui.card,
            {
              backgroundColor: colors.goldSurface,
              borderColor: colors.goldBorder,
            },
          ]}
        >
          <Text style={[ui.label, { color: colors.gold }]}>
            ✦ PIGEONSUB PLUS
          </Text>
          <Text style={ui.heading}>Votre pigeon veille avant le jour J.</Text>
          <Text style={ui.body}>
            Abonnements et essais illimités.
          </Text>
          <Button
            title="Découvrir PigeonSub Plus"
            variant="secondary"
            onPress={() => router.push('/(tabs)/premium?reason=limit')}
          />
        </View>
      )}
      <Text style={ui.small}>
        {mode === 'account'
          ? 'Abonnements liés à votre compte. Les décisions et réglages de rappel sont enregistrés sur cet appareil.'
          : mode === 'guest'
            ? 'Mode sans compte : vos données sont enregistrées sur cet appareil. Ne désinstallez pas l’app sans les avoir sauvegardées.'
            : 'Montants fictifs. Vous pouvez modifier librement les exemples de la démo.'}
      </Text>
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
    heroAccent: {
      position: 'absolute',
      height: 4,
      left: 22,
      right: 22,
      top: 0,
      backgroundColor: c.goldBorder,
      borderBottomLeftRadius: 6,
      borderBottomRightRadius: 6,
    },
    savingsCard: {
      padding: 18,
      gap: 8,
      borderRadius: 26,
      overflow: 'hidden',
      boxShadow: '0 7px 22px rgba(151, 113, 35, 0.09)',
      backgroundColor: c.savingsBackground,
      borderWidth: 1,
      borderColor: c.savingsBorder,
    },
    savingsLabel: {
      color: c.savingsText,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      flexShrink: 1,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      columnGap: 7,
    },
    savingsAmount: {
      color: c.savingsText,
      fontSize: 42,
      lineHeight: 50,
      fontWeight: '800',
      letterSpacing: -1.6,
      fontVariant: ['tabular-nums'],
    },
    savingsPeriod: { color: c.savingsText, fontSize: 20, fontWeight: '600' },
    savingsHint: {
      color: c.savingsText,
      fontSize: 13,
      lineHeight: 18,
      flexShrink: 1,
    },
    confirmedRow: {
      borderTopWidth: 1,
      borderTopColor: c.savingsBorder,
      paddingTop: 12,
      marginTop: 4,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    confirmedLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexShrink: 1,
    },
    confirmedAmount: {
      color: c.savingsText,
      fontSize: 15,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    savingsNote: { color: c.savingsText, fontSize: 11, lineHeight: 15 },
    spendingBlock: {
      gap: 4,
      paddingBottom: 14,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: c.savingsBorder,
    },
    costLabel: { color: c.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
    costAmount: {
      color: c.text,
      fontSize: 32,
      fontWeight: '800',
      lineHeight: 38,
      fontVariant: ['tabular-nums'],
    },
    costPeriod: { color: c.text, fontSize: 16, fontWeight: '500' },
    annualCost: { color: c.textSecondary, fontSize: 13, fontWeight: '500' },
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
