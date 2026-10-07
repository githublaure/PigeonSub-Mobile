import { SubscriptionIcon } from './SubscriptionIcon';
import { useTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { Palette } from '../../theme/colors';
import { CategoryBadge } from '../CategoryFilters';
import {
  euro,
  frequencyLabels,
  nextRenewal,
  trialState,
  trialLabel,
} from '../../lib/subscription-math';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UsageBadge } from './UsageBadge';
import { Subscription } from '../../lib/api';
import { SafetyDateBadge } from './SafetyDateBadge';

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress: () => void;
  archived?: boolean;
  showSafety?: boolean;
  safetyDate?: Date | null;
}

function formatPrice(price: string, frequency: string): string {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  const formatted = euro(num);
  const freq = ` / ${frequencyLabels[frequency] ?? frequency}`;
  return `${formatted}${freq}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr), today = new Date();
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

export function SubscriptionCard({
  subscription,
  onPress,
  archived = !subscription.isActive,
  showSafety = false,
  safetyDate = null,
}: SubscriptionCardProps) {
  const { colors: Colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const days = archived
    ? null
    : daysUntil(nextRenewal(subscription)?.toISOString() ?? null);
  const isUrgent = days !== null && days <= 7;
  const accentColor = archived
    ? Colors.archiveBorder
    : subscription.categoryColor || Colors.primary;

  return (
    <Pressable
      testID={`subscription-card-${subscription.id}`}
      style={({ pressed }) => [
        styles.card,
        archived && styles.archivedCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${subscription.name}${archived ? ', archivé' : ''}, ${formatPrice(subscription.price, subscription.frequency)}${showSafety && !archived ? `, ${safetyDate ? `date de sûreté ${safetyDate.toLocaleDateString('fr-FR')}` : 'sans date de sûreté'}` : ''}`}
    >
      {/* Colour accent bar */}
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <SubscriptionIcon id={subscription.id} name={subscription.name} size={36} />
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, archived && styles.archivedText]}
              numberOfLines={2}
            >
              {subscription.name}
            </Text>
            {!archived && subscription.isTrial && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {trialState(subscription) === 'active'
                    ? 'ESSAI'
                    : 'À CONFIRMER'}
                </Text>
              </View>
            )}
            {!archived && subscription.isSuspect && (
              <View style={[styles.badge, styles.badgeSuspect]}>
                <Text style={styles.badgeText}>⚠</Text>
              </View>
            )}
          </View>
          <Text style={[styles.price, archived && styles.archivedText]}>
            {subscription.isTrial && !archived ? 'Après essai\n' : ''}
            {formatPrice(subscription.price, subscription.frequency)}
          </Text>
        </View>

        {subscription.isTrial && !archived && (
          <Text style={styles.renewal}>{trialLabel(subscription)}</Text>
        )}
        {!archived && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}><UsageBadge usageFrequency={subscription.usageFrequency} />{subscription.rating !== null && <Text style={[styles.renewal, { paddingVertical: 4 }]}>★ {subscription.rating}/5</Text>}</View>}
        {showSafety && !archived && <SafetyDateBadge date={safetyDate} />}
        <View style={styles.footer}>
          <CategoryBadge category={subscription.category} />
          {archived && (
            <View style={styles.archivedBadge}>
              <Ionicons
                name="archive-outline"
                size={12}
                color={Colors.archiveText}
              />
              <Text style={styles.archivedBadgeText}>Archivé</Text>
            </View>
          )}
          {days !== null && (
            <Text style={[styles.renewal, isUrgent && styles.renewalUrgent]}>
              <Ionicons name="calendar-outline" size={12} />{' '}
              {days === 0
                ? 'Aujourd’hui'
                : days < 0
                  ? 'À vérifier'
                  : `dans ${days} j`}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (Colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      flexDirection: 'row',
      overflow: 'hidden',
      minHeight: 72,
    },
    archivedCard: {
      backgroundColor: Colors.archiveBackground,
      borderColor: Colors.archiveBorder,
    },
    archivedText: { color: Colors.archiveText },
    archivedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    archivedBadgeText: {
      color: Colors.archiveText,
      fontSize: 12,
      fontWeight: '600',
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
      gap: 10,
    },
    nameRow: {
      alignItems: 'flex-start',
      gap: 6,
      flex: 1,
      marginRight: 8,
    },
    name: {
      color: Colors.text,
      fontSize: 16,
      fontWeight: '600',
      flexShrink: 1,
    },
    price: {
      maxWidth: '42%',
      textAlign: 'right',
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
