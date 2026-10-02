import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments.join('/') === '(auth)/onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/onboarding');
      return;
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
      return;
    }

    // The onboarding reveal hides the native splash only after both its
    // content and the mask are ready, preventing a blank intermediate frame.
    if (!isAuthenticated && inOnboarding) return;

    void SplashScreen.hideAsync();
  }, [isAuthenticated, isLoading, router, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
