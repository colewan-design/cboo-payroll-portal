import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

type InfoRowProps = {
  label: string;
  value: string | null | undefined;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: handleLogout,
      },
    ]);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  }

  const fullName = [user?.first_name, user?.middle_name, user?.last_name, user?.suffix]
    .filter(Boolean)
    .join(' ');

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  const primaryRole = user?.roles?.[0]?.name ?? 'Employee';

  return (
    <ScrollView style={styles.container} bounces>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials || '?'}</Text>
        </View>
        <Text style={styles.fullName}>{fullName || 'Employee'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{primaryRole}</Text>
        </View>
        {user?.email ? (
          <Text style={styles.email}>{user.email}</Text>
        ) : null}
      </View>

      {/* Employee Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Information</Text>
        <InfoRow label="Employee ID" value={user?.employee_id} />
        <InfoRow label="First Name" value={user?.first_name} />
        <InfoRow label="Middle Name" value={user?.middle_name} />
        <InfoRow label="Last Name" value={user?.last_name} />
        {user?.suffix ? <InfoRow label="Suffix" value={user.suffix} /> : null}
        <InfoRow label="Email" value={user?.email} />
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {user?.roles && user.roles.length > 0 ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Roles</Text>
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
          style={styles.changePasswordRow}
          onPress={() => router.push('/change-password')}
          activeOpacity={0.7}
        >
          <Text style={styles.changePasswordText}>Change Password</Text>
          <Text style={styles.changePasswordChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && styles.logoutBtnDisabled]}
          onPress={confirmLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          {loggingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.logoutText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#A5D6A7',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  fullName: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  email: { fontSize: 13, color: '#A5D6A7', marginTop: 8 },

  section: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 13, color: '#6b7280', flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'right' },

  rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1, justifyContent: 'flex-end' },
  roleChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleChipText: { fontSize: 12, color: '#1B5E20', fontWeight: '600' },

  changePasswordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  changePasswordText: { fontSize: 13, fontWeight: '600', color: '#1B5E20' },
  changePasswordChevron: { fontSize: 20, color: '#9ca3af', lineHeight: 22 },

  logoutBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnDisabled: { opacity: 0.6 },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
