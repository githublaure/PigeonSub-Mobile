import React, { useState } from 'react';
import { Image, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useBilling } from '../../src/contexts/BillingContext';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { Page, useUI } from '../../src/components/ui/Page';
import { PlusBadge } from '../../src/components/ui/PlusBadge';
import { BudgetPanel } from '../../src/components/BudgetPanel';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { euro, isEnded, currentMonthlyCost, overview } from '../../src/lib/subscription-math';
import { costProjection } from '../../src/lib/stats-projection';
import { STATS_VIEWS, availableStatsView, statsScenario, type StatsView } from '../../src/lib/stats-views';
import { categoryLabels } from '../../src/lib/labels';

export default function StatsScreen() {
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const { colors: c } = useTheme();
  const { canUsePlus } = useBilling();
  const ui = useUI();
  const router = useRouter();
  const [months, setMonths] = useState(6);
  const [chosenView, setChosenView] = useState<StatsView>('current');
  const [menuOpen, setMenuOpen] = useState(false);
  const { data, follow, loading, error, reload } = useSubscriptionData();
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const view = availableStatsView(chosenView, canUsePlus);
  const selected = STATS_VIEWS.find((v) => v.id === view)!;
  const scenario = statsScenario(data, follow, view);
  const summary = overview(data, follow);
  const active = scenario.included.filter((s) => !isEnded(s, follow[s.id]));
  const categories: Record<string, number> = {};
  for (const sub of active) categories[sub.category] = (categories[sub.category] ?? 0) + currentMonthlyCost(sub);
  const groups = Object.entries(categories).filter(([, cost]) => cost > 0).sort((a, b) => b[1] - a[1]);
  const palette = [c.primary, '#C69437', '#4382C4', '#449D9A', '#AD7298', '#7D859B'];
  const projection = costProjection(scenario.included, follow, months);
  const max = Math.max(1, ...projection.map((p) => p.amount));
  const points = projection.map((p, i) => [12 + i * 276 / (months - 1), 108 - p.amount / max * 80]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  let offset = 0;
  return (
    <Page title="Stats">
      <View style={{ gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choisir une vue des statistiques"
          accessibilityState={{ expanded: menuOpen }}
          onPress={() => setMenuOpen(!menuOpen)}
          style={[ui.card, ui.row, { paddingVertical: 13, justifyContent: 'space-between' }]}
        >
          <Text style={[ui.heading, { flex: 1, fontSize: 16 }]}>{selected.label}</Text>
          {selected.plus && <PlusBadge compact={narrow} />}
          <Ionicons name={menuOpen ? 'chevron-up' : 'chevron-down'} size={20} color={c.primary} />
        </Pressable>
        {menuOpen && <View style={[ui.card, { padding: 8, gap: 0 }]} testID="stats-view-menu">
          {STATS_VIEWS.map((option) => <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: view === option.id }}
            aria-checked={view === option.id}
            onPress={() => {
              setMenuOpen(false);
              if (option.plus && !canUsePlus) router.push('/(tabs)/premium?reason=stats');
              else setChosenView(option.id);
            }}
            style={[ui.row, { minHeight: 54, padding: 10, borderRadius: 12, backgroundColor: view === option.id ? c.surfaceRaised : 'transparent' }]}
          >
            <Text style={[ui.body, { flex: 1, color: c.text }]}>{option.label}</Text>
            {option.plus && <PlusBadge />}
            {option.plus && !canUsePlus && <Ionicons name="lock-closed-outline" size={15} color={c.gold} />}
          </Pressable>)}
        </View>}
        {view !== 'current' && <Text style={ui.small}>Simulation · aucun abonnement modifié</Text>}
      </View>

      <View style={ui.card} testID="stats-cost">
        <View style={ui.row}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={ui.label}>{view === 'current' ? 'COÛT ACTUEL' : 'COÛT SIMULÉ'} · HORS ESSAIS</Text>
            <Text style={[ui.value, narrow && { fontSize: 28 }]}>{euro(scenario.monthly)}</Text>
            <Text style={ui.small}>/ mois · {euro(scenario.monthly * 12)} / an</Text>
          </View>
          <Image source={require('../../assets/mascots/pigeon-money-bag.png')} style={{ width: narrow ? 62 : 90, height: narrow ? 76 : 100 }} resizeMode="contain" accessible={false} />
        </View>
        {view !== 'current' && <View style={{ backgroundColor: c.goldSurface, borderRadius: 14, padding: 12, gap: 4 }}>
          <Text style={[ui.heading, { color: c.gold }]}>{euro(scenario.avoidedMonthly)} / mois évitables</Text>
          <Text style={ui.small}>{euro(scenario.avoidedMonthly * 12)} / an · si résiliation effective</Text>
        </View>}
      </View>

      <BudgetPanel current={scenario.current} simulated={view === 'current' ? undefined : scenario.monthly} />

      {view !== 'current' && <View style={ui.card} testID="stats-excluded">
        <Text style={ui.heading}>Retirés de cette simulation</Text>
        {scenario.excluded.length ? scenario.excluded.map((sub) => <Pressable
          key={sub.id} accessibilityRole="button" accessibilityLabel={`Revoir ${sub.name}`}
          onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
          style={[ui.row, { minHeight: 44 }]}
        >
          <Text style={[ui.body, { flex: 1 }]}>{sub.name}</Text>
          <Text style={{ color: c.gold, fontWeight: '700' }}>{euro(currentMonthlyCost(sub))}/mois</Text>
          <Ionicons name="chevron-forward" size={15} color={c.textSecondary} />
        </Pressable>) : <Text style={ui.body}>Aucun abonnement ne correspond à ce filtre.</Text>}
        {view === 'low_rated' && <Text style={ui.small}>Notes de 1 à 2 étoiles. Les abonnements non notés sont conservés.</Text>}
        {view === 'optimized' && <Text style={ui.small}>Résiliations prévues, peu utilisés et notes de 1 à 2 étoiles.</Text>}
      </View>}

      <View style={ui.card}>
        <Text style={ui.heading}>Évolution estimée</Text>
        <View style={[ui.row, { backgroundColor: c.surfaceRaised, borderRadius: 16, padding: 4, gap: 4 }]}>
          {[3, 6, 12].map((n) => <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`Projection ${n} mois`} accessibilityState={{ checked: months === n }} aria-checked={months === n} onPress={() => setMonths(n)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: months === n ? c.primary : 'transparent' }}>
            <Text style={{ color: months === n ? c.white : c.textSecondary, fontWeight: '600' }}>{n === 12 ? '1 an' : `${n} mois`}</Text>
          </Pressable>)}
        </View>
        <View accessible accessibilityLabel={projection.map((p) => `${p.month} : ${euro(p.amount)}`).join(', ')}>
          <Svg width="100%" height={120} viewBox="0 0 300 120">
            <Path d={`${line} L 288 112 L 12 112 Z`} fill={c.primary} opacity={0.09} />
            <Path d={line} fill="none" stroke={c.primary} strokeWidth={2.5} />
            {points.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={3.5} fill={c.primary} />)}
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {projection.map((p, i) => months < 12 || i % 3 === 0 || i === 11 ? <Text key={p.month} style={[ui.small, { fontSize: 10 }]}>{p.label}</Text> : null)}
          </View>
        </View>
        <Text style={[ui.heading, { fontSize: 17 }]}>À l’horizon choisi : {euro(projection[months - 1].amount)} / mois</Text>
        <Text style={ui.small}>Tarifs constants · essais convertis au premier paiement prévu · fins confirmées prises en compte.</Text>
      </View>

      <View style={[ui.card, { borderColor: c.goldBorder, backgroundColor: c.goldSurface }]}>
        <Text style={[ui.label, { color: c.gold }]}>RÉSILIATIONS EN COURS</Text>
        <Text style={[ui.value, { color: c.gold }]}>{euro(summary.potentialAnnual)} <Text style={{ fontSize: 17 }}>/ an</Text></Text>
        <Text style={ui.small}>Potentiel estimé après résiliation.</Text>
        {summary.confirmedAnnual > 0 && <Text style={[ui.heading, { color: c.gold, fontSize: 16 }]}>{euro(summary.confirmedAnnual)} / an · résiliations confirmées</Text>}
      </View>

      <View style={ui.card}>
        <Text style={ui.heading}>Où part votre argent ?</Text>
        {groups.length ? <>
          <View style={{ alignItems: 'center', paddingVertical: 8 }} accessible accessibilityLabel={`Répartition mensuelle : ${groups.map(([key, cost]) => `${categoryLabels[key] ?? key} ${euro(cost)}`).join(', ')}`}>
            <Svg width={150} height={150} viewBox="0 0 150 150">
              <Circle cx={75} cy={75} r={56} fill="none" stroke={c.surfaceRaised} strokeWidth={18} />
              {groups.map(([key, cost], i) => {
                const length = cost / scenario.monthly * 351.86, start = offset; offset += length;
                return <Circle key={key} cx={75} cy={75} r={56} fill="none" stroke={palette[i % palette.length]} strokeWidth={18} strokeDasharray={`${length} ${351.86 - length}`} strokeDashoffset={-start} transform="rotate(-90 75 75)" />;
              })}
            </Svg>
          </View>
          {groups.map(([key, cost], i) => <View key={key} style={ui.row}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: palette[i % palette.length] }} />
            <Text style={[ui.body, { flex: 1 }]}>{categoryLabels[key] ?? key}</Text>
            <Text style={ui.small}>{euro(cost)} · {Math.round(cost / scenario.monthly * 100)} %</Text>
          </View>)}
        </> : <Text style={ui.body}>Aucune dépense récurrente dans cette vue.</Text>}
      </View>
    </Page>
  );
}
