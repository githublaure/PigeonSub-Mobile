import React, { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import type { Subscription } from '../lib/api';
import { categoryBreakdown } from '../lib/category-breakdown';
import { euro, type FollowUps } from '../lib/subscription-math';
import { categoryName } from '../lib/category-catalog';
import { useCategoryCatalog } from '../hooks/useCategoryCatalog';
import { useTheme } from '../contexts/ThemeContext';
import { CategoryDrilldown } from './StatsBreakdownDetails';
import { useUI } from './ui/Page';
import { useBilling } from '../contexts/BillingContext';
import { Button } from './ui/Button';

/** Read-only, local simulation state. Mount with the session scope as key. */
export function CategorySpending({ included, follow }: { included: Subscription[]; follow: FollowUps }) {
  const [includeLifetime, setIncludeLifetime] = useState(false);
  const [familyRequested, setFamilyRequested] = useState(false);
  const { canUsePlus } = useBilling();
  const simulateFamily = canUsePlus && familyRequested;
  useEffect(() => { if (!canUsePlus) setFamilyRequested(false); }, [canUsePlus]);
  const { width } = useWindowDimensions();
  const wide = width >= 680;
  const { colors: c } = useTheme();
  const ui = useUI();
  const router = useRouter();
  const catalog = useCategoryCatalog();
  const breakdown = categoryBreakdown(included, follow, { includeLifetime, simulateFamily });
  const { groups, monthly, recurringMonthly, amortizedMonthly, missingDates } = breakdown;
  const top = groups[0], topItem = top?.items[0];
  const palette = [c.primary, '#DD8F46', '#4382C4', '#449D9A', '#AD7298', '#7D859B'];
  const circumference = 2 * Math.PI * 56;
  let offset = 0;
  return <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
    <View testID="stats-category-card" style={[ui.card, wide && { flex: 1.4 }]}>
      <Text style={ui.heading}>Où part votre argent ?</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}>
        <Text style={[ui.body, { flex: 1, color: c.text }]}>Simuler le partage familial</Text>
        <Switch testID="stats-family-toggle" accessibilityLabel="Simuler le partage familial"
          accessibilityHint="Déduit uniquement les contributions reçues que vous avez déclarées."
          value={simulateFamily} disabled={!canUsePlus} onValueChange={setFamilyRequested}
          trackColor={{ false: c.border, true: c.primary }} />
      </View>
      {!canUsePlus && <Button title="Simulation Famille · PigeonSub Plus" variant="ghost" onPress={() => router.push('/(tabs)/premium?reason=family')} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}>
        <Text style={[ui.body, { flex: 1, color: c.text }]}>Inclure les achats à vie</Text>
        <Switch testID="stats-lifetime-toggle" accessibilityLabel="Inclure les achats à vie"
          accessibilityHint="Compare les coûts en répartissant chaque achat à vie sur ses douze premiers mois."
          value={includeLifetime} onValueChange={setIncludeLifetime}
          trackColor={{ false: c.border, true: c.primary }} />
      </View>
      <Text style={ui.small}>{includeLifetime
        ? 'Comparaison analytique : prix des achats à vie réparti sur leurs 12 premiers mois. Ce coût amorti n’est pas un prélèvement mensuel et ne représente pas une économie de résiliation.'
        : 'Dépenses récurrentes uniquement · hors essais et achats à vie.'}</Text>
      {simulateFamily && <View testID="stats-family-summary" style={{ gap: 4 }}>
        <Text style={ui.body}>Coût brut comparé : {euro(breakdown.grossMonthly)}/mois</Text>
        <Text style={ui.body}>Contributions reçues déclarées : {euro(breakdown.contributionMonthly)}/mois</Text>
        <Text style={ui.body}>Reste à charge déclaré : {euro(monthly)}/mois</Text>
        <Text style={ui.small}>Potentiel supplémentaire hypothétique : jusqu’à {euro(breakdown.potentialMonthly)}/mois si les places libres sont occupées et payées selon vos hypothèses. Il n’est pas déduit du total.</Text>
        <Text style={ui.small}>Simulation sans modification des prélèvements, du budget, des projections ni des économies de résiliation.{includeLifetime ? ' Les contributions aux achats à vie sont uniques et amorties sur les mêmes 12 mois que l’achat.' : ''}</Text>
      </View>}
      {groups.length ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View accessible accessibilityRole="image" testID="stats-category-ring"
            accessibilityLabel={`Répartition ${includeLifetime ? 'analytique' : 'récurrente'} : ${groups.map(group => `${categoryName(group.key, catalog)} ${euro(group.monthly)}, ${group.percent} %`).join(', ')}`}>
            <Svg width={84} height={84} viewBox="0 0 150 150">
              <Circle cx={75} cy={75} r={56} fill="none" stroke={c.surfaceRaised} strokeWidth={24} />
              {groups.map((group, i) => {
                const length = group.share * circumference, start = offset;
                offset += length;
                return <Circle key={group.key} cx={75} cy={75} r={56} fill="none"
                  stroke={palette[i % palette.length]} strokeWidth={24}
                  strokeDasharray={`${length} ${Math.max(0, circumference - length)}`}
                  strokeDashoffset={-start} transform="rotate(-90 75 75)" />;
              })}
            </Svg>
          </View>
          <View style={{ flex: 1, gap: 3 }} accessibilityLiveRegion="polite">
            <Text style={ui.small}>{simulateFamily ? 'RESTE À CHARGE DÉCLARÉ' : includeLifetime ? 'TOTAL COMPARÉ' : 'TOTAL RÉCURRENT'}</Text>
            <Text testID="stats-category-total" style={[ui.heading, { fontSize: 24 }]}>{euro(monthly)}</Text>
            <Text style={ui.small}>par mois{includeLifetime ? ' · dont :' : ''}</Text>
            {includeLifetime && <>
              <Text style={ui.small}>{euro(recurringMonthly)} récurrents</Text>
              <Text style={ui.small}>{euro(amortizedMonthly)} amortis</Text>
            </>}
          </View>
        </View>
        <Text style={ui.small}>Touchez ou survolez une catégorie pour voir le détail.</Text>
        <CategoryDrilldown groups={groups} analytical={includeLifetime || simulateFamily} palette={palette} />
      </> : <Text testID="stats-category-empty" style={ui.body}>{includeLifetime
        ? 'Aucune dépense récurrente ni achat à vie amortissable dans cette vue.'
        : 'Aucune dépense récurrente dans cette vue.'}</Text>}
      {includeLifetime && missingDates.length > 0 && <View testID="stats-lifetime-missing-dates" style={{ gap: 4 }}>
        <Text style={[ui.body, { fontWeight: '600' }]}>Date d’achat à renseigner</Text>
        <Text style={ui.small}>Ces achats sont exclus du calcul : indiquez une date d’achat valide pour définir leurs 12 premiers mois.</Text>
        {missingDates.map(sub => <Pressable key={sub.id} accessibilityRole="button"
          accessibilityLabel={`Renseigner la date d’achat de ${sub.name}`}
          onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}/edit`)}
          style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={[ui.body, { color: c.primary, textDecorationLine: 'underline' }]}>{sub.name} · Renseigner la date</Text>
        </Pressable>)}
      </View>}
    </View>
    {top && top.monthly > 0 && topItem && <View testID="stats-category-insight" style={[ui.card, wide && { flex: 1 }]}>
      <Text style={ui.label}>VOTRE PREMIER POSTE{includeLifetime ? ' · COMPARAISON' : ''}</Text>
      <Text style={ui.heading}>{categoryName(top.key, catalog)}</Text>
      <Text style={[ui.heading, { color: c.primary, fontSize: 28 }]}>{euro(top.monthly)} / mois</Text>
      {simulateFamily && <Text style={ui.small}>Reste à charge après contributions reçues déclarées.</Text>}
      {includeLifetime && <Text style={ui.small}>Dépenses récurrentes et achats à vie amortis.</Text>}
      <Text style={ui.body}>{topItem.sub.name} représente <Text style={{ color: c.primary, fontWeight: '700' }}>{Math.round(topItem.monthly / top.monthly * 100)} %</Text> de cette catégorie{topItem.amortization ? ' avec son coût amorti' : ''}.</Text>
    </View>}
  </View>;
}
