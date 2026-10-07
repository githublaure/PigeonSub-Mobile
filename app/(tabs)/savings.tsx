import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSubscriptionData } from '../../src/hooks/useSubscriptionData';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { euro, overview } from '../../src/lib/subscription-math';
import { annualSavingsCalculation, savingsBreakdown } from '../../src/lib/savings-breakdown';

export default function SavingsScreen() {
  const ui = useUI();
  const { colors: c } = useTheme();
  const { mode } = useAuth();
  const router = useRouter();
  const { data, follow, loading, error, reload } = useSubscriptionData();
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const summary = overview(data, follow);
  const details = savingsBreakdown(data, follow);
  return <Page title="Le calcul de vos économies">
    <Button title="Retour" variant="ghost" onPress={() => router.back()} />
    {mode === 'demo' && <Text style={ui.small}>Démo · montants et justificatifs fictifs.</Text>}
    <View style={ui.card} testID="savings-pending-total">
      <Text style={ui.heading}>Si vous terminez vos résiliations</Text>
      <Text style={[ui.value, { color: c.gold }]}>{euro(summary.potentialAnnual)} / an</Text>
      <Text style={ui.body}>Ce montant vient des abonnements marqués « À résilier ». La démarche reste à terminer auprès du fournisseur.</Text>
    </View>
    {details.pending.length === 0 && <Text style={ui.body}>Aucune résiliation en cours. Marquez un abonnement « À résilier » pour voir son coût annuel évitable.</Text>}
    {details.pending.map(({ sub, annual }) => <View key={sub.id} style={ui.card} testID={`savings-pending-${sub.id}`}>
      <Text style={ui.heading}>{sub.name}</Text>
      <Text style={ui.body}>{annualSavingsCalculation(sub)} = {euro(annual)} / an</Text>
      {sub.isTrial && <Text style={ui.small}>Calcul au tarif prévu après l’essai ; aucun paiement confirmé pendant l’essai.</Text>}
      <Text style={[ui.small, ui.warning]}>Résiliation en cours · économie encore potentielle</Text>
      <Button title={`Continuer pour ${sub.name}`} onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)} />
    </View>)}
    <View style={ui.card} testID="savings-confirmed-total">
      <Text style={ui.heading}>Résiliations confirmées</Text>
      <Text style={[ui.value, { color: c.success }]}>{euro(summary.confirmedAnnual)} / an</Text>
      <Text style={ui.body}>Coût annuel des abonnements dont vous avez confirmé la résiliation. C’est une estimation annualisée, pas une somme déjà remboursée.</Text>
      {details.confirmed.map(({ sub, annual }) => <View key={sub.id} style={{ gap: 5, paddingTop: 8 }}>
        <Text style={ui.heading}>{sub.name}</Text>
        <Text style={ui.small}>{annualSavingsCalculation(sub)} = {euro(annual)} / an</Text>
        <Button title={`Voir ${sub.name}`} variant="secondary" onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)} />
      </View>)}
    </View>
    <Text style={ui.small}>Les montants supposent des tarifs inchangés sur un an. Une simulation de budget, une mauvaise note ou un coupon ne compte pas comme une résiliation.</Text>
  </Page>;
}
