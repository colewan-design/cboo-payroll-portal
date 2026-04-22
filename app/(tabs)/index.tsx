import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api, { getAnnouncements } from '@/services/api';
import { Announcement } from '@/components/AnnouncementCard';

type Payslip = {
  id: number;
  payslip_name: string;
  payroll_year: string;
  payslip_type: string;
  payroll_month: string | null;
};

type EmployeeProfile = {
  position: string | null;
  salary_grade: string | null;
  step: number | null;
  monthly_rate: string | null;
  employee_status: string | null;
  place_of_assignment: string | null;
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [recentPayslips, setRecentPayslips] = useState<Payslip[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.employee_id) {
      setLoading(false);
      return;
    }
    try {
      const [payslipRes, profileRes, announcementRes] = await Promise.allSettled([
        api.get('/api/employee/payslips', {
          params: { selectedEmployeeId: user.employee_id },
        }),
        api.get('/api/employee/me'),
        getAnnouncements(1),
      ]);

      if (payslipRes.status === 'fulfilled') {
        const items: Payslip[] = payslipRes.value.data?.payslips ?? [];
        setRecentPayslips(items.slice(0, 4));
      }
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
      }
      if (announcementRes.status === 'fulfilled') {
        const first = announcementRes.value.data?.data?.[0] ?? null;
        setLatestAnnouncement(first);
      }
    } catch {
      // silently ignore — individual settled results handled above
    } finally {
      setLoading(false);
    }
  }, [user?.employee_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Employee';

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  const monthlyRate = profile?.monthly_rate
    ? `₱${Number(profile.monthly_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    : null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{fullName}</Text>
            {user?.employee_id ? (
              <Text style={styles.empId}>Employee ID: {user.employee_id}</Text>
            ) : null}
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
        </View>
      </View>

      {/* ── Employee Info Card ── */}
      {loading ? (
        <View style={styles.infoCardLoading}>
          <ActivityIndicator color="#1B5E20" />
          <Text style={styles.infoCardLoadingText}>Loading employee info…</Text>
        </View>
      ) : profile ? (
        <View style={styles.infoCard}>
          {/* Position */}
          {profile.position ? (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Text style={styles.infoIcon}>💼</Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Position</Text>
                <Text style={styles.infoValue}>{profile.position}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.infoDivider} />

          {/* SG, Step, Rate */}
          <View style={styles.infoStatsRow}>
            <View style={styles.infoStat}>
              <Text style={styles.infoStatValue}>
                {profile.salary_grade ?? '—'}
              </Text>
              <Text style={styles.infoStatLabel}>Salary Grade</Text>
            </View>
            <View style={styles.infoStatDivider} />
            <View style={styles.infoStat}>
              <Text style={styles.infoStatValue}>
                {profile.step ?? '—'}
              </Text>
              <Text style={styles.infoStatLabel}>Step</Text>
            </View>
            <View style={styles.infoStatDivider} />
            <View style={styles.infoStat}>
              <Text style={[styles.infoStatValue, { fontSize: 13 }]}>
                {monthlyRate ?? '—'}
              </Text>
              <Text style={styles.infoStatLabel}>Monthly Rate</Text>
            </View>
          </View>

          {/* Status / Assignment */}
          {(profile.employee_status || profile.place_of_assignment) ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoTagRow}>
                {profile.employee_status ? (
                  <View style={styles.infoTag}>
                    <Text style={styles.infoTagText}>{profile.employee_status}</Text>
                  </View>
                ) : null}
                {profile.place_of_assignment ? (
                  <View style={[styles.infoTag, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                    <Text style={[styles.infoTagText, { color: '#15803d' }]}>
                      📍 {profile.place_of_assignment}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {/* ── Recent Payslips ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payslips</Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <TouchableOpacity onPress={() => router.push('/(tabs)/payslips' as any)}>
            <Text style={styles.seeAll}>See All →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#1B5E20" style={{ paddingVertical: 20 }} />
        ) : recentPayslips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No payslips available yet.</Text>
            <Text style={styles.emptySubtext}>Check back after payroll processing.</Text>
          </View>
        ) : (
          recentPayslips.map((p) => (
            <View key={p.id} style={styles.payslipRow}>
              <View style={styles.payslipIconBox}>
                <Text style={styles.payslipIcon}>📄</Text>
              </View>
              <View style={styles.payslipInfo}>
                <Text style={styles.payslipName} numberOfLines={1}>
                  {p.payslip_name}
                </Text>
                <Text style={styles.payslipMeta}>
                  {p.payslip_type}
                  {p.payroll_month ? ` · ${p.payroll_month}` : ''} · {p.payroll_year}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Latest Announcement ── */}
      {latestAnnouncement ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Announcement</Text>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <TouchableOpacity onPress={() => router.push('/(tabs)/announcements' as any)}>
              <Text style={styles.seeAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.announcementCard}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push(`/announcement/${latestAnnouncement.id}` as any)}
            activeOpacity={0.75}
          >
            {latestAnnouncement.is_pinned ? (
              <Text style={styles.announcementPin}>📌 Pinned</Text>
            ) : null}
            <Text style={styles.announcementTitle} numberOfLines={2}>
              {latestAnnouncement.title}
            </Text>
            <Text style={styles.announcementPreview} numberOfLines={2}>
              {latestAnnouncement.content.replace(/<[^>]*>/g, '').trim()}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── Quick Actions ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push('/(tabs)/payslips' as any)}
          >
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>My Payslips</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push('/(tabs)/announcements' as any)}
          >
            <Text style={styles.actionIcon}>📢</Text>
            <Text style={styles.actionLabel}>Announcements</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push('/(tabs)/profile' as any)}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionLabel}>My Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  header: {
    backgroundColor: '#1B5E20',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerText: { flex: 1, marginRight: 12 },
  greeting: { fontSize: 13, color: '#A5D6A7' },
  name: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
  empId: { fontSize: 12, color: '#C8E6C9', marginTop: 4 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },

  // Employee info card
  infoCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
    overflow: 'hidden',
  },
  infoCardLoading: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 14, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  infoCardLoadingText: { fontSize: 13, color: '#6b7280' },

  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  infoIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  infoIcon: { fontSize: 20 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },

  infoDivider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  infoStatsRow: { flexDirection: 'row', padding: 16 },
  infoStat: { flex: 1, alignItems: 'center' },
  infoStatValue: { fontSize: 18, fontWeight: '800', color: '#1B5E20' },
  infoStatLabel: { fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'center', fontWeight: '600' },
  infoStatDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },

  infoTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  infoTag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9',
  },
  infoTagText: { fontSize: 11, fontWeight: '600', color: '#1B5E20' },

  section: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 0,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#B8940A', fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  emptySubtext: { fontSize: 12, color: '#9ca3af', marginTop: 4 },

  payslipRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  payslipIconBox: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  payslipIcon: { fontSize: 18 },
  payslipInfo: { flex: 1 },
  payslipName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  payslipMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#334155', textAlign: 'center' },

  announcementCard: {
    backgroundColor: '#f0fdf4', borderRadius: 10,
    padding: 14, borderWidth: 1, borderColor: '#bbf7d0',
  },
  announcementPin: { fontSize: 11, color: '#92400e', fontWeight: '600', marginBottom: 4 },
  announcementTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  announcementPreview: { fontSize: 13, color: '#6b7280', lineHeight: 19 },
});
