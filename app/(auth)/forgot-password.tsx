/**
 * Forgot-password screen — 3-step flow
 *
 * Step 1  →  Enter email → POST /auth/forgot-password
 *            (dev mode: backend returns the code in the response body)
 * Step 2  →  Enter 6-digit code → POST /auth/verify-reset-code
 * Step 3  →  Enter new password → POST /auth/reset-password → back to login
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
import axios from 'axios';
import { authApi } from '@/src/api';
import { colors } from '@/src/theme';

const BRAND    = colors.brand;
const CARD     = colors.card;
const BORDER   = colors.border;
const TEXT     = colors.text;
const MUTED    = colors.muted;
const INPUT_BG = colors.inputBg;
const BG       = colors.bg;
const SUCCESS  = colors.success;

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen() {
  const [step, setStep]           = useState<Step>(1);
  const [email, setEmail]         = useState('');
  const [code, setCode]           = useState('');
  const [devCode, setDevCode]     = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [focused, setFocused]     = useState<string | null>(null);

  const codeRef    = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const passwordsMatch = confirmPw === '' || newPw === confirmPw;

  const stepTitles = ['Enter Email', 'Verify Code', 'New Password'];
  const stepSubtitles = [
    "Enter your email and we'll send you a reset code.",
    `Enter the code sent to ${email}.`,
    'Choose a strong new password.',
  ];

  // ── Step 1: request reset code ─────────────────────────────────────────────
  const handleRequestCode = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim() });
      const returned = (res as any)?.data?.code ?? '';
      setDevCode(returned);
      setCode(returned);
      setStep(2);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message as string | undefined;
        if (err.response?.status === 429) {
          setError('Too many requests. Please wait before trying again.');
        } else if (err.response?.status === 404) {
          setError('No account found with this email address.');
        } else {
          setError(msg ?? 'Failed to send reset code. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify code ────────────────────────────────────────────────────
  const handleVerifyCode = async () => {
    setError('');
    if (code.trim().length < 4) {
      setError('Please enter the verification code.');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyResetCode({ email: email.trim(), code: code.trim() });
      setStep(3);
    } catch {
      setError('The code is incorrect or has expired. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: set new password ───────────────────────────────────────────────
  const handleResetPassword = async () => {
    setError('');
    if (newPw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), newPassword: newPw });
      router.replace('/(auth)/login');
    } catch {
      setError('Could not reset password. Please start over.');
    } finally {
      setLoading(false);
    }
  };

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
          {/* ── Brand header with back button ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={BRAND} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.logoWrap}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Reset Password</Text>
            <Text style={styles.appTagline}>We&apos;ll get you back in quickly</Text>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            {/* Step indicator */}
            <View style={styles.stepRow}>
              {(['1', '2', '3'] as const).map((s, i) => {
                const stepNum = (i + 1) as Step;
                const active = step === stepNum;
                const done   = step > stepNum;
                return (
                  <View key={s} style={styles.stepItem}>
                    <View style={[
                      styles.stepDot,
                      active && styles.stepDotActive,
                      done && styles.stepDotDone,
                    ]}>
                      {done
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : <Text style={[styles.stepNum, (active || done) && { color: '#fff' }]}>{stepNum}</Text>
                      }
                    </View>
                    <Text style={[styles.stepLabel, active && { color: BRAND }]}>
                      {['Email', 'Verify', 'Reset'][i]}
                    </Text>
                  </View>
                );
              })}
              <View style={[styles.stepLine, { left: '16%' }]} />
              <View style={[styles.stepLine, { left: '50%' }]} />
            </View>

            <Text style={styles.title}>{stepTitles[step - 1]}</Text>
            <Text style={styles.subtitle}>{stepSubtitles[step - 1]}</Text>

            {/* Error banner */}
            {!!error && (
              <View testID="forgot-error-banner" style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Step 1 ── */}
            {step === 1 && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    testID="forgot-email-input"
                    style={[styles.input, focused === 'email' && styles.inputFocused]}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    placeholder="you@example.com"
                    placeholderTextColor={MUTED}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleRequestCode}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  testID="send-code-button"
                  style={[styles.btn, (!email.trim() || loading) && styles.btnDisabled]}
                  onPress={handleRequestCode}
                  disabled={!email.trim() || loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnText}>Send Reset Code</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <>
                {!!devCode && (
                  <View style={styles.devBanner}>
                    <Ionicons name="code-slash-outline" size={14} color={BRAND} />
                    <Text style={styles.devText}>
                      Dev mode — code auto-filled:{' '}
                      <Text style={{ fontWeight: '700' }}>{devCode}</Text>
                    </Text>
                  </View>
                )}
                <View style={styles.field}>
                  <Text style={styles.label}>Verification Code</Text>
                  <TextInput
                    ref={codeRef}
                    testID="reset-code-input"
                    style={[styles.input, styles.codeInput, focused === 'code' && styles.inputFocused]}
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
                    onFocus={() => setFocused('code')}
                    onBlur={() => setFocused(null)}
                    placeholder="Enter code"
                    placeholderTextColor={MUTED}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyCode}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  testID="verify-code-button"
                  style={[styles.btn, (!code.trim() || loading) && styles.btnDisabled]}
                  onPress={handleVerifyCode}
                  disabled={!code.trim() || loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnText}>Verify Code</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={() => { setStep(1); setCode(''); setDevCode(''); setError(''); }}
                >
                  <Text style={styles.resendText}>Didn&apos;t receive it? Try again</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={[styles.passwordWrap, focused === 'newpw' && styles.inputFocused]}>
                    <TextInput
                      testID="new-password-input"
                      style={styles.passwordInput}
                      value={newPw}
                      onChangeText={setNewPw}
                      onFocus={() => setFocused('newpw')}
                      onBlur={() => setFocused(null)}
                      placeholder="At least 8 characters"
                      placeholderTextColor={MUTED}
                      secureTextEntry={!showPw}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      blurOnSubmit={false}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.showBtn}
                      onPress={() => setShowPw((v) => !v)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.showBtnText}>{showPw ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput
                    ref={confirmRef}
                    testID="confirm-password-input"
                    style={[
                      styles.input,
                      focused === 'confirm' && styles.inputFocused,
                      confirmPw.length > 0 && !passwordsMatch && styles.inputError,
                    ]}
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    onFocus={() => setFocused('confirm')}
                    onBlur={() => setFocused(null)}
                    placeholder="Repeat new password"
                    placeholderTextColor={MUTED}
                    secureTextEntry={!showPw}
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />
                  {confirmPw.length > 0 && (
                    <View style={styles.matchRow}>
                      <Ionicons
                        name={newPw === confirmPw ? 'checkmark-circle' : 'close-circle'}
                        size={14}
                        color={newPw === confirmPw ? SUCCESS : '#EF4444'}
                      />
                      <Text style={[styles.matchText, { color: newPw === confirmPw ? SUCCESS : '#EF4444' }]}>
                        {newPw === confirmPw ? 'Passwords match' : 'Passwords do not match'}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  testID="reset-password-button"
                  style={[
                    styles.btn,
                    (!newPw || !confirmPw || newPw !== confirmPw || loading) && styles.btnDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={!newPw || !confirmPw || newPw !== confirmPw || loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnText}>Update Password</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={{ height: 32 }} />
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
    paddingTop: 16,
    paddingBottom: 24,
    gap: 6,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 8,
  },
  backText: {
    fontSize: 14,
    color: BRAND,
    fontWeight: '600',
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
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
    width: 58,
    height: 58,
    borderRadius: 13,
  },
  appName: {
    fontSize: 22,
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

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  stepLine: {
    position: 'absolute',
    top: 14,
    width: '33%',
    height: 1,
    backgroundColor: BORDER,
    zIndex: 0,
  },
  stepItem:     { alignItems: 'center', gap: 6, zIndex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { borderColor: BRAND, backgroundColor: BRAND },
  stepDotDone:   { borderColor: SUCCESS, backgroundColor: SUCCESS },
  stepNum:       { fontSize: 12, fontWeight: '700', color: MUTED },
  stepLabel:     { fontSize: 11, fontWeight: '600', color: MUTED },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    marginBottom: 20,
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

  field: { marginBottom: 16 },
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
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
  },

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

  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  matchText: { fontSize: 12, fontWeight: '600' },

  btn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  resendBtn:  { alignItems: 'center', paddingVertical: 10 },
  resendText: { fontSize: 13, color: BRAND, fontWeight: '600' },

  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  devText: { fontSize: 12, color: TEXT, flex: 1, lineHeight: 18 },
});
