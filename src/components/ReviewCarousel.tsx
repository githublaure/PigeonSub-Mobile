import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Subscription } from '../lib/api';
import { deadlines, dayKey, euro, frequencyLabels, shortDate, type FollowUps } from '../lib/subscription-math';
import { reviewCandidates } from '../lib/subscription-views';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/Button';
import { useUI } from './ui/Page';

export function ReviewCarousel({ data, follow }: { data: Subscription[]; follow: FollowUps }) {
  const ui = useUI();
  const { colors: c } = useTheme();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const items = reviewCandidates(data, follow);
  const current = Math.min(index, Math.max(0, items.length - 1));
  const sub = items[current];
  if (!sub) return <View style={ui.card} testID="review-carousel-empty"><Text style={ui.heading}>Abonnements à éviter</Text><Text style={ui.body}>Notez vos abonnements et renseignez leur usage pour repérer ceux à revoir.</Text></View>;
  const dates = deadlines(sub, follow[sub.id]);
  const late = dates.safety && dayKey(dates.safety) < dayKey(new Date());
  const reasons = [sub.usageFrequency === 'rarely_used' ? 'Peu utilisé' : '', sub.rating !== null && sub.rating <= 2 && sub.rating >= 1 ? `${sub.rating}/5 étoiles` : '', follow[sub.id]?.decision === 'cancel_requested' ? 'Résiliation en cours' : ''].filter(Boolean);
  return <View style={[ui.card, { borderColor: c.goldBorder, backgroundColor: c.goldSurface, gap: 12 }]} testID="review-carousel">
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <Text style={[ui.label, { flex: 1, color: c.gold }]}>ABONNEMENTS À ÉVITER</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Abonnement à éviter précédent" disabled={items.length < 2} onPress={() => setIndex((current - 1 + items.length) % items.length)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: items.length < 2 ? .3 : 1 }}><Ionicons name="chevron-back" size={23} color={c.gold} /></Pressable>
      <Text style={ui.small}>{current + 1}/{items.length}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Abonnement à éviter suivant" disabled={items.length < 2} onPress={() => setIndex((current + 1) % items.length)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: items.length < 2 ? .3 : 1 }}><Ionicons name="chevron-forward" size={23} color={c.gold} /></Pressable>
    </View>
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={[ui.value, { color: c.gold }]}>{euro(Number(sub.price.replace(',', '.')))}</Text>
        <Text style={ui.heading}>{sub.name}</Text>
        <Text style={ui.small}>{sub.isTrial ? 'Après essai' : 'Prochaine échéance'} · {shortDate(dates.renewal)} · / {frequencyLabels[sub.frequency]}</Text>
      </View>
      <Image source={require('../../assets/mascots/pigeon-calculator.png')} style={{ width: 80, height: 105 }} resizeMode="contain" accessible={false} />
    </View>
    <View style={ui.row}>{reasons.map(reason => <Text key={reason} style={[ui.pill, { backgroundColor: c.goldSoft, color: c.gold }]}>{reason}</Text>)}</View>
    {late && <Text style={[ui.small, ui.warning]}>Date de sûreté dépassée · vérifiez les conditions pour agir.</Text>}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button title="Voir l’abonnement" onPress={() => router.push(`/(tabs)/subscriptions/${sub.id}`)} style={{ flex: 1 }} />
      <Button title="Me le rappeler" variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/subscriptions/[id]', params: { id: sub.id, focus: 'subscription-safety' } })} style={{ flex: 1 }} />
    </View>
  </View>;
}
