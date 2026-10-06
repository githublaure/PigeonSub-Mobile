import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
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
import { Colors } from '../../src/theme/colors';

const schema = z
  .object({
    name: z.string().min(2, '2 caractères minimum pour le nom'),
    email: z.string().email('Saisissez une adresse e-mail valide'),
    password: z.string().min(6, '6 caractères minimum'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setApiError('');
    try {
      await register(values.name, values.email, values.password);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Inscription impossible');
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
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}
          >
            <Text style={styles.backText}>← Retour</Text>
          </Pressable>

          <Text style={styles.title}>Votre compte PigeonSub</Text>
          <Text style={styles.subtitle}>
            Facultatif : un espace pour vos abonnements. Vos données sans compte
            restent séparées sur cet appareil.
          </Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <StyledTextInput
                  label="Nom"
                  placeholder="Votre nom"
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
                  placeholder="6 caractères minimum"
                  secureTextEntry
                  returnKeyType="next"
                  error={errors.password?.message}
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
                  onSubmitEditing={handleSubmit(onSubmit)}
                  error={errors.confirmPassword?.message}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

            <Button
              title="Créer mon compte"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={8}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  back: { paddingTop: 16, paddingBottom: 8 },
  backText: { color: Colors.textSecondary, fontSize: 15 },
  title: { color: Colors.text, fontSize: 32, fontWeight: '800', marginTop: 16 },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 6,
    marginBottom: 32,
  },
  form: { gap: 16 },
  apiError: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#2D1515',
    borderRadius: 8,
    padding: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: { color: Colors.textSecondary, fontSize: 14 },
  footerLink: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
