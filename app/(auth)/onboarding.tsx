import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { FeatherRevealOverlay } from '../../src/components/onboarding/FeatherRevealOverlay';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/theme/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    imageSource: require('../../assets/mascots/pigeon-money-bag.png'),
    title: 'Stop being a pigeon',
    subtitle: 'Track every subscription you pay for — and stop paying for ones you forgot about.',
  },
  {
    key: '2',
    imageSource: require('../../assets/mascots/pigeon-spray-paint.png'),
    title: 'Renewals before they hit',
    subtitle: 'Get ahead of charges with a calendar view and upcoming-renewal alerts.',
  },
  {
    key: '3',
    imageSource: require('../../assets/mascots/pigeon-microphone.png'),
    title: 'AI voice reminders',
    subtitle: 'Generate personalised voice nudges powered by ElevenLabs — in your style.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [contentReady, setContentReady] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) setCurrentIndex(viewableItems[0].index ?? 0);
    }
  ).current;

  const isLast = currentIndex === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      router.push('/(auth)/register');
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  return (
    <View style={styles.screen} onLayout={() => setContentReady(true)}>
      <SafeAreaView style={styles.safe}>
        {/* Skip */}
        <View style={styles.header}>
          <Text style={styles.logo}>🐦 PigeonSub</Text>
          <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={12}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <View style={styles.iconCircle}>
                <Image source={item.imageSource} style={styles.slideImage} resizeMode="contain" />
              </View>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
            </View>
          )}
        />

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* CTA */}
        <View style={styles.actions}>
          <Button
            title={isLast ? 'Get started' : 'Next'}
            onPress={next}
            fullWidth
            size="lg"
          />
          {isLast && (
            <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={8}>
              <Text style={styles.loginLink}>
                Already have an account?{' '}
                <Text style={styles.loginLinkBold}>Sign in</Text>
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      <FeatherRevealOverlay
        contentReady={contentReady}
        enabled={!isLoading && !isAuthenticated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  logo: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  skip: { color: Colors.textSecondary, fontSize: 15 },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideImage: { width: 136, height: 136 },
  slideTitle: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  slideSubtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
    alignItems: 'center',
  },
  loginLink: { color: Colors.textSecondary, fontSize: 14 },
  loginLinkBold: { color: Colors.primary, fontWeight: '700' },
});
