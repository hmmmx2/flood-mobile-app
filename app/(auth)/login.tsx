/**
 * Unified login screen — handles both customer and admin roles.
 *
 * Authentication is performed against flood-service-community (port 4001),
 * which is the single auth source of truth for both roles. The JWT issued
 * here is also accepted by flood-service-crm (port 4002) because they share
 * the same JWT_SECRET.
 *
 * After login, both roles redirect to /(app). The tab layout in
 * app/(app)/_layout.tsx then renders the correct tab set based on user.role.
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

export default function LoginScreen() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [focused, setFocused]       = useState<string | null>(null);
  const pwRef = useRef<RNTextInput>(null);
  const { setUser } = useAuthStore();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      setUser(res.user);
      router.replace('/(app)');
    } catch (err: unknown) {
      const status = (err as any)?.response?.status as number | undefined;
      const msg =
        status === 401 || status === 403
          ? 'Incorrect email or password. Please try again.'
          : status === 429
          ? 'Too many login attempts. Please wait a moment and try again.'
          : 'Cannot reach the server. Please check your internet connection and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!email.trim() && !!password && !loading;

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
            <Text style={styles.appTagline}>Early Flood Warning System</Text>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account to continue</Text>

            {/* Error banner */}
            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, focused === 'email' && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="Enter your email"
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                blurOnSubmit={false}
                autoFocus
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
                  placeholder="Enter your password"
                  placeholderTextColor={MUTED}
                  secureTextEntry={!showPw}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
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

            {/* Remember me + Forgot password */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.rememberLeft}
                onPress={() => setRememberMe((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, !canSubmit && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.switchText}>
              Don&apos;t have an account?{' '}
              <Text style={styles.switchLink}>Create one</Text>
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
    paddingTop: 40,
    paddingBottom: 28,
    gap: 6,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 22,
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
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  appName: {
    fontSize: 26,
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
  inputFocused: {
    borderColor: BRAND,
    backgroundColor: CARD,
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

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  rememberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  rememberText: { fontSize: 13, color: MUTED },
  forgotText:   { fontSize: 13, color: BRAND, fontWeight: '600' },

  btn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
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
