import { useTheme } from '../../../src/contexts/ThemeContext';
import { Stack } from 'expo-router';

export default function SubscriptionsLayout() {
  const { colors: Colors } = useTheme();

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
      <Stack.Screen name="import" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="[id]/receipts" />
    </Stack>
  );
}
