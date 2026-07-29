import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../theme/colors';

interface StyledTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  hint?: string;
}

export const StyledTextInput = forwardRef<TextInput, StyledTextInputProps>(
  ({ label, error, containerStyle, hint, style, ...rest }, ref) => {
    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          style={[styles.input, error ? styles.inputError : null, style]}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          {...rest}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    );
  }
);

StyledTextInput.displayName = 'StyledTextInput';

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  error: {
    color: Colors.danger,
    fontSize: 12,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
