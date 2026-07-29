/**
 * Shared form used by both Add and Edit subscription screens.
 * Covers every field in InsertSubscription from shared/schema.ts.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { RatingStars } from '../ui/RatingStars';
import { StyledTextInput } from '../ui/StyledTextInput';
import { Colors } from '../../theme/colors';

// ---------------------------------------------------------------------------
// Schema — matches InsertSubscription with correct enum values
// ---------------------------------------------------------------------------
export const subscriptionFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price e.g. 9.99'),
  frequency: z.enum(['monthly', 'yearly', 'weekly', 'lifetime'], {
    errorMap: () => ({ message: 'Select a frequency' }),
  }),
  category: z.string().min(1, 'Category is required'),
  usageFrequency: z.enum(['very_used', 'used', 'rarely_used']).default('used'),
  categoryColor: z.string().optional(),
  nextRenewal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  isTrial: z.boolean().default(false),
  trialEndsAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  useSafetyDate: z.boolean().default(false),
  safetyDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  rating: z.number().min(1).max(5).nullable().optional(),
  note: z.string().optional(),
  isActive: z.boolean().default(true),
  isFlagged: z.boolean().default(false),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FREQUENCIES = ['monthly', 'yearly', 'weekly', 'lifetime'] as const;
const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  weekly: 'Weekly',
  lifetime: 'Lifetime',
};

const CATEGORIES = [
  'entertainment', 'music', 'productivity', 'design',
  'cloud', 'gaming', 'news', 'health', 'education', 'finance', 'other',
] as const;

const USAGE_OPTIONS = [
  { value: 'very_used', label: 'Very used' },
  { value: 'used', label: 'Used' },
  { value: 'rarely_used', label: 'Rarely' },
] as const;

// ---------------------------------------------------------------------------
// Helper: convert YYYY-MM-DD → ISO string (or undefined)
// ---------------------------------------------------------------------------
export function dateFieldToIso(val: string | undefined | null): string | null {
  if (!val || val.trim() === '') return null;
  const d = new Date(val + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------------------
// Helper: ISO string → YYYY-MM-DD
// ---------------------------------------------------------------------------
export function isoToDateField(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  error,
}: {
  options: readonly { value: T; label: string }[] | readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  error?: string;
}) {
  const normalised: { value: T; label: string }[] = (options as readonly (T | { value: T; label: string })[]).map(
    (o) => (typeof o === 'string' ? { value: o as T, label: (o as string).charAt(0).toUpperCase() + (o as string).slice(1) } : o)
  );

  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.label}>{label}</Text>
      <View style={chipStyles.row}>
        {normalised.map(({ value: v, label: l }) => (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            style={[chipStyles.chip, value === v && chipStyles.chipActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === v }}
          >
            <Text style={[chipStyles.chipText, value === v && chipStyles.chipTextActive]}>
              {l}
            </Text>
          </Pressable>
        ))}
      </View>
      <FieldError message={error} />
    </View>
  );
}

const chipStyles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 36,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: Colors.white, fontWeight: '600' },
});

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main form component
// ---------------------------------------------------------------------------
interface SubscriptionFormProps {
  title: string;
  defaultValues?: Partial<SubscriptionFormValues>;
  onSubmit: (values: SubscriptionFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function SubscriptionForm({
  title,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save subscription',
}: SubscriptionFormProps) {
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      frequency: 'monthly',
      usageFrequency: 'used',
      category: 'entertainment',
      isTrial: false,
      useSafetyDate: false,
      isActive: true,
      isFlagged: false,
      rating: null,
      ...defaultValues,
    },
  });

  const isTrial = watch('isTrial');
  const useSafetyDate = watch('useSafetyDate');

  const handleSubmitWrapped = handleSubmit(async (values) => {
    setApiError('');
    try {
      await onSubmit(values);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Something went wrong');
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onCancel} hitSlop={12}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.form}>
            {/* ── Basic info ── */}
            <SectionTitle>Basic info</SectionTitle>

            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <StyledTextInput
                  label="Name"
                  placeholder="e.g. Netflix, Spotify"
                  autoCapitalize="words"
                  returnKeyType="next"
                  error={errors.name?.message}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <StyledTextInput
                  label="Price"
                  placeholder="9.99"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  error={errors.price?.message}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <ChipGroup
                  label="Billing frequency"
                  options={FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.frequency?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <ChipGroup
                  label="Category"
                  options={CATEGORIES as unknown as readonly string[]}
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  error={errors.category?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="categoryColor"
              render={({ field }) => (
                <StyledTextInput
                  label="Category colour (hex, optional)"
                  placeholder="#7C3AED"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.categoryColor?.message}
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            {/* ── Billing dates ── */}
            <SectionTitle>Billing dates</SectionTitle>

            <Controller
              control={control}
              name="nextRenewal"
              render={({ field }) => (
                <StyledTextInput
                  label="Next renewal (YYYY-MM-DD)"
                  placeholder="2025-12-31"
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                  returnKeyType="next"
                  error={errors.nextRenewal?.message}
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            <Controller
              control={control}
              name="purchaseDate"
              render={({ field }) => (
                <StyledTextInput
                  label="Purchase date (YYYY-MM-DD, optional)"
                  placeholder="2024-01-15"
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                  error={errors.purchaseDate?.message}
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            {/* Safety date */}
            <Controller
              control={control}
              name="useSafetyDate"
              render={({ field }) => (
                <ToggleRow
                  label="Use safety date"
                  description="Cancel before this date to avoid the next charge"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {useSafetyDate && (
              <Controller
                control={control}
                name="safetyDate"
                render={({ field }) => (
                  <StyledTextInput
                    label="Safety date (YYYY-MM-DD)"
                    placeholder="2025-12-01"
                    keyboardType="numbers-and-punctuation"
                    autoCorrect={false}
                    error={errors.safetyDate?.message}
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            )}

            {/* ── Trial ── */}
            <SectionTitle>Trial</SectionTitle>

            <Controller
              control={control}
              name="isTrial"
              render={({ field }) => (
                <ToggleRow
                  label="This is a trial"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {isTrial && (
              <Controller
                control={control}
                name="trialEndsAt"
                render={({ field }) => (
                  <StyledTextInput
                    label="Trial ends (YYYY-MM-DD)"
                    placeholder="2025-02-15"
                    keyboardType="numbers-and-punctuation"
                    autoCorrect={false}
                    error={errors.trialEndsAt?.message}
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            )}

            {/* ── Usage ── */}
            <SectionTitle>Usage</SectionTitle>

            <Controller
              control={control}
              name="usageFrequency"
              render={({ field }) => (
                <ChipGroup
                  label="How often do you use it?"
                  options={USAGE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.usageFrequency?.message}
                />
              )}
            />

            {/* Rating */}
            <View style={styles.ratingContainer}>
              <Text style={chipStyles.label}>Rating (optional)</Text>
              <Controller
                control={control}
                name="rating"
                render={({ field }) => (
                  <RatingStars
                    value={field.value ?? null}
                    onChange={(r) => field.onChange(r === 0 ? null : r)}
                    size={28}
                  />
                )}
              />
            </View>

            {/* ── Status ── */}
            <SectionTitle>Status</SectionTitle>

            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <ToggleRow
                  label="Active"
                  description="Uncheck to archive this subscription"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="isFlagged"
              render={({ field }) => (
                <ToggleRow
                  label="Flagged for review"
                  description="Mark for later review"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {/* ── Notes ── */}
            <SectionTitle>Notes</SectionTitle>

            <Controller
              control={control}
              name="note"
              render={({ field }) => (
                <StyledTextInput
                  label="Note (optional)"
                  placeholder="Any details about this subscription…"
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 88, textAlignVertical: 'top' }}
                  error={errors.note?.message}
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            {apiError ? (
              <View style={styles.apiErrorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
                <Text style={styles.apiError}>{apiError}</Text>
              </View>
            ) : null}

            <Button
              title={submitLabel}
              onPress={handleSubmitWrapped}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  cancel: { color: Colors.textSecondary, fontSize: 16 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  form: { paddingHorizontal: 24, gap: 20 },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: -8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 16,
  },
  fieldError: { color: Colors.danger, fontSize: 12, marginTop: 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    minHeight: 52,
    gap: 12,
  },
  toggleText: { flex: 1 },
  toggleLabel: { color: Colors.text, fontSize: 15 },
  toggleDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  ratingContainer: { gap: 10 },
  apiErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#2D1515',
    borderRadius: 10,
    padding: 12,
  },
  apiError: { color: Colors.danger, fontSize: 14, flex: 1 },
});
