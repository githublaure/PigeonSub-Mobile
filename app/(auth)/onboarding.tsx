import { ThemeControls } from '../../src/components/ThemeControls';
import { useThemedStyles } from '../../src/contexts/ThemeContext';
import type { Palette } from '../../src/theme/colors';
import { Alert } from 'react-native';
import React, { useRef, useState } from 'react';
import {
  useWindowDimensions,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { useAuth } from '../../src/contexts/AuthContext';

const SLIDES = [
  {
    key: '1',
    imageSource: require('../../assets/mascots/pigeon-money-bag.png'),
    title: 'Vos abonnements, enfin sous contrôle',
    subtitle:
      'Découvrez ce que vous payez chaque mois et chaque année. Gardez ce qui compte vraiment.',
  },
  {
    key: '2',
    imageSource: require('../../assets/mascots/pigeon-spray-paint.png'),
    title: 'La bonne alerte, avant le jour J',
    subtitle:
      'Repérez le prochain prélèvement et la date limite pour agir, selon le préavis de votre abonnement.',
  },
  {
    key: '3',
    imageSource: require('../../assets/mascots/pigeon-microphone.png'),
    title: 'Conserver ou résilier ? À vous de choisir.',
    subtitle:
      'Visualisez vos économies potentielles, puis confirmez vos résiliations. Commencez avec 5 abonnements gratuits.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const styles = useThemedStyles(createStyles);

  const { startGuest, demoLogin } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentIndex(
      Math.max(
        0,
        Math.min(
          SLIDES.length - 1,
          Math.round(event.nativeEvent.contentOffset.x / width),
        ),
      ),
    );
  };

  const isLast = currentIndex === SLIDES.length - 1;

  const [busy, setBusy] = useState(false);
  const start = async (demo = false) => {
    if (busy) return;
    setBusy(true);
    try {
      await (demo ? demoLogin() : startGuest());
    } catch {
      Alert.alert('Impossible de démarrer', 'Réessayez dans un instant.');
    } finally {
      setBusy(false);
    }
  };
  const goTo = (index: number) => {
    setCurrentIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };
  const next = () => {
    if (isLast) {
      void start();
    } else {
      goTo(currentIndex + 1);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        {/* Skip */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image
              source={require('../../assets/icons/navigation/plume-tab-filled.png')}
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
              accessibilityLabel="Plume PigeonSub"
            />
            <Text style={styles.logo}>PigeonSub</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemeControls compact />
            <Pressable
              onPress={() => void start()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Passer l’introduction"
              accessibilityState={{ disabled: busy }}
              style={{ minHeight: 44, justifyContent: 'center' }}
              hitSlop={8}
            >
              <Text style={styles.skip}>Passer</Text>
            </Pressable>
          </View>
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          onMomentumScrollEnd={onScrollEnd}
          extraData={width}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={styles.iconCircle}>
                <Image
                  source={item.imageSource}
                  style={styles.slideImage}
                  resizeMode="contain"
                />
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
            title={isLast ? 'Commencer' : 'Suivant'}
            loading={busy}
            onPress={next}
            fullWidth
            size="lg"
          />
          {isLast && (
            <Button
              title="Explorer la démo"
              variant="secondary"
              fullWidth
              disabled={busy}
              onPress={() => void start(true)}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (Colors: Palette) =>
  StyleSheet.create({
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
