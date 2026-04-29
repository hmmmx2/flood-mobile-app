/**
 * Register screen — community user sign-up
 * Mirrors: flood-website-community /login (register view)
 */

import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, TextInput as RNTextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import { colors } from '@/src/theme';

const BRAND = colors.brand;
const BG = colors.bg;
const CARD = colors.card;
const BORDER = colors.border;
const TEXT = colors.text;
const MUTED = colors.muted;

export default function RegisterScreen() {
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);

  const lastRef    = useRef<RNTextInput>(null);
  const emailRef   = useRef<RNTextInput>(null);
  const pwRef      = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const { setUser } = useAuthStore();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleRegister = async () => {
    const f = firstName.trim();
    const l = lastName.trim();
    const e = email.trim();
    if (!f || !l || !e || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (!emailRegex.test(e)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPw) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
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
          ? apiMsg
          : 'Could not create your account. Check your connection and try again.';
      Alert.alert('Registration failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = firstName && lastName && email && password && confirmPw && !loading;

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
        {/* Back */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={BRAND} />
          <Text style={styles.backText}>Sign In</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandDot} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the FloodWatch community</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Name row */}
          <View style={styles.nameRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>FIRST NAME</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="John"
                placeholderTextColor={MUTED}
                returnKeyType="next"
                onSubmitEditing={() => lastRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>LAST NAME</Text>
              <TextInput
                ref={lastRef}
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                placeholderTextColor={MUTED}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color={MUTED} />
              <TextInput
                ref={emailRef}
                style={styles.inputInner}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
              <TextInput
                ref={pwRef}
                style={[styles.inputInner, { paddingRight: 36 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={MUTED}
                secureTextEntry={!showPw}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
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

          {/* Confirm password */}
          <View style={styles.field}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
              <TextInput
                ref={confirmRef}
                style={[styles.inputInner, { paddingRight: 36 }]}
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Repeat your password"
                placeholderTextColor={MUTED}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm(v => !v)}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={MUTED}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Sign-in link */}
        <TouchableOpacity
          style={styles.signinRow}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.signinText}>
            Already have an account?{'  '}
            <Text style={styles.signinLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: BG },
  scroll:   { flexGrow: 1, padding: 20, paddingBottom: 40 },

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
  subtitle: { fontSize: 14, color: MUTED },

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

  nameRow: { flexDirection: 'row', gap: 12 },

  field: { gap: 6 },
  label: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 1, textTransform: 'uppercase',
  },

  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT,
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
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },

  btn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  signinRow: { alignItems: 'center', marginTop: 24 },
  signinText: { fontSize: 14, color: MUTED },
  signinLink: { color: BRAND, fontWeight: '700' },
});
