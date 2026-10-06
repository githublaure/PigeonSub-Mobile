import React, { useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import {
  euro,
  isEnded,
  monthlyCost,
  overview,
} from '../../src/lib/subscription-math';
import { costProjection } from '../../src/lib/stats-projection';
import { categoryLabels } from '../../src/lib/labels';

export default function StatsScreen() {
  const { colors: c } = useTheme();
  const ui = useUI();
  const router = useRouter();
  const [months, setMonths] = useState(6);
  const { data, follow, loading, error, reload } = useSubscriptionData();
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const summary = overview(data, follow);
  const active = data.filter((s) => !isEnded(s, follow[s.id]));
  const categories: Record<string, number> = {};
  for (const sub of active)
    categories[sub.category] =
      (categories[sub.category] ?? 0) + monthlyCost(sub);
  const groups = Object.entries(categories)
    .filter(([, cost]) => cost > 0)
    .sort((a, b) => b[1] - a[1]);
  const palette = [
    c.primary,
    '#C69437',
    '#4382C4',
    '#449D9A',
    '#AD7298',
    '#7D859B',
  ];
  const projection = costProjection(data, follow, months);
  const max = Math.max(1, ...projection.map((p) => p.amount));
  const points = projection.map((p, i) => [
    12 + (i * 276) / (months - 1),
    108 - (p.amount / max) * 80,
  ]);
  const line = points
    .map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`)
    .join(' ');
  const ended = data.filter(
    (s) =>
      follow[s.id]?.decision === 'cancel_confirmed' && isEnded(s, follow[s.id]),
  ).length;
  const underused = active.filter((s) => s.usageFrequency === 'rarely_used');
  let offset = 0;
  return (
    <Page title="Stats" subtitle="Moins d’abos. Plus de projets.">
      <Text
        style={{
          fontSize: 36,
          lineHeight: 42,
          color: c.text,
          fontFamily: Platform.select({
            ios: 'Georgia',
            android: 'serif',
            web: 'Georgia',
          }),
        }}
      >
        Vos chiffres, en clair.
      </Text>
      <View style={ui.card}>
        <View style={[ui.row, { alignItems: 'center' }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={ui.label}>COÛT MENSUEL ÉQUIVALENT</Text>
            <Text style={ui.value}>{euro(summary.monthly)}</Text>
            <Text style={ui.small}>
              {euro(summary.annual)} / an · {summary.active} actifs
            </Text>
          </View>
          <Image
            source={require('../../assets/mascots/pigeon-money-bag.png')}
            style={{ width: 66, height: 84 }}
            resizeMode="contain"
            accessible={false}
          />
        </View>
        <View
          style={[
            ui.row,
            {
              backgroundColor: c.surfaceRaised,
              borderRadius: 16,
              padding: 4,
              gap: 4,
            },
          ]}
        >
          {[3, 6, 12].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityLabel={`Projection ${n} mois`}
              accessibilityState={{ checked: months === n }}
              aria-checked={months === n}
              onPress={() => setMonths(n)}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: months === n ? c.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  color: months === n ? c.white : c.textSecondary,
                  fontWeight: '600',
                }}
              >
                {n === 12 ? '1 an' : `${n} mois`}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={ui.small}>Projection du coût mensuel en fin de mois</Text>
        <View
          accessible
          accessibilityLabel={projection
            .map((p) => `${p.month} : ${euro(p.amount)}`)
            .join(', ')}
        >
          <Svg width="100%" height={120} viewBox="0 0 300 120">
            <Path
              d={`${line} L 288 112 L 12 112 Z`}
              fill={c.primary}
              opacity={0.09}
            />
            <Path d={line} fill="none" stroke={c.primary} strokeWidth={2.5} />
            {points.map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={3.5} fill={c.primary} />
            ))}
          </Svg>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            {projection.map((p, i) =>
              months < 12 || i % 3 === 0 || i === 11 ? (
                <Text key={p.month} style={[ui.small, { fontSize: 10 }]}>
                  {p.label}
                </Text>
              ) : null,
            )}
          </View>
        </View>
        <Text style={[ui.small, { color: c.primary }]}>
          À l’horizon choisi : {euro(projection[months - 1].amount)} / mois
        </Text>
        <Text style={ui.small}>
          À tarifs constants, en tenant compte des fins confirmées. Ce graphique
          est une projection, pas un historique bancaire.
        </Text>
      </View>
      <View
        style={[
          ui.card,
          { borderColor: c.goldBorder, backgroundColor: c.goldSurface },
        ]}
      >
        <Text style={[ui.label, { color: c.gold }]}>
          CE QUE VOUS POUVEZ ÉVITER
        </Text>
        <Text style={[ui.value, { color: c.gold }]}>
          {euro(summary.potentialAnnual)}{' '}
          <Text style={{ fontSize: 17 }}>/ an</Text>
        </Text>
        <Text style={ui.body}>
          Économies potentielles · démarches encore à terminer.
        </Text>
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: c.goldBorder,
            paddingTop: 14,
            gap: 5,
          }}
        >
          <Text style={[ui.heading, { color: c.gold }]}>
            {euro(summary.confirmedAnnual)} / an confirmées
          </Text>
          <Text style={ui.small}>
            Selon vos confirmations de résiliation · {ended} abonnement
            {ended > 1 ? 's' : ''} déjà terminé{ended > 1 ? 's' : ''}.
          </Text>
        </View>
        <Text style={ui.small}>
          Dépenses annuelles évitables après résiliation ; aucune économie
          encaissée n’est déduite d’un simple clic.
        </Text>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Où part votre argent ?</Text>
        {groups.length ? (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View
                accessible
                accessibilityLabel={`Répartition du coût mensuel : ${groups.map(([key, cost]) => `${categoryLabels[key] ?? key} ${Math.round((cost / summary.monthly) * 100)} %`).join(', ')}`}
              >
                <Svg width={150} height={150} viewBox="0 0 150 150">
                  <Circle
                    cx={75}
                    cy={75}
                    r={56}
                    fill="none"
                    stroke={c.surfaceRaised}
                    strokeWidth={18}
                  />
                  {groups.map(([key, cost], i) => {
                    const length = (cost / summary.monthly) * 351.86;
                    const start = offset;
                    offset += length;
                    return (
                      <Circle
                        key={key}
                        cx={75}
                        cy={75}
                        r={56}
                        fill="none"
                        stroke={palette[i % palette.length]}
                        strokeWidth={18}
                        strokeDasharray={`${length} ${351.86 - length}`}
                        strokeDashoffset={-start}
                        transform="rotate(-90 75 75)"
                      />
                    );
                  })}
                </Svg>
              </View>
            </View>
            {groups.map(([key, cost], i) => (
              <View key={key} style={ui.row}>
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: palette[i % palette.length],
                  }}
                />
                <Text style={[ui.body, { flex: 1 }]}>
                  {categoryLabels[key] ?? key}
                </Text>
                <Text style={[ui.small, { color: c.text }]}>
                  {euro(cost)} · {Math.round((cost / summary.monthly) * 100)} %
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={ui.body}>
            Ajoutez un abonnement pour découvrir votre répartition.
          </Text>
        )}
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Payés, mais peu utilisés</Text>
        <Text style={ui.small}>
          Selon l’utilisation que vous avez renseignée.
        </Text>
        {underused.length ? (
          underused.map((sub) => (
            <Pressable
              key={sub.id}
              accessibilityRole="button"
              accessibilityLabel={`Revoir ${sub.name}`}
              onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)}
              style={[
                ui.row,
                {
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: c.divider,
                },
              ]}
            >
              <Text style={[ui.body, { flex: 1, color: c.text }]}>
                {sub.name}
              </Text>
              <Text style={{ color: c.gold, fontWeight: '700' }}>
                {euro(monthlyCost(sub))} / mois →
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={ui.body}>
            Aucun abonnement signalé comme peu utilisé.
          </Text>
        )}
        <Button
          title="Faire le tri dans mes abonnements"
          variant="secondary"
          onPress={() => router.push('/(tabs)/subscriptions')}
        />
      </View>
      <Text style={ui.small}>
        Les achats à vie sont exclus des dépenses récurrentes. Les essais
        utilisent le tarif après essai. Les montants restent des estimations,
        sans vérification bancaire.
      </Text>
    </Page>
  );
}
