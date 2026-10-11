import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
} from 'expo-router/react-navigation';
import { FeatherRevealOverlay } from '../src/components/onboarding/FeatherRevealOverlay';
import { BillingProvider } from '../src/contexts/BillingContext';
import { ReminderSync } from '../src/contexts/ReminderSync';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { GuideProvider } from '../src/contexts/GuideContext';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator({ onReady }: { onReady: () => void }) {
  const { colors, scheme } = useTheme();
  const { isAuthenticated, isLoading, mode, scope } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments.join('/') === '(auth)/onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/onboarding');
      return;
    } else if (
      isAuthenticated &&
      inAuthGroup &&
      (mode === 'account' || inOnboarding)
    ) {
      router.replace('/(tabs)');
      return;
    }

    onReady();
  }, [isAuthenticated, isLoading, mode, router, segments, onReady]);

  if (isLoading) return null;

  return (
    <NavigationThemeProvider
      value={{
        ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
        colors: {
          ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <GuideProvider><Stack
        key={scope}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="introduction" />
        <Stack.Screen name="+not-found" />
      </Stack></GuideProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [contentReady, setContentReady] = useState(false);
  const [revealing, setRevealing] = useState(true);
  const ready = useCallback(() => setContentReady(true), []);
  const finish = useCallback(() => setRevealing(false), []);
  return (
    <View style={{ flex: 1, backgroundColor: '#6226FB' }}>
      <View
        style={{ flex: 1 }}
        pointerEvents={revealing ? 'none' : 'auto'}
        accessibilityElementsHidden={revealing}
        importantForAccessibility={revealing ? 'no-hide-descendants' : 'auto'}
      >
        <ThemeProvider>
          <AuthProvider>
            <BillingProvider>
              <RootNavigator onReady={ready} />
              <ReminderSync />
            </BillingProvider>
          </AuthProvider>
        </ThemeProvider>
      </View>
      {revealing && (
        <FeatherRevealOverlay contentReady={contentReady} onFinished={finish} />
      )}
    </View>
  );
}
