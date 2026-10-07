import React from 'react';
import { Image, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { euro } from '../lib/subscription-math';

export function HomeSavingsCard({ monthly, potentialAnnual, confirmedAnnual, pendingNames, onDetails, budget }: {
  monthly: number; potentialAnnual: number; confirmedAnnual: number; pendingNames: string[];
  onDetails: () => void; budget?: React.ReactNode;
}) {
  const { colors: c, scheme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const amountColor = scheme === 'dark' ? '#F2C56B' : '#AD7008';
  const card = { borderRadius: 26, borderWidth: 1, padding: 17, gap: 9, boxShadow: '0 6px 22px rgba(109, 40, 217, 0.07)' };
  return <View style={{ gap: 14 }} testID="home-summary">
    <View style={[card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {fontScale < 1.5 && <Image source={require('../../assets/mascots/pigeon-spray-paint.png')} resizeMode="contain" accessible={false} style={{ width: 66, height: 86 }} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: c.text, fontSize: 35, fontWeight: '800', letterSpacing: -1 }}>{euro(monthly)}<Text style={{ fontSize: 12, fontWeight: '500', letterSpacing: 0 }}> / mois</Text></Text>
          <Text style={{ color: c.textSecondary, fontSize: 17, fontWeight: '600' }}>{euro(monthly * 12)}<Text style={{ fontSize: 11, fontWeight: '400' }}> / an estimés</Text></Text>
          <Text style={{ color: c.textMuted, fontSize: 11 }}>Dépenses actuelles</Text>
        </View>
      </View>
      {budget}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Voir le calcul des économies : ${euro(confirmedAnnual)} par an estimés, résiliations confirmées`} onPress={onDetails} style={({ pressed }) => [card, { backgroundColor: c.goldSurface, borderColor: c.goldBorder, opacity: pressed ? .75 : 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text testID="home-confirmed-amount" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.65} style={{ color: amountColor, fontSize: 48, fontWeight: '800', letterSpacing: -1.7 }}>{euro(confirmedAnnual)}</Text>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>économisés / an estimés</Text>
          <Text style={{ color: c.textSecondary, fontSize: 11 }}>Résiliations confirmées</Text>
        </View>
        {fontScale < 1.5 && <Image source={require('../../assets/mascots/pigeon-calculator.png')} resizeMode="contain" accessible={false} style={{ width: 76, height: 104 }} />}
      </View>
      <View style={{ borderTopWidth: 1, borderColor: c.goldBorder, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text testID="home-potential-amount" style={{ color: c.gold, fontSize: 20, fontWeight: '800' }}>+ {euro(potentialAnnual)}<Text style={{ fontSize: 11, fontWeight: '500' }}> / an possibles</Text></Text>
          <Text style={{ color: c.textSecondary, fontSize: 11 }}>{pendingNames.length ? `Si vous résiliez ${pendingNames.length === 1 ? pendingNames[0] : `les ${pendingNames.length} abonnements sélectionnés`}` : 'Sélectionnez un abonnement à résilier'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={c.gold} />
      </View>
      <Text style={{ color: c.gold, fontSize: 11, fontWeight: '600' }}>Voir le calcul →</Text>
    </Pressable>
  </View>;
}
