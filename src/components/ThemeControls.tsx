import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme, type ThemePreference } from '../contexts/ThemeContext';

export function ThemeControls({ compact = false }: { compact?: boolean }) {
  const { colors, scheme, preference, setPreference } = useTheme();
  const [error, setError] = useState('');
  const choose = async (next: ThemePreference) => {
    setError('');
    try {
      await setPreference(next);
    } catch {
      setError('Impossible de mémoriser le thème. Réessayez.');
    }
  };
  if (compact)
    return (
      <View>
        <Pressable
          onPress={() => void choose(scheme === 'dark' ? 'light' : 'dark')}
          accessibilityRole="button"
          accessibilityLabel={
            scheme === 'dark'
              ? 'Activer le thème clair'
              : 'Activer le thème sombre'
          }
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={colors.text}
          />
        </Pressable>
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </Text>
        )}
      </View>
    );
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
        Apparence
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(
          [
            ['system', 'Système'],
            ['light', 'Clair'],
            ['dark', 'Sombre'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => void choose(key)}
            accessibilityRole="radio"
            accessibilityLabel={`Thème ${label.toLowerCase()}`}
            accessibilityState={{ checked: preference === key }}
            aria-checked={preference === key}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: preference === key ? colors.primary : colors.border,
              backgroundColor:
                preference === key ? colors.primary : colors.surfaceRaised,
            }}
          >
            <Text
              style={{
                color: preference === key ? colors.white : colors.text,
                fontWeight: '600',
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      )}
    </View>
  );
}
