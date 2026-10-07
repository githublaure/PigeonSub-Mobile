import React, { useState } from 'react';
import { Image, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useBilling } from '../../src/contexts/BillingContext';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
import { PlusBadge } from '../../src/components/ui/PlusBadge';
import { BudgetPanel } from '../../src/components/BudgetPanel';
import { GuideAnchor } from '../../src/components/guide/GuideScrollView';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { euro, isEnded, currentMonthlyCost, overview } from '../../src/lib/subscription-math';
import { costProjection } from '../../src/lib/stats-projection';
import { STATS_VIEWS, availableStatsView, statsScenario, type StatsView } from '../../src/lib/stats-views';
import { categoryLabels } from '../../src/lib/labels';

export default function StatsScreen() {
  const { width } = useWindowDimensions();
  const narrow = width < 360, wide = width >= 680;
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
  const selected = STATS_VIEWS.find(v => v.id === view)!;
  const scenario = statsScenario(data, follow, view);
  const summary = overview(data, follow);
  const active = scenario.included.filter(s => !isEnded(s, follow[s.id]));
  const categories: Record<string, number> = {};
  for (const sub of active) categories[sub.category] = (categories[sub.category] ?? 0) + currentMonthlyCost(sub);
  const groups = Object.entries(categories).filter(([, cost]) => cost > 0).sort((a, b) => b[1] - a[1]);
  const palette = [c.primary, '#DD8F46', '#4382C4', '#449D9A', '#AD7298', '#7D859B'];
  const projection = costProjection(scenario.included, follow, months);
  const series = [{ month: 'current', label: 'Actuel', amount: scenario.monthly }, ...projection];
  const max = Math.max(1, ...series.map(p => p.amount));
  const points = series.map((p, i) => [18 + i * 264 / months, 114 - p.amount / max * 66]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  const final = projection[months - 1].amount;
  const change = scenario.monthly > 0 ? (final / scenario.monthly - 1) * 100 : null;
  const confirmedCount = data.filter(s => follow[s.id]?.decision === 'cancel_confirmed').length;
  const underused = active.filter(s => s.usageFrequency === 'rarely_used' && currentMonthlyCost(s) > 0).sort((a, b) => currentMonthlyCost(b) - currentMonthlyCost(a));
  const topCategory = groups[0];
  const topSubscription = topCategory ? active.filter(s => s.category === topCategory[0]).sort((a, b) => currentMonthlyCost(b) - currentMonthlyCost(a))[0] : undefined;
  let offset = 0;
  const amountSize = Math.min(narrow ? 28 : 34, (width - 44 - (narrow ? 28 : 36) - (narrow ? 84 : 110) - 10) / (euro(scenario.monthly).length * .7));
  const savingSize = narrow ? 32 : Math.min(30, ((width - 54) / 2 - 30) / (euro(summary.confirmedAnnual).length * .7));
  const serif = Platform.OS === 'ios' ? 'Georgia' : Platform.OS === 'web' ? 'Georgia, serif' : 'serif';
  return <Page title="Vos chiffres" titleStyle={{ fontFamily: serif, fontSize: narrow ? 36 : 44, lineHeight: 52, fontWeight: '700' }} headerAccessory={<PlusBadge compact reason="stats" />}>
    <GuideAnchor id="stats-views"><View style={{ gap: 8 }}>
      <View style={[ui.card, { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, gap: 6 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choisir une vue des statistiques" accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen(!menuOpen)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 8 }}>
          <Text style={[ui.heading, { flex: 1, fontSize: 15 }]}>{selected.label}</Text>
          <Ionicons name={menuOpen ? 'chevron-up' : 'chevron-down'} size={20} color={c.primary} />
        </Pressable>
        {selected.plus && <PlusBadge compact={narrow} reason="stats" />}
      </View>
      {menuOpen && <View style={[ui.card, { padding: 8, gap: 0 }]} testID="stats-view-menu">
        {STATS_VIEWS.map(option => <View key={option.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 8, backgroundColor: view === option.id ? c.surfaceRaised : 'transparent' }}>
          <Pressable accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: view === option.id }} aria-checked={view === option.id} onPress={() => {
            setMenuOpen(false);
            if (option.plus && !canUsePlus) router.push('/(tabs)/premium?reason=stats'); else setChosenView(option.id);
          }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 54, gap: 6 }}>
            <Text style={[ui.body, { flex: 1, color: c.text }]}>{option.label}</Text>
            {option.plus && !canUsePlus && <Ionicons name="lock-closed-outline" size={15} color={c.gold} />}
          </Pressable>
          {option.plus && <PlusBadge reason="stats" />}
        </View>)}
      </View>}
      {view !== 'current' && <Text style={ui.small}>Simulation · aucun abonnement modifié</Text>}
    </View></GuideAnchor>

    <GuideAnchor id="stats-chart"><View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', backgroundColor: c.surfaceRaised, borderRadius: 22, padding: 4, borderWidth: 1, borderColor: c.border }}>
        {[3, 6, 12].map(n => <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`Projection ${n} mois`} accessibilityState={{ checked: months === n }} aria-checked={months === n} onPress={() => setMonths(n)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: months === n ? c.primary : 'transparent' }}><Text style={{ color: months === n ? c.white : c.textSecondary, fontWeight: '600' }}>{n === 12 ? '1 an' : `${n} mois`}</Text></Pressable>)}
      </View>
      <View style={[ui.card, { padding: narrow ? 14 : 18 }]} testID="stats-cost">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ flex: 1, gap: 7 }}>
            <Text style={[ui.label, { fontSize: 10 }]}>{view === 'current' ? 'COÛT ACTUEL' : 'COÛT SIMULÉ'} · HORS ESSAIS</Text>
            <Text testID="stats-current-amount" style={{ color: c.text, fontFamily: serif, fontSize: amountSize, fontWeight: '700' }}>{euro(scenario.monthly)}</Text>
            <Text style={ui.small}>par mois · {euro(scenario.monthly * 12)} / an</Text>
          </View>
          <Image source={require('../../assets/mascots/pigeon-professor.png')} style={{ width: narrow ? 84 : 110, height: narrow ? 92 : 115 }} resizeMode="contain" accessible={false} />
        </View>
        {view !== 'current' && <Text style={{ color: c.gold, fontSize: 16, fontWeight: '700' }}>{euro(scenario.avoidedMonthly)} / mois évitables après résiliation</Text>}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'baseline' }}>
          {change !== null && <Text style={{ color: change > 0 ? c.warning : change < 0 ? c.success : c.primary, fontWeight: '700', fontSize: 18 }}>{change > 0 ? '+' : ''}{change.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</Text>}
          <Text style={ui.small}>projection sur les {months} prochains mois</Text>
        </View>
        <View accessible accessibilityLabel={`Projection mensuelle, pas un historique de paiements. ${series.map(p => `${p.label} : ${euro(p.amount)}`).join(', ')}`} testID="stats-projection-chart">
          <Svg width="100%" height={170} viewBox="0 0 300 165">
            <Defs><LinearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={c.primary} stopOpacity={.24} /><Stop offset="1" stopColor={c.primary} stopOpacity={.02} /></LinearGradient></Defs>
            <Path d={`${line} L 282 134 L 18 134 Z`} fill="url(#projectionFill)" />
            <Line x1={12} y1={134} x2={288} y2={134} stroke={c.border} strokeWidth={1} />
            <Path d={line} fill="none" stroke={c.primary} strokeWidth={2.3} />
            {points.map(([x, y], i) => <React.Fragment key={i}>
              <Line x1={x} y1={y} x2={x} y2={134} stroke={c.primary} strokeOpacity={.12} strokeDasharray="3 3" />
              <Circle cx={x} cy={y} r={3.7} fill={c.primary} />
              {(months <= 6 || i % 3 === 0) && <><SvgText x={x} y={y - 12} fill={c.text} fontSize={9} textAnchor="middle">{Math.round(series[i].amount)} €</SvgText><SvgText x={x} y={152} fill={c.textSecondary} fontSize={8} textAnchor="middle">{series[i].label}</SvgText></>}
            </React.Fragment>)}
          </Svg>
        </View>
        <Text style={ui.small}>Tarifs constants. Les essais sont projetés au tarif payant ; seuls vos passages payants confirmés comptent dans le coût actuel.</Text>
      </View>
    </View></GuideAnchor>

    <View style={{ flexDirection: narrow ? 'column' : 'row', gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voir le détail des économies confirmées" onPress={() => router.push('/(tabs)/savings')} style={[ui.card, { flex: 1, padding: 13, borderColor: c.goldBorder, backgroundColor: c.goldSurface }]}>
        <Text testID="stats-confirmed-amount" style={{ color: c.gold, fontFamily: serif, fontSize: savingSize, fontWeight: '700' }}>{euro(summary.confirmedAnnual)}</Text><Text style={[ui.heading, { fontSize: 15 }]}>par an évités</Text><Text style={ui.small}>Estimation · résiliations confirmées</Text>
      </Pressable>
      <View style={[ui.card, { flex: 1, padding: 13, borderColor: c.goldBorder, backgroundColor: c.goldSurface }]}>
        <Text style={{ color: c.gold, fontFamily: serif, fontSize: 36, fontWeight: '700' }}>{confirmedCount}</Text><Text style={[ui.heading, { fontSize: 15 }]}>résiliation{confirmedCount > 1 ? 's' : ''}</Text><Text style={ui.small}>confirmée{confirmedCount > 1 ? 's' : ''} par vous</Text>
      </View>
    </View>
    <BudgetPanel current={scenario.current} simulated={view === 'current' ? undefined : scenario.monthly} />

    {view !== 'current' && <View style={ui.card} testID="stats-excluded">
      <Text style={ui.heading}>Retirés de cette simulation</Text>
      {scenario.excluded.length ? scenario.excluded.map(sub => <Pressable key={sub.id} accessibilityRole="button" accessibilityLabel={`Revoir ${sub.name}`} onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)} style={[ui.row, { minHeight: 44 }]}><Text style={[ui.body, { flex: 1 }]}>{sub.name}</Text><Text style={{ color: c.gold, fontWeight: '700' }}>{euro(currentMonthlyCost(sub))}/mois</Text><Ionicons name="chevron-forward" size={15} color={c.textSecondary} /></Pressable>) : <Text style={ui.body}>Aucun abonnement ne correspond à ce filtre.</Text>}
      {view === 'low_rated' && <Text style={ui.small}>Notes de 1 à 2 étoiles. Les abonnements non notés sont conservés.</Text>}
      {view === 'optimized' && <Text style={ui.small}>Résiliations prévues, peu utilisés et notes de 1 à 2 étoiles.</Text>}
    </View>}

    <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
      <View style={[ui.card, wide && { flex: 1.4 }]}>
        <Text style={ui.heading}>Où part votre argent ?</Text>
        {groups.length ? <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View accessible accessibilityLabel={`Répartition : ${groups.map(([key, cost]) => `${categoryLabels[key] ?? key} ${euro(cost)}`).join(', ')}`}>
            <Svg width={narrow ? 84 : 108} height={narrow ? 84 : 108} viewBox="0 0 150 150">
              <Circle cx={75} cy={75} r={56} fill="none" stroke={c.surfaceRaised} strokeWidth={24} />
              {groups.map(([key, cost], i) => {
                const length = cost / scenario.monthly * 351.86, start = offset; offset += length;
                return <Circle key={key} cx={75} cy={75} r={56} fill="none" stroke={palette[i % palette.length]} strokeWidth={24} strokeDasharray={`${length} ${Math.max(0, 351.86 - length)}`} strokeDashoffset={-start} transform="rotate(-90 75 75)" />;
              })}
            </Svg>
          </View>
          <View style={{ flex: 1, gap: 8 }}>{groups.map(([key, cost], i) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette[i % palette.length] }} /><Text style={[ui.small, { flex: 1 }]}>{categoryLabels[key] ?? key}</Text><Text style={[ui.small, { color: c.text }]}>{Math.round(cost / scenario.monthly * 100)} %</Text></View>)}</View>
        </View> : <Text style={ui.body}>Aucune dépense récurrente dans cette vue.</Text>}
      </View>
      {topCategory && topSubscription && <View style={[ui.card, wide && { flex: 1 }]} testID="stats-category-insight">
        <Text style={ui.label}>VOTRE PREMIER POSTE</Text>
        <Text style={ui.heading}>{categoryLabels[topCategory[0]] ?? topCategory[0]}</Text>
        <Text style={[ui.value, { color: c.primary, fontFamily: serif }]}>{euro(topCategory[1])}<Text style={{ fontSize: 14 }}> / mois</Text></Text>
        <Text style={ui.body}>{topSubscription.name} représente <Text style={{ color: c.primary, fontWeight: '700' }}>{Math.round(currentMonthlyCost(topSubscription) / topCategory[1] * 100)} %</Text> de cette catégorie.</Text>
      </View>}
    </View>
    <View style={ui.card}>
      <Text style={ui.heading}>Ce que vous payez sans vraiment l’utiliser</Text>
      {underused.length ? <>
        {underused.slice(0, 3).map(sub => <Pressable key={sub.id} accessibilityRole="button" accessibilityLabel={`Faire le point sur ${sub.name}`} onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 }}><View style={{ flex: 1 }}><Text style={[ui.heading, { fontSize: 16 }]}>{sub.name}</Text><Text style={ui.small}>{euro(currentMonthlyCost(sub))} / mois</Text></View><Text style={[ui.small, { color: c.warning }]}>Peu utilisé</Text><Ionicons name="chevron-forward" size={18} color={c.textMuted} /></Pressable>)}
        <Button title="Faire le tri" variant="secondary" onPress={() => router.push('/(tabs)/subscriptions?view=underused')} />
      </> : <Text style={ui.body}>Aucun abonnement payant n’est marqué « Peu utilisé » dans cette vue.</Text>}
    </View>
  </Page>;
}
