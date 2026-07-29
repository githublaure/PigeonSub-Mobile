import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Subscription } from '../../lib/api';
import { Colors } from '../../theme/colors';

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress: () => void;
}

function formatPrice(price: string, frequency: string): string {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  const formatted = num.toLocaleString('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
  const freq = frequency === 'monthly' ? '/mo' : frequency === 'yearly' ? '/yr' : `/${frequency}`;
  return `${formatted}${freq}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function SubscriptionCard({ subscription, onPress }: SubscriptionCardProps) {
  const days = daysUntil(subscription.nextRenewal);
  const isUrgent = days !== null && days <= 7;
  const accentColor = subscription.categoryColor || Colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${subscription.name}, ${formatPrice(subscription.price, subscription.frequency)}`}
    >
      {/* Colour accent bar */}
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{subscription.name}</Text>
            {subscription.isTrial && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>TRIAL</Text>
              </View>
            )}
            {subscription.isSuspect && (
              <View style={[styles.badge, styles.badgeSuspect]}>
                <Text style={styles.badgeText}>⚠</Text>
              </View>
            )}
          </View>
          <Text style={styles.price}>{formatPrice(subscription.price, subscription.frequency)}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.category}>{subscription.category}</Text>
          {days !== null && (
            <Text style={[styles.renewal, isUrgent && styles.renewalUrgent]}>
              <Ionicons name="calendar-outline" size={12} />
              {' '}
              {days === 0 ? 'Today' : days < 0 ? `${Math.abs(days)}d ago` : `in ${days}d`}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 72,
  },
  pressed: { opacity: 0.8 },
  accent: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  price: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    color: Colors.textSecondary,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  renewal: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  renewalUrgent: {
    color: Colors.warning,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeSuspect: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    color: Colors.primaryDark,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
