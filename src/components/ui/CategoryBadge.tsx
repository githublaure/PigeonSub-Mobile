import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';

const CATEGORY_COLORS: Record<string, string> = {
  entertainment: '#EC4899',
  music: '#8B5CF6',
  productivity: '#3B82F6',
  gaming: '#10B981',
  news: '#F59E0B',
  health: '#EF4444',
  education: '#06B6D4',
  finance: '#84CC16',
  cloud: '#F97316',
  design: '#A855F7',
  other: '#6B7280',
};

interface CategoryBadgeProps {
  category: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, color, size = 'md' }: CategoryBadgeProps) {
  const bg = color || CATEGORY_COLORS[category.toLowerCase()] || Colors.primary;
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bg + '26' }, isSmall && styles.sm]}>
      <Text style={[styles.text, { color: bg }, isSmall && styles.textSm]}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: 7, paddingVertical: 2 },
  text: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  textSm: { fontSize: 11 },
});
