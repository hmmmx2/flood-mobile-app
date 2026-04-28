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
  ScrollView, Alert, TextInput as RNTextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import { authApi } from '@/src/api';

const BRAND  = '#1d4ed8';
const BG     = '#F4F6F9';
const CARD   = '#FFFFFF';
const BORDER = '#DDE3ED';
const TEXT   = '#1A1A2E';
const MUTED  = '#6B7280';
const SUCCESS = '#22C55E';

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen() {
  const [step, setStep]           = useState<Step>(1);
  const [email, setEmail]         = useState('');
  const [code, setCode]           = useState('');
  const [devCode, setDevCode]     = useState('');   // auto-filled in dev mode
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);

  const codeRef    = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  // ── Step 1: request reset code ─────────────────────────────────────────────
  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim() });
      // Dev mode: backend returns the code in the response
      const returned = (res as any)?.data?.code ?? '';
      setDevCode(returned);
      setCode(returned); // auto-fill for convenience in development
      setStep(2);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message as string | undefined;
        if (error.response?.status === 429) {
          Alert.alert('Too many requests', 'Please wait before trying again.');
        } else if (error.response?.status === 404) {
          Alert.alert('Email not found', 'No account found with this email.');
        } else {
          Alert.alert('Error', msg ?? 'Failed to send reset code. Please try again.');
        }
      } else {
        Alert.alert('Error', 'Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify code ────────────────────────────────────────────────────
  const handleVerifyCode = async () => {
    if (code.trim().length < 4) {
      Alert.alert('Required', 'Please enter the verification code.');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyResetCode({ email: email.trim(), code: code.trim() });
      setStep(3);
    } catch {
      Alert.alert('Invalid code', 'The code is incorrect or has expired. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: set new password ───────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (newPw.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), newPassword: newPw });
      Alert.alert(
        'Password updated',
        'Your password has been reset. Please sign in with your new password.',
        [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch {
      Alert.alert('Error', 'Could not reset password. Please start over.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ─────────────────────────────────────────────────────────
  const stepLabels = ['Email', 'Verify', 'Reset'];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={BRAND} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.header}>
          <View style={styles.brandDot} />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 1 && "Enter your email and we'll send a reset code."}
            {step === 2 && `Enter the code sent to ${email}.`}
            {step === 3 && 'Choose a strong new password.'}
          </Text>
        </View>

        {/* Step dots */}
        <View style={styles.stepRow}>
          {stepLabels.map((label, i) => {
            const s = (i + 1) as Step;
            const active  = step === s;
            const done    = step > s;
            return (
              <View key={label} style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  active && styles.stepDotActive,
                  done && styles.stepDotDone,
                ]}>
                  {done
                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                    : <Text style={[styles.stepNum, (active || done) && { color: '#fff' }]}>{s}</Text>
                  }
                </View>
                <Text style={[styles.stepLabel, active && { color: BRAND }]}>{label}</Text>
              </View>
            );
          })}
          {/* connector lines */}
          <View style={[styles.stepLine, { left: '16%' }]} />
          <View style={[styles.stepLine, { left: '50%' }]} />
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* ── Step 1 ─────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={16} color={MUTED} />
                  <TextInput
                    style={styles.inputInner}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={MUTED}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleRequestCode}
                    autoFocus
                  />
                </View>
              </View>
              <TouchableOpacity
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

          {/* ── Step 2 ─────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              {devCode ? (
                <View style={styles.devBanner}>
                  <Ionicons name="code-slash-outline" size={14} color={BRAND} />
                  <Text style={styles.devText}>
                    Dev mode — code auto-filled: <Text style={{ fontWeight: '700' }}>{devCode}</Text>
                  </Text>
                </View>
              ) : null}
              <View style={styles.field}>
                <Text style={styles.label}>VERIFICATION CODE</Text>
                <TextInput
                  ref={codeRef}
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Enter code"
                  placeholderTextColor={MUTED}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyCode}
                  autoFocus
                />
              </View>
              <TouchableOpacity
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
                onPress={() => { setStep(1); setCode(''); setDevCode(''); }}
              >
                <Text style={styles.resendText}>Didn't receive it? Try again</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 3 ─────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>NEW PASSWORD</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
                  <TextInput
                    style={[styles.inputInner, { paddingRight: 36 }]}
                    value={newPw}
                    onChangeText={setNewPw}
                    placeholder="At least 8 characters"
                    placeholderTextColor={MUTED}
                    secureTextEntry={!showPw}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                    blurOnSubmit={false}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPw(v => !v)}
                  >
                    <Ionicons
                      name={showPw ? 'eye-off-outline' : 'eye-outline'}
                      size={16}
                      color={MUTED}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
                  <TextInput
                    ref={confirmRef}
                    style={[styles.inputInner, { paddingRight: 36 }]}
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    placeholder="Repeat new password"
                    placeholderTextColor={MUTED}
                    secureTextEntry={!showPw}
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPw(v => !v)}
                  >
                    <Ionicons
                      name={showPw ? 'eye-off-outline' : 'eye-outline'}
                      size={16}
                      color={MUTED}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Password match indicator */}
              {confirmPw.length > 0 && (
                <View style={styles.matchRow}>
                  <Ionicons
                    name={newPw === confirmPw ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={newPw === confirmPw ? SUCCESS : '#EF4444'}
                  />
                  <Text style={[
                    styles.matchText,
                    { color: newPw === confirmPw ? SUCCESS : '#EF4444' },
                  ]}>
                    {newPw === confirmPw ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                </View>
              )}
              <TouchableOpacity
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 40 },

  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 14, fontWeight: '600', color: BRAND },

  header: { marginBottom: 24, gap: 6 },
  brandDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: BRAND, marginBottom: 4,
  },
  title:    { fontSize: 26, fontWeight: '800', color: TEXT },
  subtitle: { fontSize: 14, color: MUTED, lineHeight: 20 },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 28,
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
  stepItem: { alignItems: 'center', gap: 6, zIndex: 1 },
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
  stepNum:  { fontSize: 12, fontWeight: '700', color: MUTED },
  stepLabel:{ fontSize: 11, fontWeight: '600', color: MUTED },

  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  field:  { gap: 6 },
  label: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 1, textTransform: 'uppercase',
  },

  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT,
  },
  codeInput: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  inputInner: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
    paddingVertical: 10,
  },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },

  btn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  resendBtn: { alignItems: 'center', paddingVertical: 6 },
  resendText: { fontSize: 13, color: BRAND, fontWeight: '600' },

  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND + '12',
    borderWidth: 1,
    borderColor: BRAND + '40',
    borderRadius: 10,
    padding: 10,
  },
  devText: { fontSize: 12, color: TEXT, flex: 1, lineHeight: 18 },

  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  matchText: { fontSize: 12, fontWeight: '600' },
});
