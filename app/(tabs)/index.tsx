import { useTheme, useThemedStyles } from '../../src/contexts/ThemeContext';
import type { Palette } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useBilling } from '../../src/contexts/BillingContext';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { TrialStatus } from '../../src/components/TrialStatus';
import { DecisionActions } from '../../src/components/DecisionActions';
import { Button } from '../../src/components/ui/Button';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { Page, useUI } from '../../src/components/ui/Page';
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

export default function HomeScreen() {
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
  const upcoming = data
    .filter(
      (s) =>
        !isEnded(s, follow[s.id]) &&
        s.frequency !== 'lifetime' &&
        follow[s.id]?.decision !== 'cancel_confirmed',
    )
    .map((sub) => ({ sub, dates: deadlines(sub, follow[sub.id]) }))
    .sort(
      (a, b) =>
        ((a.dates.safety ?? a.dates.actionBy ?? a.dates.renewal)?.getTime() ??
          Infinity) -
        ((b.dates.safety ?? b.dates.actionBy ?? b.dates.renewal)?.getTime() ??
          Infinity),
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
      <View style={styles.savingsCard}>
        <View style={styles.heroAccent} />
        <View style={ui.row}>
          <Ionicons
            name="sparkles-outline"
            size={20}
            color={colors.savingsText}
          />
          <Text style={styles.savingsLabel}>ÉCONOMIES POTENTIELLES</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.savingsAmount}>
            {euro(total.potentialAnnual)}
          </Text>
          <Text style={styles.savingsPeriod}>/ an</Text>
        </View>
        <Text style={styles.savingsHint}>
          {pending
            ? `${euro(total.potentialAnnual / 12)} / mois · ${pending} démarche${pending > 1 ? 's' : ''} à terminer`
            : 'Choisissez Résilier sur un abonnement pour suivre une économie potentielle.'}
        </Text>
        <View style={styles.confirmedRow}>
          <View style={styles.confirmedLabel}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={colors.savingsText}
            />
            <Text style={styles.savingsHint}>Confirmées par vous</Text>
          </View>
          <Text style={styles.confirmedAmount}>
            {euro(total.confirmedAnnual)} / an
          </Text>
        </View>
        <Text style={styles.savingsNote}>
          Projections annuelles après résiliation, pas des remboursements.
        </Text>
      </View>

      <View style={styles.costRow}>
        <View style={{ flex: 1 }}>
          <Text style={ui.small}>Coût actuel · hors essais</Text>
          <Text style={styles.costAmount}>
            {euro(total.monthly)} <Text style={styles.costPeriod}>/ mois</Text>
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={styles.annualCost}>{euro(total.annual)} / an</Text>
          <Text style={ui.small}>
            {total.active} actif{total.active > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {total.trialCount > 0 && (
        <View style={ui.card}>
          <Text style={ui.heading}>
            {total.trialCount} essai{total.trialCount > 1 ? 's' : ''} à suivre
          </Text>
          <Text style={ui.body}>
            Si les essais non résiliés deviennent payants :{' '}
            {euro(total.afterTrialsMonthly)} / mois, soit +
            {euro(total.trialMonthly)}.
          </Text>
          {total.expiredTrials > 0 && (
            <Text style={[ui.small, ui.warning]}>
              {total.expiredTrials} statut{total.expiredTrials > 1 ? 's' : ''} à
              vérifier.
            </Text>
          )}
          <Button
            title="Voir mes essais gratuits"
            variant="secondary"
            onPress={() => router.push('/(tabs)/coupons?view=trials')}
          />
        </View>
      )}

      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={ui.heading}>À décider bientôt</Text>
          <Text style={ui.small}>
            Les dates de sûreté les plus proches d’abord.
          </Text>
        </View>
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
        <View key={sub.id} style={[ui.card, { gap: 12, padding: 16 }]}>
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
                {euro(Number(sub.price))} /{' '}
                {frequencyLabels[sub.frequency] ?? sub.frequency}
              </Text>
            </View>
            <TrialStatus sub={sub} follow={follow[sub.id]} />
            {dates.actionBy && (
              <View style={styles.deadline}>
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={colors.warning}
                />
                <Text style={styles.deadlineText}>
                  {dayKey(dates.actionBy) < dayKey(new Date())
                    ? 'Délai à vérifier · '
                    : 'Agir avant le '}
                  {shortDate(dates.actionBy)}
                </Text>
              </View>
            )}
            <Text style={ui.small}>
              {sub.isTrial ? 'Fin de l’essai' : 'Prélèvement'} :{' '}
              {shortDate(dates.renewal)}
              {dates.safety ? ` · Sûreté : ${shortDate(dates.safety)}` : ''}
            </Text>
          </Pressable>
          <DecisionActions sub={sub} follow={follow[sub.id]} highlightSavings />
        </View>
      ))}
      <Button
        title="Voir mes stats et mes économies"
        variant="secondary"
        onPress={() => router.push('/(tabs)/stats')}
      />
      <Text style={ui.small}>
        Les coûts actuels sont mensualisés, hors achats à vie et essais non
        confirmés payants. Les économies sont des projections, sans vérification
        bancaire.
      </Text>
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
            Suivez autant d’abonnements et d’essais que nécessaire avec Plus.
            Vos 5 abonnements gratuits incluent déjà leurs dates de sûreté
            personnalisées et leurs rappels.
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
    costRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      backgroundColor: c.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
    },
    costAmount: {
      color: c.text,
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 32,
    },
    costPeriod: { fontSize: 14, fontWeight: '500' },
    annualCost: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
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
