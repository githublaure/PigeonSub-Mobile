import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import type { Subscription } from '../lib/api';
import { euro, type FollowUps } from '../lib/subscription-math';
import { filterSubscriptions } from '../lib/subscription-views';

export function HomeQuickViews({ data, follow, savings }: { data: Subscription[]; follow: FollowUps; savings: number }) {
  const { colors: c } = useTheme(), router = useRouter();
  const items = [
    { id: 'active', value: String(filterSubscriptions(data, follow, 'active').length), label: 'actifs', hint: 'Voir les abonnements actifs', image: require('../../assets/mascots/pigeon-spray-paint.png') },
    { id: 'soon', value: String(filterSubscriptions(data, follow, 'soon').length), label: 'sous 7 jours', hint: 'Voir les abonnements bientôt renouvelés', image: require('../../assets/mascots/pigeon-money-bag.png') },
    { id: 'savings', value: `${Math.round(savings).toLocaleString('fr-FR')} €`, label: 'env. économisés/an', hint: 'Voir les économies confirmées', image: require('../../assets/mascots/pigeon-microphone.png') },
  ];
  return <View testID="home-quick-views" style={{ flexDirection: 'row', gap: 8 }}>
    {items.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.hint} onPress={() => router.push(item.id === 'savings' ? '/(tabs)/savings' : { pathname: '/(tabs)/subscriptions', params: { view: item.id, select: String(Date.now()) } })} style={{ flex: item.id === 'savings' ? 1.35 : 1, minWidth: 0, borderRadius: 20, padding: 10, gap: 4, borderWidth: 1, borderColor: item.id === 'savings' ? c.goldBorder : c.border, backgroundColor: item.id === 'savings' ? c.goldSurface : c.surface }}>
      <Image source={item.image} accessible={false} resizeMode="contain" style={{ width: 32, height: 34 }} />
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: item.id === 'savings' ? c.gold : c.primary, fontSize: item.id === 'savings' ? 23 : 29, fontWeight: '800' }}>{item.value}</Text>
      <Text style={{ color: c.textSecondary, fontSize: 10 }}>{item.label}</Text>
    </Pressable>)}
  </View>;
}
