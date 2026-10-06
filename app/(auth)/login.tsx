import { useThemedStyles } from '../../src/contexts/ThemeContext';
import type { Palette } from '../../src/theme/colors';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Image,
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
import { StyledTextInput } from '../../src/components/ui/StyledTextInput';
import { useAuth } from '../../src/contexts/AuthContext';

const schema = z.object({
  email: z.string().email('Saisissez une adresse e-mail valide'),
  password: z.string().min(1, 'Le mot de passe est obligatoire'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const styles = useThemedStyles(createStyles);

  const router = useRouter();
  const { login, demoLogin } = useAuth();
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setApiError('');
    try {
      await login(values.email, values.password);
      // Navigation is handled by the root layout auth guard
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Connexion impossible');
    }
  };

  const handleDemo = async () => {
    setApiError('');
    try {
      await demoLogin();
      router.replace('/(tabs)');
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Démo indisponible');
    }
  };

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
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}
          >
            <Text style={styles.backText}>← Retour</Text>
          </Pressable>

          <Image
            source={require('../../assets/branding/pigeonsub-logo.png')}
            style={styles.brandImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Heureux de vous retrouver</Text>
          <Text style={styles.subtitle}>
            Connectez-vous à votre compte PigeonSub
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <StyledTextInput
                  label="E-mail"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  error={errors.email?.message}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <StyledTextInput
                  label="Mot de passe"
                  placeholder="••••••••"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  error={errors.password?.message}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              hitSlop={8}
              style={styles.forgotRow}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </Pressable>

            {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

            <Button
              title="Se connecter"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Explorer la démo"
              variant="secondary"
              onPress={handleDemo}
              fullWidth
              size="lg"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              hitSlop={8}
            >
              <Text style={styles.footerLink}>Créer un compte</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: Palette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  back: { paddingTop: 16, paddingBottom: 8 },
  backText: { color: Colors.textSecondary, fontSize: 15 },
  brandImage: { width: 92, height: 92, alignSelf: 'center', marginTop: 8 },
  title: { color: Colors.text, fontSize: 32, fontWeight: '800', marginTop: 8 },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 6,
    marginBottom: 32,
  },
  form: { gap: 16 },
  forgotRow: { alignSelf: 'flex-end' },
  forgotText: { color: Colors.primary, fontSize: 14 },
  apiError: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: Colors.danger + '14',
    borderRadius: 8,
    padding: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 13 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: { color: Colors.textSecondary, fontSize: 14 },
  footerLink: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
