import { Stack } from 'expo-router';
import { Colors } from '../../../src/theme/colors';

export default function SubscriptionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="[id]/receipts" />
    </Stack>
  );
}
