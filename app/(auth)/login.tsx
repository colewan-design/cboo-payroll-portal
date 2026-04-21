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

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
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
            placeholderTextColor="#9ca3af"
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
            placeholderTextColor="#9ca3af"
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
              <ActivityIndicator color="#1B5E20" />
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#1B5E20' },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 48,
  },
  logoWrapper: { alignItems: 'center', marginBottom: 32 },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  appTitle: { fontSize: 22, fontWeight: '700', color: '#F5C200', textAlign: 'center' },
  appSubtitle: { fontSize: 12, color: '#A5D6A7', marginTop: 4, textAlign: 'center' },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#F5C200',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#1B5E20', fontSize: 16, fontWeight: '800' },
  footer: {
    marginTop: 32,
    fontSize: 11,
    color: '#A5D6A7',
    textAlign: 'center',
  },
});
