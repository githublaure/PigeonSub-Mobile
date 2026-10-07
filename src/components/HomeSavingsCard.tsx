import React from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { euro } from '../lib/subscription-math';

export function HomeSavingsCard({ monthly, potentialAnnual, confirmedAnnual, pendingNames, onDetails }: {
  monthly: number;
  potentialAnnual: number;
  confirmedAnnual: number;
  pendingNames: string[];
  onDetails: () => void;
}) {
  const { colors: c, scheme } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360;
  const costColor = scheme === 'dark' ? '#C4B5FD' : '#6D28D9';
  const savingsColor = scheme === 'dark' ? '#F2C56B' : '#BE790D';

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} testID="home-summary">
      <View style={[styles.spending, { borderBottomColor: c.divider }]}>
        <View style={[styles.costIcon, { backgroundColor: c.surfaceRaised }]}>
          <Ionicons name="wallet-outline" size={18} color={costColor} />
        </View>
        <Text style={[styles.costLabel, { color: c.textSecondary }]}>Dépenses actuelles</Text>
        <Text style={[styles.costAmount, { color: costColor }]}>
          {euro(monthly)}<Text style={styles.costPeriod}> / mois</Text>
        </Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={[styles.title, { color: c.text }]}>Si vous résiliez</Text>
          <Text numberOfLines={1} style={[styles.caption, { color: c.textSecondary }]}>{pendingNames.length === 1 ? pendingNames[0] : pendingNames.length ? `${pendingNames.length} abonnements sélectionnés` : 'Aucun abonnement sélectionné'}</Text>
          <Text
            testID="home-potential-amount"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
            style={[styles.amount, { color: savingsColor, fontSize: compact ? 35 : 43 }]}
          >
            {euro(potentialAnnual)}
          </Text>
          <Text style={[styles.caption, { color: c.textSecondary }]}>
            {potentialAnnual > 0 ? 'par an économisables' : 'Choisissez quoi résilier'}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Voir le calcul des économies" onPress={onDetails} style={{ minHeight: 36, justifyContent: 'center' }}>
            <Text style={{ color: costColor, fontSize: 12, fontWeight: '600' }}>Voir le calcul →</Text>
          </Pressable>
        </View>
        {fontScale < 1.5 && <Image
          source={require('../../assets/mascots/pigeon-calculator.png')}
          style={[styles.mascot, compact && { width: 66, height: 112 }]}
          resizeMode="contain"
          accessible={false}
        />}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={confirmedAnnual > 0
          ? `Voir mes économies : résiliations confirmées, ${euro(confirmedAnnual)} par an estimés`
          : 'Voir mes économies'}
        onPress={onDetails}
        style={({ pressed }) => [styles.details, { borderTopColor: c.divider, opacity: pressed ? 0.65 : 1 }]}
      >
        {confirmedAnnual > 0 ? <>
          <Ionicons name="checkmark-circle-outline" size={16} color={c.success} />
          <Text style={[styles.confirmedLabel, { color: c.textSecondary }]}>Résiliations confirmées</Text>
          <Text style={[styles.confirmedAmount, { color: c.success }]}>{euro(confirmedAnnual)} / an</Text>
        </> : <Text style={[styles.detailsLabel, { color: costColor }]}>Voir mes économies</Text>}
        <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    borderRadius: 26,
    borderWidth: 1,
    boxShadow: '0 8px 28px rgba(109, 40, 217, 0.08)',
  },
  spending: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 7, rowGap: 5, paddingBottom: 12, borderBottomWidth: 1 },
  costIcon: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  costLabel: { flex: 1, minWidth: 70, fontSize: 12, lineHeight: 16 },
  costAmount: { fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'] },
  costPeriod: { fontSize: 11, fontWeight: '500' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 8, minHeight: 144 },
  heroCopy: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  amount: { fontWeight: '800', letterSpacing: -1.7, fontVariant: ['tabular-nums'] },
  caption: { fontSize: 11, lineHeight: 16 },
  mascot: { width: 100, height: 140 },
  details: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 46, paddingVertical: 9, borderTopWidth: 1 },
  confirmedLabel: { flex: 1, fontSize: 11, lineHeight: 15 },
  confirmedAmount: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 1 },
  detailsLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
});
