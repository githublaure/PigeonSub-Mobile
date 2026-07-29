import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../theme/colors';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  style,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.white : Colors.primary}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`label_${size}`]]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 44, // accessible touch target
  },
  fullWidth: {
    width: '100%',
  },
  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: Colors.transparent,
  },
  danger: {
    backgroundColor: Colors.danger,
  },
  // Sizes
  size_sm: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 44 },
  size_md: { paddingHorizontal: 20, paddingVertical: 13 },
  size_lg: { paddingHorizontal: 28, paddingVertical: 16 },
  // States
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  // Labels
  label: { fontWeight: '600' },
  label_primary: { color: Colors.white },
  label_secondary: { color: Colors.text },
  label_ghost: { color: Colors.primary },
  label_danger: { color: Colors.white },
  label_sm: { fontSize: 13 },
  label_md: { fontSize: 15 },
  label_lg: { fontSize: 17 },
});
