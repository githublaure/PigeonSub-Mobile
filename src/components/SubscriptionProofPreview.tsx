import React, { useCallback, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import type { Subscription } from '../lib/api';
import { getPhotos, type Photo } from '../lib/subscription-photos';
import { Button } from './ui/Button';
import { useUI } from './ui/Page';

export function SubscriptionProofPreview({ sub }: { sub: Subscription }) {
  const ui = useUI();
  const { scope } = useAuth();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  useFocusEffect(useCallback(() => {
    let alive = true;
    setPhotos([]);
    getPhotos(scope, sub).then(rows => { if (alive) setPhotos(rows); }).catch(() => undefined);
    return () => { alive = false; };
  }, [scope, sub]));
  const open = () => router.push(`/(tabs)/subscriptions/${sub.id}/receipts`);
  if (!photos.length) return <Button title="Photos et justificatifs" variant="secondary" onPress={open} />;
  return <View style={ui.card} testID="subscription-proof-preview">
    <Text style={ui.heading}>Vos justificatifs</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Voir les ${photos.length} justificatifs de ${sub.name}`} onPress={open} style={{ flexDirection: 'row', gap: 8 }}>
      {photos.slice(0, 3).map(photo => <Image key={photo.id} source={{ uri: photo.uri }} style={{ flex: 1, height: 114, borderRadius: 8 }} resizeMode="contain" accessible={false} />)}
    </Pressable>
    <Button title={`Photos et justificatifs (${photos.length})`} variant="secondary" onPress={open} />
  </View>;
}
