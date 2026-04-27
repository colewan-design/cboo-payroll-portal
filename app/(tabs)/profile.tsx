import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { TEAL, useAppTheme, AppTheme } from '@/constants/theme';

type InfoRowProps = { label: string; value: string | null | undefined; theme: AppTheme };

function InfoRow({ label, value, theme }: InfoRowProps) {
  return (
    <View style={[rowStyle.row, { borderBottomColor: theme.divider }]}>
      <Text style={[rowStyle.label, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[rowStyle.value, { color: theme.textPrimary }]}>{value || '—'}</Text>
    </View>
  );
}

const rowStyle = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1,
  },
  label: { fontSize: 13, flex: 1 },
  value: { fontSize: 13, fontWeight: '600', flex: 1.2, textAlign: 'right' },
});

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [loggingOut, setLoggingOut] = useState(false);

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: handleLogout },
    ]);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); }
    catch { setLoggingOut(false); }
  }

  const fullName = [user?.first_name, user?.middle_name, user?.last_name, user?.suffix]
    .filter(Boolean).join(' ');
  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase();
  const primaryRole = user?.roles?.[0]?.name ?? 'Employee';

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{initials || '?'}</Text>
        </View>
        <Text style={styles.fullName}>{fullName || 'Employee'}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark-outline" size={12} color="#fff" />
          <Text style={styles.roleText}> {primaryRole}</Text>
        </View>
        {user?.email ? (
          <View style={styles.emailRow}>
            <Ionicons name="mail-outline" size={13} color={TEAL.textSub} />
            <Text style={styles.emailText}> {user.email}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {/* Employee Information */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.divider }]}>
            <Ionicons name="person-outline" size={15} color={TEAL.primary} />
            <Text style={styles.sectionTitle}>Employee Information</Text>
          </View>
          <InfoRow label="Employee ID" value={user?.employee_id} theme={theme} />
          <InfoRow label="First Name" value={user?.first_name} theme={theme} />
          <InfoRow label="Middle Name" value={user?.middle_name} theme={theme} />
          <InfoRow label="Last Name" value={user?.last_name} theme={theme} />
          {user?.suffix ? <InfoRow label="Suffix" value={user.suffix} theme={theme} /> : null}
          <InfoRow label="Email" value={user?.email} theme={theme} />
        </View>

        {/* Account */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { borderBottomColor: theme.divider }]}>
            <Ionicons name="settings-outline" size={15} color={TEAL.primary} />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          {user?.roles && user.roles.length > 0 ? (
            <View style={[rowStyle.row, { borderBottomColor: theme.divider, alignItems: 'flex-start' }]}>
              <Text style={[rowStyle.label, { color: theme.textMuted }]}>Roles</Text>
              <View style={styles.rolesWrap}>
                {user.roles.map((r) => (
                  <View key={r.id} style={styles.roleChip}>
                    <Text style={styles.roleChipText}>{r.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/change-password')}
            activeOpacity={0.7}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.actionIcon}>
                <Ionicons name="lock-closed-outline" size={16} color={TEAL.primary} />
              </View>
              <Text style={styles.actionRowText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && styles.logoutBtnDisabled]}
          onPress={confirmLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },

    header: {
      backgroundColor: TEAL.primary,
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 60 : 52,
      paddingBottom: 36,
      paddingHorizontal: 20,
    },
    avatarWrap: {
      width: 86, height: 86, borderRadius: 43,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
      marginBottom: 14,
    },
    avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
    fullName: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
    roleBadge: {
      flexDirection: 'row', alignItems: 'center',
      marginTop: 10, paddingHorizontal: 14, paddingVertical: 5,
      backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    },
    roleText: { fontSize: 12, fontWeight: '600', color: '#fff' },
    emailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    emailText: { fontSize: 13, color: TEAL.textSub },

    body: { paddingHorizontal: 16, marginTop: 16 },

    section: {
      backgroundColor: t.cardBg, borderRadius: 16, marginBottom: 12,
      overflow: 'hidden', borderWidth: 0.5, borderColor: t.cardBorder,
    },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
      borderBottomWidth: 1,
    },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

    rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1.2, justifyContent: 'flex-end', paddingVertical: 2 },
    roleChip: {
      backgroundColor: t.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
      borderWidth: 0.5, borderColor: t.cardBorder,
    },
    roleChipText: { fontSize: 11, color: t.primaryDark, fontWeight: '600' },

    actionRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    actionRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionIcon: {
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    actionRowText: { fontSize: 14, fontWeight: '600', color: t.textPrimary },

    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: '#dc2626', borderRadius: 14,
      paddingVertical: 15, marginBottom: 12,
    },
    logoutBtnDisabled: { opacity: 0.6 },
    logoutText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
