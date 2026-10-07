import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from './ui/Button';
import { useUI } from './ui/Page';
export function ProductTools() {
  const router = useRouter(), ui = useUI();
  return <View style={ui.card}>
    <Button title="Notifications · vérifier mes rappels" variant="ghost" onPress={() => router.push('/(tabs)/reminders')} />
    <Button title="Les prochaines évolutions · donner mon avis" variant="ghost" onPress={() => router.push('/(tabs)/roadmap')} />
  </View>;
}
