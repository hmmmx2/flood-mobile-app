/**
 * Register screen — community user sign-up
 * Mirrors: flood-website-community /register
 */

import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Image, TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import { colors } from '@/src/theme';

const BRAND    = colors.brand;
const CARD     = colors.card;
const BORDER   = colors.border;
const TEXT     = colors.text;
const MUTED    = colors.muted;
const INPUT_BG = colors.inputBg;
const BG       = colors.bg;
const SUCCESS  = colors.success;

export default function RegisterScreen() {
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [focused, setFocused]         = useState<string | null>(null);

  const lastRef    = useRef<RNTextInput>(null);
  const emailRef   = useRef<RNTextInput>(null);
  const pwRef      = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const { setUser } = useAuthStore();

  const emailRegex   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordsMatch = confirmPw === '' || password === confirmPw;

  const handleRegister = async () => {
    setError('');
    const f = firstName.trim();
    const l = lastName.trim();
    const e = email.trim();
    if (!f || !l || !e || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!emailRegex.test(e)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({ firstName: f, lastName: l, email: e, password });
      setUser(res.user);
      router.replace('/(app)');
    } catch (err: unknown) {
      const response = (err as any)?.response;
      const status   = response?.status as number | undefined;
      const apiMsg   = response?.data?.message as string | undefined;
      const msg =
        status === 409 || (apiMsg && /email.*exist|already/i.test(apiMsg))
          ? 'An account with this email already exists. Please sign in instead.'
          : status === 429
          ? 'Too many registration attempts. Please wait and try again.'
          : apiMsg
          ?? 'Registration failed. Please check your details and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!firstName.trim() && !!lastName.trim() && !!email.trim()
    && password.length >= 8 && password === confirmPw && !loading;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand header ── */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>FloodWatch</Text>
            <Text style={styles.appTagline}>Join the community today</Text>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the FloodWatch community — it&apos;s free.</Text>

            {/* Error banner */}
            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Name row */}
            <View style={styles.nameRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={[styles.input, focused === 'first' && styles.inputFocused]}
                  value={firstName}
                  onChangeText={setFirstName}
                  onFocus={() => setFocused('first')}
                  onBlur={() => setFocused(null)}
                  placeholder="First"
                  placeholderTextColor={MUTED}
                  returnKeyType="next"
                  onSubmitEditing={() => lastRef.current?.focus()}
                  blurOnSubmit={false}
                  autoFocus
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  ref={lastRef}
                  style={[styles.input, focused === 'last' && styles.inputFocused]}
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => setFocused('last')}
                  onBlur={() => setFocused(null)}
                  placeholder="Last"
                  placeholderTextColor={MUTED}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                ref={emailRef}
                style={[styles.input, focused === 'email' && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="you@example.com"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordWrap, focused === 'password' && styles.inputFocused]}>
                <TextInput
                  ref={pwRef}
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="At least 8 characters"
                  placeholderTextColor={MUTED}
                  secureTextEntry={!showPw}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={styles.showBtn}
                  onPress={() => setShowPw((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.showBtnText}>{showPw ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Minimum 8 characters</Text>
            </View>

            {/* Confirm Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                ref={confirmRef}
                style={[
                  styles.input,
                  focused === 'confirm' && styles.inputFocused,
                  confirmPw.length > 0 && !passwordsMatch && styles.inputError,
                ]}
                value={confirmPw}
                onChangeText={setConfirmPw}
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
                placeholder="Repeat your password"
                placeholderTextColor={MUTED}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              {confirmPw.length > 0 && (
                <View style={styles.matchRow}>
                  <Ionicons
                    name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={passwordsMatch ? SUCCESS : '#EF4444'}
                  />
                  <Text style={[styles.matchText, { color: passwordsMatch ? SUCCESS : '#EF4444' }]}>
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                </View>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, !canSubmit && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text style={styles.switchLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingBottom: 32 },

  // Brand header
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    gap: 6,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 4,
  },
  logoImg: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.4,
  },
  appTagline: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '400',
  },

  // Form card
  card: {
    backgroundColor: CARD,
    marginHorizontal: 20,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 24,
    lineHeight: 20,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },

  nameRow: { flexDirection: 'row', gap: 12 },
  field:  { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
    marginBottom: 8,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: TEXT,
  },
  inputFocused: { borderColor: BRAND, backgroundColor: CARD },
  inputError:   { borderColor: '#EF4444' },
  hint: { fontSize: 11, color: MUTED, marginTop: 4 },

  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    padding: 0,
    margin: 0,
  },
  showBtn: { paddingLeft: 8 },
  showBtnText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '600',
  },

  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  matchText: { fontSize: 12, fontWeight: '600' },

  btn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  switchRow: { alignItems: 'center', paddingVertical: 20 },
  switchText: { fontSize: 14, color: MUTED },
  switchLink: { color: BRAND, fontWeight: '600' },
});
