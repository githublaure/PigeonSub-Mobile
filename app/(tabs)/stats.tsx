import React from 'react';
import { Text, View } from 'react-native';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { Page, ui } from '../../src/components/ui/Page';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import {
  euro,
  isEnded,
  monthlyCost,
  overview,
} from '../../src/lib/subscription-math';
import { categoryLabels, usageLabels } from '../../src/lib/labels';
import { Colors } from '../../src/theme/colors';
export default function StatsScreen() {
  const { data, follow, loading, error, reload } = useSubscriptionData();
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const summary = overview(data, follow);
  const categories: Record<string, number> = {};
  const usage: Record<string, number> = {};
  for (const sub of data.filter((s) => !isEnded(s, follow[s.id]))) {
    categories[sub.category] =
      (categories[sub.category] ?? 0) + monthlyCost(sub);
    usage[sub.usageFrequency] = (usage[sub.usageFrequency] ?? 0) + 1;
  }
  return (
    <Page
      title="Votre bilan"
      subtitle="Ce que vous payez. Ce que vous pouvez éviter."
    >
      <View style={ui.card}>
        <Text style={ui.label}>COÛT MENSUEL ÉQUIVALENT</Text>
        <Text style={ui.value}>{euro(summary.monthly)}</Text>
        <Text style={ui.body}>
          {euro(summary.annual)} / an · {summary.active} abonnements actifs
        </Text>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Économies potentielles</Text>
        <Text style={[ui.heading, ui.warning]}>
          {euro(summary.potentialAnnual)} / an
        </Text>
        <Text style={ui.body}>
          Résiliations envisagées, encore à terminer auprès des fournisseurs.
        </Text>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Résiliations confirmées par vous</Text>
        <Text style={[ui.heading, ui.success]}>
          {euro(summary.confirmedAnnual)} / an
        </Text>
        <Text style={ui.body}>
          Projection des dépenses évitées après les dates de fin renseignées.
          Les abonnements restent dans le coût actuel jusqu’à leur date de fin.
        </Text>
      </View>
      <Text style={ui.small}>
        Les projections supposent des tarifs constants. Elles ne sont ni un
        remboursement ni une mesure des mouvements de votre compte bancaire. Les
        achats à vie ne sont pas comptés comme des dépenses récurrentes.
      </Text>
      <Text style={ui.heading}>Par catégorie</Text>
      {Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([category, cost]) => (
          <View key={category} style={ui.card}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.body}>
                {categoryLabels[category] ?? category}
              </Text>
              <Text style={ui.body}>{euro(cost)} / mois</Text>
            </View>
            <View
              style={{
                height: 7,
                borderRadius: 4,
                backgroundColor: Colors.surfaceRaised,
              }}
            >
              <View
                style={{
                  width: `${summary.monthly ? (100 * cost) / summary.monthly : 0}%`,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: Colors.primary,
                }}
              />
            </View>
          </View>
        ))}
      <Text style={ui.heading}>Votre utilisation</Text>
      {Object.entries(usage).map(([key, count]) => (
        <Text key={key} style={ui.body}>
          {usageLabels[key] ?? key} : {count}
        </Text>
      ))}
      {!data.length && (
        <Text style={ui.body}>
          Ajoutez votre premier abonnement pour obtenir un bilan personnalisé.
        </Text>
      )}
    </Page>
  );
}
