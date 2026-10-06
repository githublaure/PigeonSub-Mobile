import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
} from 'expo-router/react-navigation';
import { LoadingScreen } from '../src/components/ui/LoadingScreen';
import { BillingProvider } from '../src/contexts/BillingContext';
import { ReminderSync } from '../src/contexts/ReminderSync';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
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

    // The onboarding reveal hides the native splash only after both its
    // content and the mask are ready, preventing a blank intermediate frame.
    if (!isAuthenticated && inOnboarding) return;

    void SplashScreen.hideAsync();
  }, [isAuthenticated, isLoading, mode, router, segments]);

  if (isLoading) return <LoadingScreen />;

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
      <Stack
        key={scope}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BillingProvider>
          <RootNavigator />
          <ReminderSync />
        </BillingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
