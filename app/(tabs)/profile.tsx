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
import { Colors } from '../../src/theme/colors';

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Enter current password'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.settingsIcon, destructive && styles.settingsIconDestructive]}>
        <Ionicons name={icon} size={18} color={destructive ? Colors.danger : Colors.primary} />
      </View>
      <View style={styles.settingsText}>
        <Text style={[styles.settingsLabel, destructive && { color: Colors.danger }]}>{label}</Text>
        {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  const {
    control, handleSubmit, reset,
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
      setPwSuccess('Password changed successfully!');
      reset();
      setTimeout(() => { setPwSuccess(''); setShowPasswordForm(false); }, 2000);
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Failed to change password');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your data (subscriptions, settings, reminders). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you absolutely sure?', 'All your data will be erased permanently.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Yes, delete everything',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteAccount();
                  } catch (e: unknown) {
                    Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete account');
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
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
          <Text style={styles.sectionLabel}>Account</Text>
          <Card style={styles.card}>
            <SettingsRow
              icon="lock-closed-outline"
              label="Change password"
              onPress={() => setShowPasswordForm((v) => !v)}
            />
          </Card>

          {/* Change password form */}
          {showPasswordForm && (
            <Card style={styles.pwCard}>
              <Text style={styles.pwTitle}>Change password</Text>
              <View style={styles.pwForm}>
                <Controller control={control} name="currentPassword" render={({ field }) => (
                  <StyledTextInput label="Current password" placeholder="••••••••" secureTextEntry returnKeyType="next"
                    error={errors.currentPassword?.message} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                )} />
                <Controller control={control} name="newPassword" render={({ field }) => (
                  <StyledTextInput label="New password" placeholder="At least 6 characters" secureTextEntry returnKeyType="next"
                    error={errors.newPassword?.message} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                )} />
                <Controller control={control} name="confirmPassword" render={({ field }) => (
                  <StyledTextInput label="Confirm new password" placeholder="Repeat password" secureTextEntry returnKeyType="done"
                    onSubmitEditing={handleSubmit(onChangePassword)}
                    error={errors.confirmPassword?.message} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                )} />
                {pwError ? <Text style={styles.pwError}>{pwError}</Text> : null}
                {pwSuccess ? <Text style={styles.pwSuccess}>{pwSuccess}</Text> : null}
                <Button title="Update password" onPress={handleSubmit(onChangePassword)} loading={isSubmitting} fullWidth />
              </View>
            </Card>
          )}

          {/* App settings */}
          <Text style={styles.sectionLabel}>App</Text>
          <Card style={styles.card}>
            <SettingsRow
              icon="star-outline"
              label="Upgrade to Premium"
              value="Unlock all features"
              onPress={() => router.push('/(tabs)/premium')}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="mic-outline"
              label="Voice reminders"
              onPress={() => router.push('/(tabs)/voice')}
            />
          </Card>

          {/* Sign out */}
          <Text style={styles.sectionLabel}>Session</Text>
          <Card style={styles.card}>
            <SettingsRow
              icon="log-out-outline"
              label="Sign out"
              onPress={handleLogout}
              destructive
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="trash-outline"
              label="Delete account"
              value="Permanently erase account and data"
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  avatar: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: Colors.white, fontSize: 36, fontWeight: '800' },
  avatarName: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  avatarEmail: { color: Colors.textSecondary, fontSize: 14 },
  sectionLabel: {
    color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1, marginHorizontal: 24, marginBottom: 8, marginTop: 16,
  },
  card: { marginHorizontal: 24 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, minHeight: 52,
  },
  pressed: { opacity: 0.7 },
  settingsIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  settingsIconDestructive: { backgroundColor: '#2D1515' },
  settingsText: { flex: 1 },
  settingsLabel: { color: Colors.text, fontSize: 15 },
  settingsValue: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: Colors.divider, marginLeft: 50 },
  pwCard: { marginHorizontal: 24, marginTop: 8 },
  pwTitle: { color: Colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  pwForm: { gap: 14 },
  pwError: { color: Colors.danger, fontSize: 13, backgroundColor: '#2D1515', borderRadius: 8, padding: 10 },
  pwSuccess: { color: Colors.success, fontSize: 13 },
  version: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 32 },
});
