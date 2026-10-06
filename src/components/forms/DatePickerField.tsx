import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { Palette } from '../../theme/colors';
import { dayKey, parseDay } from '../../lib/subscription-math';

interface Props {
  label: string;
  value?: string;
  onChange: (day: string) => void;
  onBlur?: () => void;
  error?: string;
  optional?: boolean;
  minDate?: string;
  maxDate?: string;
  initialDate?: string;
}
const monthLabel = (date: Date) =>
  date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const fullLabel = (date: Date) =>
  date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** One local calendar-day value on iOS, Android and the Replit web preview. */
export function DatePickerField({
  label,
  value,
  onChange,
  onBlur,
  error,
  optional,
  minDate,
  maxDate,
  initialDate,
}: Props) {
  const { colors: c } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(false);
  const [cursor, setCursor] = useState(new Date());
  const selected = parseDay(value);
  const minimum = parseDay(minDate);
  const maximum = parseDay(maxDate);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1, 12);
  const count = new Date(year, month + 1, 0, 12).getDate();
  const offset = (first.getDay() + 6) % 7;
  const close = () => {
    setOpen(false);
    onBlur?.();
  };
  const choose = (day: string) => {
    onChange(day);
    close();
  };
  const show = () => {
    Keyboard.dismiss();
    let next = selected ?? parseDay(initialDate) ?? new Date();
    if (minimum && dayKey(next) < dayKey(minimum)) next = minimum;
    if (maximum && dayKey(next) > dayKey(maximum)) next = maximum;
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    setMonths(false);
    setOpen(true);
  };
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>
        {label}
        {optional ? ' · facultatif' : ''}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={
          selected ? fullLabel(selected) : 'Ouvrir le calendrier'
        }
        onPress={show}
        style={[styles.field, !!error && { borderColor: c.danger }]}
      >
        <Text
          style={[
            styles.value,
            { flex: 1 },
            !selected && { color: c.textMuted },
          ]}
        >
          {selected ? fullLabel(selected) : 'Choisir une date'}
        </Text>
        <Ionicons name="calendar-outline" size={21} color={c.primary} />
      </Pressable>
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Fermer le calendrier"
            onPress={close}
          />
          <View
            style={styles.dialog}
            accessibilityViewIsModal
            testID="date-picker-calendar"
            accessibilityLabel={`Calendrier : ${label}`}
          >
            <ScrollView contentContainerStyle={{ gap: 14 }}>
              <View style={styles.row}>
                <Text style={styles.title}>{label}</Text>
                <Pressable
                  style={styles.iconButton}
                  onPress={close}
                  accessibilityRole="button"
                  accessibilityLabel="Annuler la sélection"
                >
                  <Ionicons name="close" size={24} color={c.text} />
                </Pressable>
              </View>
              <View style={styles.row}>
                <Pressable
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    months ? 'Année précédente' : 'Mois précédent'
                  }
                  onPress={() =>
                    setCursor(
                      new Date(
                        year - (months ? 1 : 0),
                        month - (months ? 0 : 1),
                        1,
                        12,
                      ),
                    )
                  }
                >
                  <Ionicons name="chevron-back" size={23} color={c.primary} />
                </Pressable>
                <Pressable
                  style={styles.monthButton}
                  accessibilityRole="button"
                  accessibilityLabel="Choisir le mois et l’année"
                  onPress={() => setMonths(!months)}
                >
                  <Text style={styles.month}>
                    {months ? year : monthLabel(cursor)}
                  </Text>
                  <Ionicons
                    name={months ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={c.primary}
                  />
                </Pressable>
                <Pressable
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    months ? 'Année suivante' : 'Mois suivant'
                  }
                  onPress={() =>
                    setCursor(
                      new Date(
                        year + (months ? 1 : 0),
                        month + (months ? 0 : 1),
                        1,
                        12,
                      ),
                    )
                  }
                >
                  <Ionicons
                    name="chevron-forward"
                    size={23}
                    color={c.primary}
                  />
                </Pressable>
              </View>
              {months ? (
                <View style={styles.grid}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <Pressable
                      key={i}
                      style={styles.monthCell}
                      accessibilityRole="button"
                      onPress={() => {
                        setCursor(new Date(year, i, 1, 12));
                        setMonths(false);
                      }}
                    >
                      <Text style={styles.value}>
                        {new Date(year, i, 1).toLocaleDateString('fr-FR', {
                          month: 'short',
                        })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View>
                  <View style={styles.grid}>
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                      <View key={i} style={styles.weekday}>
                        <Text style={styles.label}>{day}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.grid}>
                    {Array.from(
                      { length: Math.ceil((offset + count) / 7) * 7 },
                      (_, i) => {
                        const n = i - offset + 1;
                        if (n < 1 || n > count)
                          return <View key={i} style={styles.dayCell} />;
                        const date = new Date(year, month, n, 12);
                        const key = dayKey(date);
                        const disabled = !!(
                          (minimum && key < dayKey(minimum)) ||
                          (maximum && key > dayKey(maximum))
                        );
                        const active = key === value;
                        return (
                          <Pressable
                            key={i}
                            accessibilityRole="button"
                            accessibilityLabel={fullLabel(date)}
                            accessibilityState={{
                              disabled,
                              selected: active,
                            }}
                            disabled={disabled}
                            onPress={() => choose(key)}
                            style={[
                              styles.dayCell,
                              active && { backgroundColor: c.primary },
                              disabled && { opacity: 0.25 },
                              key === dayKey(new Date()) &&
                                !active && {
                                  backgroundColor: c.primaryLight,
                                },
                            ]}
                          >
                            <Text
                              style={[
                                styles.value,
                                key === dayKey(new Date()) && {
                                  color: c.primary,
                                },
                                active && {
                                  color: '#FFFFFF',
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              {n}
                            </Text>
                          </Pressable>
                        );
                      },
                    )}
                  </View>
                </View>
              )}
              {optional && !!value && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => choose('')}
                  style={styles.clear}
                >
                  <Text style={{ color: c.primary }}>Effacer la date</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const createStyles = (c: Palette) =>
  StyleSheet.create({
    label: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    field: {
      minHeight: 50,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      backgroundColor: c.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    value: { color: c.text, fontSize: 15 },
    error: { color: c.danger, fontSize: 12 },
    backdrop: {
      flex: 1,
      backgroundColor: '#00000088',
      justifyContent: 'center',
      padding: 16,
    },
    dialog: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '90%',
      alignSelf: 'center',
      borderRadius: 24,
      backgroundColor: c.background,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
    },
    title: { color: c.text, fontWeight: '700', fontSize: 18, flex: 1 },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    month: {
      color: c.primary,
      fontSize: 16,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    weekday: {
      width: '14.285714%',
      alignItems: 'center',
      paddingVertical: 8,
    },
    dayCell: {
      width: '14.285714%',
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    monthCell: {
      width: '33.333333%',
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clear: {
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
