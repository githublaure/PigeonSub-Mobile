import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Subscription } from '../lib/api';
import type { CategoryCost, CategoryGroup } from '../lib/category-breakdown';
import { usageLabels } from '../lib/labels';
import { useCategoryCatalog } from '../hooks/useCategoryCatalog';
import { categoryName } from '../lib/category-catalog';
import { currentMonthlyCost, euro, parseDay, shortDate } from '../lib/subscription-math';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from './ui/Page';

function DetailRow({ sub, subtitle, cost }: { sub: Subscription; subtitle?: string; cost?: CategoryCost }) {
  const router = useRouter();
  const { colors: c } = useTheme();
  const ui = useUI();
  const price = sub.frequency === 'lifetime'
    ? 'Achat unique'
    : sub.isTrial ? 'Essai' : `${euro(currentMonthlyCost(sub))}/mois`;
  const detail = cost?.amortization
    ? `Achat à vie · ${euro(cost.amortization.paid)} payés une fois. ${euro(cost.monthly)}/mois amortis, du ${parseDay(cost.amortization.startsOn)!.toLocaleDateString('fr-FR')} au ${parseDay(cost.amortization.endsOn)!.toLocaleDateString('fr-FR')} exclu. Aucun prélèvement récurrent.`
    : cost ? `${euro(cost.monthly)}/mois` : subtitle;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Voir ${sub.name}${detail ? `. ${detail}` : ''}`}
      onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 4 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[ui.body, { fontWeight: '600' }]}>{sub.name}</Text>
        {detail ? <Text style={ui.small}>{detail}</Text> : null}
      </View>
      {!cost && <Text style={[ui.small, { color: c.textSecondary }]}>{price}</Text>}
      <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
    </Pressable>
  );
}

export function CategoryDrilldown({ groups, analytical, palette }: {
  groups: CategoryGroup[]; analytical: boolean; palette: string[];
}) {
  const { colors: c } = useTheme();
  const ui = useUI();
  const catalog = useCategoryCatalog();
  const [selected, setSelected] = useState<string | null>(null);
  const category = groups.find(group => group.key === selected);
  return (
    <View testID="stats-category-details" style={{ flex: 1, gap: 5 }}>
      {groups.map(({ key, monthly, percent }, index) => (
        <Pressable key={key} accessibilityRole="button"
          accessibilityLabel={`Voir les abonnements : ${categoryName(key, catalog)}, ${euro(monthly)} par mois${analytical ? ' en comparaison analytique' : ''}, ${percent} %`}
          accessibilityState={{ expanded: selected === key }}
          onHoverIn={() => setSelected(key)}
          onFocus={() => setSelected(key)}
          onPress={() => setSelected(key)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 6, paddingVertical: 6,
            minHeight: 44, borderRadius: 10, backgroundColor: selected === key ? c.surfaceRaised : 'transparent' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette[index % palette.length] }} />
          <Text style={[ui.small, { flex: 1 }]}>{categoryName(key, catalog)}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[ui.small, { color: c.text, fontWeight: '600' }]}>{euro(monthly)}</Text>
            <Text style={ui.small}>{percent} %</Text>
          </View>
          <Ionicons name={selected === key ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
        </Pressable>
      ))}
      {category ? (
        <View testID="stats-category-preview" style={{ padding: 10, borderRadius: 13,
          backgroundColor: c.surfaceRaised, borderColor: c.border, borderWidth: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={[ui.heading, { fontSize: 14 }]}>{categoryName(category.key, catalog)} · {category.items.length}</Text>
              <Text style={ui.small}>{euro(category.monthly)}/mois{analytical ? ' · comparaison analytique' : ''}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer les détails"
              onPress={() => setSelected(null)} style={{ padding: 9, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={c.textMuted} />
            </Pressable>
          </View>
          {category.items.map(cost => <DetailRow key={cost.sub.id} sub={cost.sub} cost={cost} />)}
        </View>
      ) : null}
    </View>
  );
}

export function OtherStats({ active, wide }: { active: Subscription[]; wide: boolean }) {
  const { colors: c } = useTheme();
  const ui = useUI();
  const [usageSelected, setUsageSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<'trials' | 'suspects' | null>(null);
  const levels = ['very_used', 'used', 'rarely_used'] as const;
  const usageRows = levels.map(key => ({
    key, label: usageLabels[key], subs: active.filter(sub => sub.usageFrequency === key),
  }));
  const unknown = active.filter(sub => !levels.some(key => sub.usageFrequency === key));
  if (unknown.length) usageRows.push({ key: 'unknown' as typeof levels[number], label: 'Non renseigné', subs: unknown });
  const chosen = usageRows.find(row => row.key === usageSelected);
  const trials = active.filter(sub => sub.isTrial).sort((a, b) => (a.trialEndsAt ?? '').localeCompare(b.trialEndsAt ?? ''));
  const suspects = active.filter(sub => sub.isSuspect);
  const group = (key: 'trials' | 'suspects', title: string, subs: Subscription[]) => (
    <View testID={`stats-${key}-details`} style={[ui.card, { flex: 1, gap: 9 }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === key }}
        accessibilityLabel={`Voir ${title.toLowerCase()}`}
        onHoverIn={() => setExpanded(key)}
        onPress={() => setExpanded(current => current === key ? null : key)}
        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[ui.heading, { flex: 1 }]}>{title} ({subs.length})</Text>
        <Ionicons name={expanded === key ? 'chevron-up' : 'chevron-down'} color={c.primary} size={18} />
      </Pressable>
      {expanded === key ? (
        subs.length ? <View>
          {subs.map(sub => <DetailRow key={sub.id} sub={sub} subtitle={key === 'trials'
            ? `Fin annoncée : ${shortDate(parseDay(sub.trialEndsAt))}`
            : 'Marqué à vérifier par vous'} />)}
          {key === 'suspects' ? <Text style={ui.small}>Signalement manuel, sans vérification automatique de fraude.</Text> : null}
        </View> : <Text style={ui.small}>Aucun abonnement dans cette rubrique.</Text>
      ) : <Text style={ui.small}>Touchez pour voir les abonnements concernés.</Text>}
    </View>
  );
  return (
    <View testID="stats-usage-trials-suspects" style={{ gap: 14 }}>
      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.heading}>Usage de vos abonnements</Text>
        <Text style={ui.small}>Répartition sur {active.length} abonnements actifs · touchez une ligne pour le détail.</Text>
        {usageRows.map(row => (
          <Pressable key={row.key} accessibilityRole="button"
            accessibilityLabel={`Voir ${row.subs.length} abonnements : ${row.label}`}
            accessibilityState={{ expanded: usageSelected === row.key }}
            onHoverIn={() => setUsageSelected(row.key)}
            onPress={() => setUsageSelected(current => current === row.key ? null : row.key)}
            style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12,
              flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 57,
              backgroundColor: usageSelected === row.key ? c.surfaceRaised : c.surface }}>
            <View style={{ flex: 1 }}>
              <Text style={[ui.body, { fontWeight: '600' }]}>{row.label}</Text>
              <Text style={ui.small}>{row.subs.length} abonnement{row.subs.length !== 1 ? 's' : ''}</Text>
            </View>
            <Text style={{ color: c.primary, fontWeight: '700' }}>
              {active.length ? Math.round(row.subs.length / active.length * 100) : 0} %
            </Text>
            <Ionicons name="chevron-down" size={15} color={c.textMuted} />
          </Pressable>
        ))}
        {chosen ? <View testID="stats-usage-preview"
          style={{ borderRadius: 12, padding: 12, backgroundColor: c.surfaceRaised }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[ui.heading, { flex: 1, fontSize: 15 }]}>{chosen.label} · {chosen.subs.length}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer les détails d'usage"
              onPress={() => setUsageSelected(null)} style={{ padding: 8 }}>
              <Ionicons name="close" size={18} color={c.textMuted} />
            </Pressable>
          </View>
          {chosen.subs.map(sub => <DetailRow key={sub.id} sub={sub} />)}
        </View> : null}
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
        {group('trials', 'Essais gratuits', trials)}
        {group('suspects', 'Abonnements à vérifier', suspects)}
      </View>
    </View>
  );
}
