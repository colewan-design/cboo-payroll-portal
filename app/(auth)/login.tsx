import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { TEAL, useAppTheme, AppTheme } from '@/constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      let message: string;
      if (err?.code === 'ECONNABORTED' || err?.message === 'Network Error' || !err?.response) {
        message =
          'Cannot reach the server. Make sure your device is on the same network as the payroll server.';
      } else {
        message =
          err?.response?.data?.message ??
          err?.response?.data?.errors?.email?.[0] ??
          `Server error (${err?.response?.status ?? 'unknown'})`;
      }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrapper}>
          <Image
            source={require('@/assets/images/bsu-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>CBOO Payroll Portal</Text>
          <Text style={styles.appSubtitle}>Benguet State University · Employee Self-Service</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@bsu.edu.ph"
            placeholderTextColor={theme.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={theme.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Benguet State University — CBOO Payroll System
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: TEAL.darker },
    container: {
      flexGrow: 1, alignItems: 'center', justifyContent: 'center',
      padding: 24, paddingVertical: 48,
    },
    logoWrapper: { alignItems: 'center', marginBottom: 32 },
    logoImage: { width: 110, height: 110, marginBottom: 16 },
    appTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
    appSubtitle: { fontSize: 12, color: TEAL.textSub, marginTop: 4, textAlign: 'center' },
    card: {
      width: '100%', maxWidth: 400,
      backgroundColor: t.cardBg,
      borderRadius: 20, padding: 28,
      borderWidth: 0.5, borderColor: t.cardBorder,
    },
    cardTitle: { fontSize: 20, fontWeight: '700', color: t.primaryDarker, marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', color: t.textSecondary, marginBottom: 6 },
    input: {
      borderWidth: 0.5, borderColor: t.inputBorder,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, color: t.textPrimary,
      backgroundColor: t.inputBg, marginBottom: 16,
    },
    button: {
      backgroundColor: TEAL.primary, borderRadius: 12,
      paddingVertical: 15, alignItems: 'center', marginTop: 4,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    footer: { marginTop: 32, fontSize: 11, color: TEAL.textSub, textAlign: 'center' },
  });
}
