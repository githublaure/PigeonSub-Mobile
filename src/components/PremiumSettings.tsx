import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBilling } from '../contexts/BillingContext';
import { useTheme } from '../contexts/ThemeContext';
import { useGuide } from '../contexts/GuideContext';
import { GuideAnchor } from './guide/GuideScrollView';
import { Button } from './ui/Button';
import { PlusBadge } from './ui/PlusBadge';
import { useUI } from './ui/Page';
export function PremiumSettings() {
  const { colors: c } = useTheme();
  const { isPlus } = useBilling();
  const ui = useUI();
  const router = useRouter();
  const guide = useGuide();
  return <GuideAnchor id="premium-settings"><View style={{ gap: 12 }}>
    <View testID="settings-premium" style={[ui.card, { backgroundColor: c.goldSurface, borderColor: c.goldBorder }]}>
      <View style={ui.row}><PlusBadge reason="settings" /><Text style={[ui.heading, { flex: 1 }]}>{isPlus ? 'Votre accès Premium est actif' : 'Passez à PigeonSub Plus'}</Text></View>
      <Text style={ui.body}>Abonnements illimités, simulations avancées et historique de vos décisions.</Text>
      <Button title={isPlus ? 'Gérer mon offre Premium' : 'Passer à Premium'} onPress={() => router.push('/(tabs)/premium?reason=settings')} />
    </View>
    <Button title="Revoir le guide pas à pas" accessibilityHint="Visite d’un compte démo prérempli, puis retour à votre espace." variant="secondary" onPress={() => guide?.start()} />
  </View></GuideAnchor>;
}
