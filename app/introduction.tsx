import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingContent } from './(auth)/onboarding';
import { FeatherRevealOverlay } from '../src/components/onboarding/FeatherRevealOverlay';

// Replays the introduction without changing session, token or personal data.
export default function IntroductionScreen() {
  const router = useRouter();
  const [revealing, setRevealing] = useState(true);
  const finish = useCallback(() => setRevealing(false), []);
  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1 }} pointerEvents={revealing ? 'none' : 'auto'} accessibilityElementsHidden={revealing} importantForAccessibility={revealing ? 'no-hide-descendants' : 'auto'}>
      <OnboardingContent replay onFinish={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')} />
    </View>
    {revealing && <FeatherRevealOverlay contentReady onFinished={finish} />}
  </View>;
}
