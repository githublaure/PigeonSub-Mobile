import { useThemedStyles } from '../src/contexts/ThemeContext';
import type { Palette } from '../src/theme/colors';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: true }} />
      <View style={styles.container}>
        <Text style={styles.title}>🐦 Lost pigeon</Text>
        <Text style={styles.message}>This screen doesn't exist.</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Go home</Text>
        </Link>
      </View>
    </>
  );
}

const createStyles = (Colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { color: Colors.text, fontSize: 24, fontWeight: '700' },
  message: { color: Colors.textSecondary, fontSize: 16 },
  link: { marginTop: 8 },
  linkText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
});
