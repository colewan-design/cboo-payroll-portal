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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import api, { getAnnouncements } from '@/services/api';
import { Announcement } from '@/components/AnnouncementCard';
import { TEAL, BSU, useAppTheme, AppTheme } from '@/constants/theme';

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
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  const [recentPayslips, setRecentPayslips] = useState<Payslip[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.employee_id) { setLoading(false); return; }
    try {
      const [payslipRes, profileRes, announcementRes] = await Promise.allSettled([
        api.get('/api/employee/payslips', { params: { selectedEmployeeId: user.employee_id } }),
        api.get('/api/employee/me'),
        getAnnouncements(1),
      ]);
      if (payslipRes.status === 'fulfilled') {
        setRecentPayslips((payslipRes.value.data?.payslips ?? []).slice(0, 3));
      }
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      if (announcementRes.status === 'fulfilled') {
        setLatestAnnouncement(announcementRes.value.data?.data?.[0] ?? null);
      }
    } catch { /* individual settled results handled above */ }
    finally { setLoading(false); }
  }, [user?.employee_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Employee';
  const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase();
  const monthlyRate = profile?.monthly_rate
    ? `₱${Number(profile.monthly_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    : null;

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
            {user?.employee_id ? (
              <View style={styles.empIdBadge}>
                <Ionicons name="card-outline" size={11} color={TEAL.textSub} />
                <Text style={styles.empId}> ID: {user.employee_id}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Stats Card */}
        {loading ? (
          <View style={styles.statsCardLoading}>
            <ActivityIndicator color={TEAL.primary} size="small" />
            <Text style={styles.loadingLabel}>Loading profile…</Text>
          </View>
        ) : profile ? (
          <View style={styles.statsCard}>
            {profile.position ? (
              <View style={styles.positionRow}>
                <View style={styles.positionIconWrap}>
                  <Ionicons name="briefcase-outline" size={18} color={TEAL.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.positionLabel}>Position</Text>
                  <Text style={styles.positionValue}>{profile.position}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.statsDivider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.salary_grade ?? '—'}</Text>
                <Text style={styles.statLabel}>Salary{'\n'}Grade</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.step ?? '—'}</Text>
                <Text style={styles.statLabel}>Step</Text>
              </View>
              <View style={styles.statSep} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontSize: 13 }]}>{monthlyRate ?? '—'}</Text>
                <Text style={styles.statLabel}>Monthly{'\n'}Rate</Text>
              </View>
            </View>

            {(profile.employee_status || profile.place_of_assignment) ? (
              <>
                <View style={styles.statsDivider} />
                <View style={styles.tagRow}>
                  {profile.employee_status ? (
                    <View style={styles.tag}>
                      <Ionicons name="checkmark-circle-outline" size={11} color={TEAL.dark} />
                      <Text style={styles.tagText}> {profile.employee_status}</Text>
                    </View>
                  ) : null}
                  {profile.place_of_assignment ? (
                    <View style={[styles.tag, styles.tagAlt]}>
                      <Ionicons name="location-outline" size={11} color={BSU.goldDark} />
                      <Text style={[styles.tagText, { color: BSU.goldDark }]}> {profile.place_of_assignment}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'document-text-outline' as const, label: 'Payslips', route: '/(tabs)/payslips' },
            { icon: 'megaphone-outline' as const, label: 'Announcements', route: '/(tabs)/announcements' },
            { icon: 'person-circle-outline' as const, label: 'Profile', route: '/(tabs)/profile' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickAction}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={item.icon} size={24} color={TEAL.primary} />
              </View>
              <Text style={styles.quickActionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Payslips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payslips</Text>
            <TouchableOpacity
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push('/(tabs)/payslips' as any)}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons name="chevron-forward" size={13} color={TEAL.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={TEAL.primary} style={{ paddingVertical: 20 }} />
          ) : recentPayslips.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="folder-open-outline" size={36} color={theme.textMuted} />
              <Text style={styles.emptyText}>No payslips yet</Text>
              <Text style={styles.emptySubtext}>Check back after payroll processing.</Text>
            </View>
          ) : (
            recentPayslips.map((p, i) => (
              <View
                key={p.id}
                style={[styles.payslipRow, i < recentPayslips.length - 1 && styles.payslipRowBorder]}
              >
                <View style={styles.payslipIconWrap}>
                  <Ionicons name="document-text-outline" size={20} color={TEAL.primary} />
                </View>
                <View style={styles.payslipInfo}>
                  <Text style={styles.payslipName} numberOfLines={1}>{p.payslip_name}</Text>
                  <Text style={styles.payslipMeta}>
                    {p.payslip_type}{p.payroll_month ? ` · ${p.payroll_month}` : ''} · {p.payroll_year}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
            ))
          )}
        </View>

        {/* Latest Announcement */}
        {latestAnnouncement ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Announcement</Text>
              <TouchableOpacity
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onPress={() => router.push('/(tabs)/announcements' as any)}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>View all</Text>
                <Ionicons name="chevron-forward" size={13} color={TEAL.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.announcementCard}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push(`/announcement/${latestAnnouncement.id}` as any)}
              activeOpacity={0.75}
            >
              {latestAnnouncement.is_pinned ? (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="pin" size={10} color={BSU.goldDark} />
                  <Text style={styles.pinnedText}> Pinned</Text>
                </View>
              ) : null}
              <Text style={styles.announcementTitle} numberOfLines={2}>
                {latestAnnouncement.title}
              </Text>
              <Text style={styles.announcementPreview} numberOfLines={3}>
                {latestAnnouncement.content.replace(/<[^>]*>/g, '').trim()}
              </Text>
              <View style={styles.announcementFooter}>
                <Text style={styles.announcementReadMore}>Read more</Text>
                <Ionicons name="arrow-forward" size={13} color={TEAL.primary} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },

    header: {
      backgroundColor: TEAL.primary,
      paddingTop: Platform.OS === 'ios' ? 56 : 48,
      paddingBottom: 28, paddingHorizontal: 20,
    },
    headerInner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    headerLeft: { flex: 1, marginRight: 12 },
    greeting: { fontSize: 13, color: TEAL.textSub, fontWeight: '500' },
    name: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 2, letterSpacing: -0.3 },
    empIdBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    empId: { fontSize: 12, color: TEAL.textSub },
    avatar: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    },
    avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },

    body: { paddingHorizontal: 16, marginTop: -1 },

    statsCard: {
      backgroundColor: t.cardBg, borderRadius: 16, marginTop: 16,
      borderWidth: 0.5, borderColor: t.cardBorder, overflow: 'hidden',
    },
    statsCardLoading: {
      backgroundColor: t.cardBg, borderRadius: 16, marginTop: 16,
      padding: 20, flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 0.5, borderColor: t.cardBorder,
    },
    loadingLabel: { fontSize: 13, color: t.textMuted },
    positionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    positionIconWrap: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    positionLabel: { fontSize: 10, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    positionValue: { fontSize: 14, fontWeight: '700', color: t.textPrimary, marginTop: 2 },
    statsDivider: { height: 1, backgroundColor: t.divider },
    statsRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 12 },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '800', color: TEAL.primary, letterSpacing: -0.5 },
    statLabel: { fontSize: 10, color: t.textMuted, marginTop: 4, textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
    statSep: { width: 1, backgroundColor: t.divider, marginVertical: 4 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
    tag: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
      backgroundColor: t.primaryLight, borderWidth: 0.5, borderColor: t.primaryBorder,
    },
    tagAlt: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
    tagText: { fontSize: 11, fontWeight: '600', color: t.primaryDark },

    quickActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
    quickAction: {
      flex: 1, backgroundColor: t.cardBg, borderRadius: 14, paddingVertical: 16,
      alignItems: 'center', gap: 8,
      borderWidth: 0.5, borderColor: t.cardBorder,
    },
    quickActionIcon: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    quickActionLabel: { fontSize: 11, fontWeight: '700', color: t.textSecondary, textAlign: 'center' },

    section: {
      backgroundColor: t.cardBg, borderRadius: 16, marginTop: 16, padding: 16,
      borderWidth: 0.5, borderColor: t.cardBorder,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: t.textPrimary },
    seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seeAllText: { fontSize: 12, color: TEAL.primary, fontWeight: '600' },

    emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 6 },
    emptyText: { fontSize: 14, color: t.textLight, fontWeight: '600' },
    emptySubtext: { fontSize: 12, color: t.textMuted },

    payslipRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
    payslipRowBorder: { borderBottomWidth: 1, borderBottomColor: t.divider },
    payslipIconWrap: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    payslipInfo: { flex: 1 },
    payslipName: { fontSize: 13, fontWeight: '600', color: t.textPrimary },
    payslipMeta: { fontSize: 11, color: t.textMuted, marginTop: 2 },

    announcementCard: {
      backgroundColor: t.primaryLight, borderRadius: 12,
      padding: 14, borderWidth: 0.5, borderColor: t.cardBorder,
    },
    pinnedBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    pinnedText: { fontSize: 11, color: BSU.goldDark, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    announcementTitle: { fontSize: 14, fontWeight: '700', color: t.textPrimary, lineHeight: 20, marginBottom: 6 },
    announcementPreview: { fontSize: 13, color: t.textLight, lineHeight: 20 },
    announcementFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
    announcementReadMore: { fontSize: 12, fontWeight: '700', color: TEAL.primary },
  });
}
