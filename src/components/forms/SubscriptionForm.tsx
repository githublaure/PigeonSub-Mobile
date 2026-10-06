import { useThemedStyles, useTheme } from '../../contexts/ThemeContext';
import type { Palette } from '../../theme/colors';
import { useRouter } from 'expo-router';
import { parseDay } from '../../lib/subscription-math';
import { categoryLabels } from '../../lib/labels';
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
import {
  subscriptionFormSchema,
  type SubscriptionFormValues,
} from '../../lib/subscription-form-schema';
import { Button } from '../ui/Button';
import { RatingStars } from '../ui/RatingStars';
import { StyledTextInput } from '../ui/StyledTextInput';
import { ColorPicker } from './ColorPicker';

// ---------------------------------------------------------------------------
// Schema — matches InsertSubscription with correct enum values
// ---------------------------------------------------------------------------
export {
  subscriptionFormSchema,
  type SubscriptionFormValues,
} from '../../lib/subscription-form-schema';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FREQUENCIES = ['monthly', 'yearly', 'weekly', 'lifetime'] as const;
const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Mensuel',
  yearly: 'Annuel',
  weekly: 'Hebdomadaire',
  lifetime: 'Achat unique',
};

const CATEGORIES = [
  'entertainment',
  'music',
  'productivity',
  'design',
  'cloud',
  'gaming',
  'news',
  'health',
  'education',
  'finance',
  'other',
] as const;

const USAGE_OPTIONS = [
  { value: 'very_used', label: 'Très utilisé' },
  { value: 'used', label: 'Utilisé' },
  { value: 'rarely_used', label: 'Peu utilisé' },
] as const;

// ---------------------------------------------------------------------------
// Helper: convert YYYY-MM-DD → ISO string (or undefined)
// ---------------------------------------------------------------------------
export function dateFieldToIso(val: string | undefined | null): string | null {
  if (!val || val.trim() === '') return null;
  return parseDay(val) ? val + 'T00:00:00.000Z' : null;
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
  const styles = useThemedStyles(createStyles);

  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function FieldError({ message }: { message?: string }) {
  const styles = useThemedStyles(createStyles);

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
  const chipStyles = useThemedStyles(createChipStyles);

  const normalised: { value: T; label: string }[] = (
    options as readonly (T | { value: T; label: string })[]
  ).map((o) =>
    typeof o === 'string'
      ? {
          value: o as T,
          label: (o as string).charAt(0).toUpperCase() + (o as string).slice(1),
        }
      : o,
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
            <Text
              style={[
                chipStyles.chipText,
                value === v && chipStyles.chipTextActive,
              ]}
            >
              {l}
            </Text>
          </Pressable>
        ))}
      </View>
      <FieldError message={error} />
    </View>
  );
}

const createChipStyles = (Colors: Palette) =>
  StyleSheet.create({
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
    chipActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
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
  const { colors: Colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? (
          <Text style={styles.toggleDesc}>{description}</Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
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
  safetyEditable?: boolean;
}

export function SubscriptionForm({
  title,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer',
  safetyEditable = true,
}: SubscriptionFormProps) {
  const { colors: Colors } = useTheme();
  const chipStyles = useThemedStyles(createChipStyles);
  const styles = useThemedStyles(createStyles);

  const router = useRouter();
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: '',
      price: '',
      nextRenewal: '',
      purchaseDate: '',
      trialEndsAt: '',
      safetyDate: '',
      categoryColor: '',
      note: '',
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
      await onSubmit({ ...values, price: values.price.replace(',', '.') });
    } catch (e: unknown) {
      if (e instanceof Error && e.message.startsWith('PLUS_LIMIT:')) {
        router.push('/(tabs)/premium?reason=limit');
        return;
      }
      setApiError(
        e instanceof Error ? e.message : 'Enregistrement impossible.',
      );
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
              <Text style={styles.cancel}>Annuler</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.form}>
            {/* ── Basic info ── */}
            <SectionTitle>Votre abonnement</SectionTitle>

            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <StyledTextInput
                  label="Nom"
                  placeholder="Par exemple Netflix, Spotify"
                  autoCapitalize="words"
                  returnKeyType="next"
                  error={errors.name?.message}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            {/* ── Trial ── */}
            <SectionTitle>Période d’essai</SectionTitle>

            <Controller
              control={control}
              name="isTrial"
              render={({ field }) => (
                <ToggleRow
                  label="Abonnement en période d’essai"
                  description="Gratuit maintenant, puis au tarif renseigné. Les essais comptent parmi vos 5 abonnements gratuits."
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
                    label="Fin de l’essai (AAAA-MM-JJ, obligatoire)"
                    placeholder="2026-12-15"
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

            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <StyledTextInput
                  label={isTrial ? 'Tarif après l’essai (€)' : 'Prix (€)'}
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
                  label="Fréquence de paiement"
                  options={FREQUENCIES.map((f) => ({
                    value: f,
                    label: FREQUENCY_LABELS[f],
                  }))}
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
                  label="Catégorie"
                  options={CATEGORIES.map((value) => ({
                    value,
                    label: categoryLabels[value] ?? value,
                  }))}
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
                <ColorPicker value={field.value} onChange={field.onChange} />
              )}
            />

            {/* ── Billing dates ── */}
            <SectionTitle>Vos échéances</SectionTitle>

            <Controller
              control={control}
              name="nextRenewal"
              render={({ field }) => (
                <StyledTextInput
                  label={
                    isTrial
                      ? 'Premier prélèvement (facultatif si identique à la fin de l’essai)'
                      : 'Prochain prélèvement (AAAA-MM-JJ)'
                  }
                  placeholder="2026-12-31"
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
                  label="Date de souscription (AAAA-MM-JJ, facultatif)"
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

            <SectionTitle>Date de sûreté</SectionTitle>
            {safetyEditable ? (
              <>
                <Controller
                  control={control}
                  name="useSafetyDate"
                  render={({ field }) => (
                    <ToggleRow
                      label="Choisir ma date de sûreté"
                      value={field.value}
                      onChange={field.onChange}
                      description="Le jour où agir pour éviter un renouvellement non souhaité."
                    />
                  )}
                />
                {useSafetyDate && (
                  <Controller
                    control={control}
                    name="safetyDate"
                    render={({ field }) => (
                      <StyledTextInput
                        label="Date de sûreté (AAAA-MM-JJ)"
                        placeholder="2026-12-25"
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
                <Text style={styles.toggleDesc}>
                  Incluse pour vos 5 abonnements gratuits. L’avance choisie est
                  conservée aux prochains renouvellements.
                </Text>
              </>
            ) : (
              <Text style={styles.toggleDesc}>
                Les réglages existants sont conservés. Plus permet de
                personnaliser tous vos abonnements.
              </Text>
            )}

            <Text style={styles.toggleDesc}>
              Le préavis et les rappels se règlent sur la fiche de l’abonnement
              après son enregistrement. Vous pourrez aussi y joindre vos photos.
            </Text>

            {/* ── Usage ── */}
            <SectionTitle>Utilisation</SectionTitle>

            <Controller
              control={control}
              name="usageFrequency"
              render={({ field }) => (
                <ChipGroup
                  label="À quelle fréquence l’utilisez-vous ?"
                  options={USAGE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.usageFrequency?.message}
                />
              )}
            />

            {/* Rating */}
            <View style={styles.ratingContainer}>
              <Text style={chipStyles.label}>Votre note (facultatif)</Text>
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
            <SectionTitle>État</SectionTitle>

            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <ToggleRow
                  label="Actif"
                  description="Désactivez pour archiver cet abonnement"
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
                  label="À examiner"
                  description="À revoir plus tard"
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
                  label="Note (facultatif)"
                  placeholder="Des informations utiles sur cet abonnement…"
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
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={Colors.danger}
                />
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

const createStyles = (Colors: Palette) =>
  StyleSheet.create({
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
      backgroundColor: Colors.danger + '14',
      borderRadius: 10,
      padding: 12,
    },
    apiError: { color: Colors.danger, fontSize: 14, flex: 1 },
  });
