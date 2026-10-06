import { useThemedStyles } from '../../contexts/ThemeContext';
import type { Palette } from '../../theme/colors';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
export function Page({
  title,
  subtitle,
  children,
  headerAccessory,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAccessory?: React.ReactNode;
}) {
  const ui = useUI();

  return (
    <SafeAreaView style={ui.safe}>
      <ScrollView
        contentContainerStyle={ui.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[ui.title, { flex: 1 }]}>{title}</Text>
            {headerAccessory}
          </View>
          {subtitle && <Text style={ui.body}>{subtitle}</Text>}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export const createUi = (Colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    page: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 48, gap: 20 },
    title: {
      color: Colors.text,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 34,
    },
    heading: { color: Colors.text, fontSize: 20, fontWeight: '700' },
    body: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22 },
    small: { color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
    value: {
      color: Colors.text,
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: -1,
    },
    card: {
      borderRadius: 20,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: 18,
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
    },
    label: {
      color: Colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
    },
    success: { color: Colors.success },
    warning: { color: Colors.warning },
    error: { color: Colors.danger, fontSize: 14, lineHeight: 20 },
    input: {
      color: Colors.text,
      backgroundColor: Colors.background,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      minHeight: 48,
    },
    pill: {
      color: Colors.text,
      backgroundColor: Colors.surfaceRaised,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      overflow: 'hidden',
      fontSize: 12,
    },
  });

export function useUI() {
  return useThemedStyles(createUi);
}
