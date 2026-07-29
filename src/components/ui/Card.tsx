import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
}

export function Card({ children, style, onPress, elevated = false, ...rest }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          elevated && styles.elevated,
          pressed && styles.pressed,
          style,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, elevated && styles.elevated, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    backgroundColor: Colors.surfaceRaised,
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
