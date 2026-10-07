import { ThemeControls } from '../../src/components/ThemeControls';
import { useTheme, useThemedStyles } from '../../src/contexts/ThemeContext';
import type { Palette } from '../../src/theme/colors';
import { Page, useUI } from '../../src/components/ui/Page';
import { useBilling } from '../../src/contexts/BillingContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { StyledTextInput } from '../../src/components/ui/StyledTextInput';
import { useAuth } from '../../src/contexts/AuthContext';
import { auth } from '../../src/lib/api';

const pwSchema = z
  .object({
    currentPassword: z.string().min(1, 'Saisissez le mot de passe actuel'),
    newPassword: z.string().min(6, '6 caractères minimum'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
type PwFormValues = z.infer<typeof pwSchema>;

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { colors: Colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.settingsIcon,
          destructive && styles.settingsIconDestructive,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? Colors.danger : Colors.primary}
        />
      </View>
      <View style={styles.settingsText}>
        <Text
          style={[
            styles.settingsLabel,
            destructive && { color: Colors.danger },
          ]}
        >
          {label}
        </Text>
        {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const ui = useUI();

  const { user, mode, logout, deleteAccount, startGuest, demoLogin } =
    useAuth();
  const router = useRouter();
  const { isPlus } = useBilling();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [resetDemo, setResetDemo] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PwFormValues>({ resolver: zodResolver(pwSchema) });

  const onChangePassword = async (values: PwFormValues) => {
    setPwError('');
    setPwSuccess('');
    try {
      await auth.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setPwSuccess('Mot de passe modifié.');
      reset();
      setTimeout(() => {
        setPwSuccess('');
        setShowPasswordForm(false);
      }, 2000);
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Modification impossible');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Votre compte et ses données seront supprimés définitivement. Les données sans compte sur cet appareil sont conservées. Un abonnement Plus se gère séparément dans votre compte Store.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmer la suppression ?',
              'Les données de ce compte seront définitivement effacées.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer ce compte',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                    } catch (e: unknown) {
                      Alert.alert(
                        'Erreur',
                        e instanceof Error
                          ? e.message
                          : 'Suppression impossible',
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Revenir au mode sans compte sur cet appareil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ],
    );
  };

  if (mode !== 'account')
    return (
      <Page
        title="Votre espace"
        subtitle={
          mode === 'demo'
            ? 'Camille · démo'
            : 'Espace personnel'
        }
      >
        <View style={ui.card}><ThemeControls /></View>
        <View style={ui.card}>
          <Text style={ui.heading}>
            {isPlus ? 'PigeonSub Plus' : 'PigeonSub Gratuit'}
          </Text>
          <Button
            title="Mon offre PigeonSub"
            onPress={() => router.push('/(tabs)/premium')}
          />
        </View>
        {mode === 'demo' ? (
          <View style={{ gap: 10 }}>
            <Button title="Réinitialiser les exemples de démo" variant="secondary" disabled={demoBusy} onPress={() => setResetDemo(true)} />
            {resetDemo && <View style={ui.card}>
              <Text style={ui.body}>Vos modifications dans la démo seront remplacées par les exemples. Vos données personnelles restent conservées.</Text>
              <Button title="Charger les exemples" loading={demoBusy} onPress={() => {
                setDemoBusy(true); setDemoError('');
                void demoLogin().then(() => {
                  setResetDemo(false);
                  router.replace('/(tabs)');
                }).catch(e => setDemoError(e instanceof Error ? e.message : 'Chargement impossible.')).finally(() => setDemoBusy(false));
              }} />
              <Button title="Garder ma démo actuelle" variant="ghost" disabled={demoBusy} onPress={() => setResetDemo(false)} />
              {!!demoError && <Text style={ui.error}>{demoError}</Text>}
            </View>}
            <Button
            title="Quitter la démo et retrouver mes données"
            disabled={demoBusy}
            onPress={() => void startGuest()}
          />
          </View>
        ) : (
          <Button
            title="Explorer la démo"
            variant="secondary"
            onPress={() => void demoLogin()}
          />
        )}
        <View style={ui.card}>
          <Text style={ui.heading}>
            Compte
          </Text>
          <Button
            title="Me connecter"
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
          />
          <Button
            title="Créer un compte"
            variant="ghost"
            onPress={() => router.push('/(auth)/register')}
          />
        </View>
        <Button
          title="Mes données et confidentialité"
          variant="secondary"
          onPress={() => router.push('/(tabs)/privacy')}
        />
      </Page>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profil</Text>
          </View>

          {/* Avatar */}
          <View style={styles.avatar}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={styles.avatarName}>{user?.name}</Text>
            <Text style={styles.avatarEmail}>{user?.email}</Text>
          </View>

          {/* Account settings */}
          <Text style={styles.sectionLabel}>Compte</Text>
          <Card style={styles.card}>
            <SettingsRow
              icon="lock-closed-outline"
              label="Modifier le mot de passe"
              onPress={() => setShowPasswordForm((v) => !v)}
            />
          </Card>

          {/* Change password form */}
          {showPasswordForm && (
            <Card style={styles.pwCard}>
              <Text style={styles.pwTitle}>Modifier le mot de passe</Text>
              <View style={styles.pwForm}>
                <Controller
                  control={control}
                  name="currentPassword"
                  render={({ field }) => (
                    <StyledTextInput
                      label="Mot de passe actuel"
                      placeholder="••••••••"
                      secureTextEntry
                      returnKeyType="next"
                      error={errors.currentPassword?.message}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="newPassword"
                  render={({ field }) => (
                    <StyledTextInput
                      label="Nouveau mot de passe"
                      placeholder="6 caractères minimum"
                      secureTextEntry
                      returnKeyType="next"
                      error={errors.newPassword?.message}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <StyledTextInput
                      label="Confirmer le mot de passe"
                      placeholder="Répéter le mot de passe"
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit(onChangePassword)}
                      error={errors.confirmPassword?.message}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {pwError ? <Text style={styles.pwError}>{pwError}</Text> : null}
                {pwSuccess ? (
                  <Text style={styles.pwSuccess}>{pwSuccess}</Text>
                ) : null}
                <Button
                  title="Enregistrer"
                  onPress={handleSubmit(onChangePassword)}
                  loading={isSubmitting}
                  fullWidth
                />
              </View>
            </Card>
          )}

          <Card style={{ marginHorizontal: 24, marginTop: 24 }}><ThemeControls /></Card>
          {/* App settings */}
          <Text style={styles.sectionLabel}>Application</Text>
          <Card style={styles.card}>
            <SettingsRow
              icon="star-outline"
              label="Mon offre PigeonSub Plus"
              value="Offres, achats et restauration"
              onPress={() => router.push('/(tabs)/premium')}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Mes données et confidentialité"
              onPress={() => router.push('/(tabs)/privacy')}
            />
          </Card>

          {/* Sign out */}
          <Text style={styles.sectionLabel}>Session</Text>
          <Card style={styles.card}>
            <SettingsRow
              icon="log-out-outline"
              label="Se déconnecter"
              onPress={handleLogout}
              destructive
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="trash-outline"
              label="Supprimer le compte"
              value="Supprimer définitivement ce compte et ses données"
              onPress={handleDeleteAccount}
              destructive
            />
          </Card>

          <Text style={styles.version}>PigeonSub Mobile v1.0.0 🐦</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  avatar: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: Colors.white, fontSize: 36, fontWeight: '800' },
  avatarName: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  avatarEmail: { color: Colors.textSecondary, fontSize: 14 },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 24,
    marginBottom: 8,
    marginTop: 16,
  },
  card: { marginHorizontal: 24 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    minHeight: 52,
  },
  pressed: { opacity: 0.7 },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIconDestructive: { backgroundColor: Colors.danger + '14' },
  settingsText: { flex: 1 },
  settingsLabel: { color: Colors.text, fontSize: 15 },
  settingsValue: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: 50 },
  pwCard: { marginHorizontal: 24, marginTop: 8 },
  pwTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  pwForm: { gap: 14 },
  pwError: {
    color: Colors.danger,
    fontSize: 13,
    backgroundColor: Colors.danger + '14',
    borderRadius: 8,
    padding: 10,
  },
  pwSuccess: { color: Colors.success, fontSize: 13 },
  version: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
