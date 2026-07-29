import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Colors } from '../../src/theme/colors';

const FREE_FEATURES = [
  'Track up to 5 subscriptions',
  'Renewals calendar',
  'Basic statistics',
  'Email password reset',
];

const PREMIUM_FEATURES = [
  'Unlimited subscriptions',
  'AI voice reminders (ElevenLabs)',
  'Advanced statistics & lifetime view',
  'Receipt photo attachments',
  'Budget caps & monthly overrides',
  'Suspect subscription detection',
  'Priority support',
];

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons
        name={included ? 'checkmark-circle' : 'close-circle-outline'}
        size={18}
        color={included ? Colors.success : Colors.textMuted}
      />
      <Text style={[styles.featureLabel, !included && styles.featureLabelMuted]}>
        {label}
      </Text>
    </View>
  );
}

export default function PremiumScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={26} color={Colors.text} />
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🎩 PREMIUM</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Stop being a pigeon.{'\n'}For real this time.</Text>
          <Text style={styles.heroSubtitle}>
            Unlock the full PigeonSub experience with unlimited subscriptions, AI voice reminders, and deep analytics.
          </Text>
        </View>

        {/* Plan cards */}
        <View style={styles.plansRow}>
          {/* Free */}
          <Card style={[styles.planCard, styles.planCardFree]}>
            <Text style={styles.planTitle}>Free</Text>
            <Text style={styles.planPrice}>€0</Text>
            <Text style={styles.planPeriod}>forever</Text>
            <View style={styles.featureList}>
              {FREE_FEATURES.map((f) => <FeatureRow key={f} label={f} included={true} />)}
            </View>
          </Card>

          {/* Premium */}
          <Card style={[styles.planCard, styles.planCardPremium]} elevated>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>BEST VALUE</Text>
            </View>
            <Text style={[styles.planTitle, { color: Colors.white }]}>Premium</Text>
            <Text style={[styles.planPrice, { color: Colors.white }]}>€4.99</Text>
            <Text style={[styles.planPeriod, { color: '#C4B5FD' }]}>per month</Text>
            <View style={styles.featureList}>
              {PREMIUM_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#A78BFA" />
                  <Text style={[styles.featureLabel, { color: Colors.white }]}>{f}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Button
            title="Upgrade to Premium"
            onPress={() => {
              // Premium purchase integration coming soon (RevenueCat)
            }}
            fullWidth
            size="lg"
            style={styles.ctaButton}
          />
          <Text style={styles.ctaNote}>
            🚧 In-app purchase coming soon. Powered by RevenueCat.
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.maybeLater}>Maybe later</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 48 },
  header: { paddingHorizontal: 20, paddingTop: 12, alignItems: 'flex-end' },
  hero: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28, gap: 12 },
  badgeRow: { flexDirection: 'row' },
  badge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { color: Colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: Colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  heroSubtitle: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22 },
  plansRow: { paddingHorizontal: 24, gap: 16 },
  planCard: { gap: 12 },
  planCardFree: {},
  planCardPremium: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  popularBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  popularText: { color: Colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  planTitle: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  planPrice: { color: Colors.text, fontSize: 40, fontWeight: '900' },
  planPeriod: { color: Colors.textSecondary, fontSize: 13, marginTop: -8 },
  featureList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 24 },
  featureLabel: { color: Colors.text, fontSize: 14, flex: 1 },
  featureLabelMuted: { color: Colors.textMuted },
  cta: { paddingHorizontal: 24, paddingTop: 28, gap: 12, alignItems: 'center' },
  ctaButton: {},
  ctaNote: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
  maybeLater: { color: Colors.textSecondary, fontSize: 14, paddingVertical: 8 },
});
