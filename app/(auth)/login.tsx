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
  ScrollView, Alert, TextInput as RNTextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authApi } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';

const BRAND  = '#1d4ed8';
const BG     = '#eef2ff';
const CARD   = '#FFFFFF';
const BORDER = '#e2e8f0';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const pwRef = useRef<RNTextInput>(null);
  const { setUser } = useAuthStore();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      // setUser works for both roles — AuthUser already has role: 'admin' | 'customer'
      setUser(res.user);
      // Both roles navigate to /(app); the layout handles tab differentiation
      router.replace('/(app)');
    } catch (err: unknown) {
      const status = (err as any)?.response?.status as number | undefined;
      const msg =
        status === 401 || status === 403
          ? 'Incorrect email or password. Please try again.'
          : status === 429
          ? 'Too many login attempts. Please wait a moment and try again.'
          : 'Could not reach the server. Check your network connection.';
      Alert.alert('Login failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!email.trim() && !!password && !loading;

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
        {/* Brand mark */}
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <View style={styles.brandDotInner} />
          </View>
          <View>
            <Text style={styles.brandName}>FloodWatch</Text>
            <Text style={styles.brandSub}>Community &amp; CRM Platform</Text>
          </View>
        </View>

        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue. Admins and community members use the same login.
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {/* Email */}
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
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                blurOnSubmit={false}
                autoFocus
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
                placeholder="Enter your password"
                placeholderTextColor={MUTED}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPw((v) => !v)}
              >
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={MUTED}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

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
              <View style={styles.btnInner}>
                <Text style={styles.btnText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Register link — only for new community members */}
        <TouchableOpacity
          style={styles.registerRow}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.registerText}>
            New here?{'  '}
            <Text style={styles.registerLink}>Create a community account</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          FloodWatch — Real-time flood monitoring for Malaysia
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 64, paddingBottom: 48 },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 36,
  },
  brandMark: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  brandDotInner: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  brandName: { fontSize: 18, fontWeight: '800', color: TEXT },
  brandSub:  { fontSize: 12, color: MUTED, marginTop: 1 },

  heading:  { marginBottom: 24, gap: 6 },
  title:    { fontSize: 28, fontWeight: '800', color: TEXT },
  subtitle: { fontSize: 14, color: MUTED, lineHeight: 21 },

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

  field: { gap: 6 },
  label: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 1, textTransform: 'uppercase',
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
    paddingVertical: 11,
  },
  eyeBtn: { position: 'absolute', right: 12, padding: 4 },

  forgotRow: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 13, color: BRAND, fontWeight: '600' },

  btn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  btnDisabled: { opacity: 0.45 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },

  registerRow: { alignItems: 'center', marginTop: 24 },
  registerText: { fontSize: 14, color: MUTED },
  registerLink: { color: BRAND, fontWeight: '700' },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: MUTED,
    marginTop: 40,
    lineHeight: 18,
  },
});
