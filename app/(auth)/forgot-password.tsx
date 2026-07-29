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
import { auth } from '../../src/lib/api';
import { Colors } from '../../src/theme/colors';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setApiError('');
    try {
      await auth.forgotPassword(values.email);
      setSent(true);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Request failed');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send a reset link.
          </Text>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                ✅ Check your inbox! If an account exists for that email you'll receive a reset link shortly.
              </Text>
              <Button
                title="Back to login"
                onPress={() => router.replace('/(auth)/login')}
                fullWidth
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <StyledTextInput
                    label="Email"
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit(onSubmit)}
                    error={errors.email?.message}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />

              {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

              <Button
                title="Send reset link"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                fullWidth
                size="lg"
              />
            </View>
          )}
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
  subtitle: { color: Colors.textSecondary, fontSize: 16, marginTop: 6, marginBottom: 32 },
  form: { gap: 16 },
  apiError: {
    color: Colors.danger,
    fontSize: 14,
    backgroundColor: '#2D1515',
    borderRadius: 8,
    padding: 12,
  },
  successBox: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20 },
  successText: { color: Colors.text, fontSize: 15, lineHeight: 22 },
});
