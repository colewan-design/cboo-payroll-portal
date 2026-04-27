import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { changePassword } from '@/services/api';
import { TEAL, useAppTheme, AppTheme } from '@/constants/theme';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = 'Current password is required.';
    if (!newPassword) next.newPassword = 'New password is required.';
    else if (newPassword.length < 8) next.newPassword = 'Password must be at least 8 characters.';
    if (!confirmPassword) next.confirmPassword = 'Please confirm your new password.';
    else if (newPassword !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        'Failed to change password. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Change Password</Text>
          <Text style={styles.headerSub}>Update your account password</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={TEAL.primary} />
          <Text style={styles.infoText}>
            Enter your current password, then choose a new one that is at least 8 characters.
          </Text>
        </View>

        <View style={styles.section}>
          <Field label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} error={errors.currentPassword} secureTextEntry theme={theme} />
          <Field label="New Password" value={newPassword} onChangeText={setNewPassword} error={errors.newPassword} secureTextEntry theme={theme} />
          <Field label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} error={errors.confirmPassword} secureTextEntry last theme={theme} />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Update Password</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  last?: boolean;
  theme: AppTheme;
};

function Field({ label, value, onChangeText, error, secureTextEntry, last, theme }: FieldProps) {
  const s = makeStyles(theme);
  return (
    <View style={[s.fieldWrap, !last && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, !!error && s.inputError]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={theme.textMuted}
      />
      {error ? (
        <View style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color="#dc2626" />
          <Text style={s.errorText}> {error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    header: {
      backgroundColor: TEAL.primary,
      paddingTop: Platform.OS === 'ios' ? 56 : 48,
      paddingBottom: 20,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center',
    },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    headerSub: { fontSize: 12, color: TEAL.textSub, marginTop: 2 },

    container: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, paddingTop: 20 },

    infoCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: t.primaryLight, borderRadius: 12,
      borderWidth: 0.5, borderColor: t.cardBorder,
      padding: 12, marginBottom: 16,
    },
    infoText: { flex: 1, fontSize: 13, color: t.primaryDarker, lineHeight: 18 },

    section: {
      backgroundColor: t.cardBg, borderRadius: 16, marginBottom: 16,
      borderWidth: 0.5, borderColor: t.cardBorder, overflow: 'hidden',
    },

    fieldWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: t.textSecondary, marginBottom: 8 },
    input: {
      backgroundColor: t.inputBg,
      borderWidth: 0.5, borderColor: t.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, color: t.textPrimary,
    },
    inputError: { borderColor: '#dc2626' },
    errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    errorText: { fontSize: 12, color: '#dc2626' },

    btn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: TEAL.primary, borderRadius: 14,
      paddingVertical: 15, marginBottom: 12,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
