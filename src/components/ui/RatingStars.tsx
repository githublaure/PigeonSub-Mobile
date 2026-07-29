import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface RatingStarsProps {
  value: number | null;
  /** If provided, stars are tappable */
  onChange?: (rating: number) => void;
  size?: number;
}

export function RatingStars({ value, onChange, size = 22 }: RatingStarsProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value !== null && value >= star;
        if (onChange) {
          return (
            <Pressable
              key={star}
              onPress={() => onChange(value === star ? 0 : star)}
              hitSlop={6}
              accessibilityLabel={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              accessibilityRole="button"
            >
              <Ionicons
                name={filled ? 'star' : 'star-outline'}
                size={size}
                color={filled ? Colors.warning : Colors.border}
              />
            </Pressable>
          );
        }
        return (
          <Ionicons
            key={star}
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? Colors.warning : Colors.border}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
});
