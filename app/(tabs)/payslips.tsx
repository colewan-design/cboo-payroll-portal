import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import api, { TOKEN_KEY } from '@/services/api';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/constants/api';
import { BSU } from '@/constants/theme';
import { getItem } from '@/services/storage';

type Payslip = {
  id: number;
  payslip_name: string;
  payslip_type: string;
  payroll_year: string;
  payroll_month: string | null;
  allow_access: string;
  file_path: string;
  created_at: string;
  updated_at: string;
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

type SalaryInfo = { salary_grade: number | null; step: number | null; basic_salary: string | null };

function DetailModal({ payslip, onClose }: { payslip: Payslip | null; onClose: () => void }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [salaryInfo, setSalaryInfo] = useState<SalaryInfo | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  useEffect(() => {
    if (!payslip) return;
    setSalaryInfo(null);
    setSalaryLoading(true);
    api.get(`/api/employee/payslip/salary-info/${payslip.id}`)
      .then(res => setSalaryInfo(res.data))
      .catch(() => setSalaryInfo(null))
      .finally(() => setSalaryLoading(false));
  }, [payslip?.id]);

  if (!payslip) return null;

  async function handleDownload() {
    setDownloading(true);
    setProgress(0);
    try {
      const token = await getItem(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');

      const safeName = payslip!.payslip_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileUri = `${FileSystem.cacheDirectory}${safeName}.pdf`;

      const downloadResumable = FileSystem.createDownloadResumable(
        `${API_BASE_URL}/api/employee/payslip/download/${payslip!.id}`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } },
        (dl: FileSystem.DownloadProgressData) => {
          if (dl.totalBytesExpectedToWrite > 0)
            setProgress(dl.totalBytesWritten / dl.totalBytesExpectedToWrite);
        },
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || result.status !== 200)
        throw new Error(`Download failed (status ${result?.status ?? 'unknown'})`);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: payslip!.payslip_name, UTI: 'com.adobe.pdf' });
    } catch (err: any) {
      Alert.alert('Download Failed', err?.message ?? 'Could not download the payslip.');
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  }

  const rows = [
    { label: 'Payslip Name', value: payslip.payslip_name },
    { label: 'Type', value: payslip.payslip_type },
    { label: 'Year', value: payslip.payroll_year },
    { label: 'Month', value: payslip.payroll_month ?? '—' },
    { label: 'Date Generated', value: new Date(payslip.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) },
    { label: 'Last Updated', value: new Date(payslip.updated_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) },
  ];

  const monthlyRateFormatted = salaryInfo?.basic_salary
    ? `₱${Number(salaryInfo.basic_salary).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    : '—';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />

          {/* Sheet header */}
          <View style={modal.header}>
            <View style={modal.headerIconWrap}>
              <Ionicons name="document-text-outline" size={22} color={BSU.green} />
            </View>
            <View style={modal.headerText}>
              <Text style={modal.title} numberOfLines={2}>{payslip.payslip_name}</Text>
              <Text style={modal.subtitle}>{payslip.payslip_type} · {payslip.payroll_year}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn} hitSlop={10}>
              <Ionicons name="close-circle" size={24} color="#d1d5db" />
            </TouchableOpacity>
          </View>

          <ScrollView style={modal.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
            {/* Details */}
            <Text style={modal.sectionLabel}>Payslip Details</Text>
            <View style={modal.detailCard}>
              {rows.map((row, i) => (
                <View key={row.label} style={[modal.detailRow, i < rows.length - 1 && modal.detailRowBorder]}>
                  <Text style={modal.detailLabel}>{row.label}</Text>
                  <Text style={modal.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Compensation */}
            <Text style={[modal.sectionLabel, { marginTop: 16 }]}>Compensation</Text>
            <View style={modal.detailCard}>
              {salaryLoading ? (
                <View style={modal.detailRow}>
                  <ActivityIndicator size="small" color={BSU.green} />
                </View>
              ) : (
                <>
                  <View style={[modal.detailRow, modal.detailRowBorder]}>
                    <Text style={modal.detailLabel}>Salary Grade</Text>
                    <Text style={modal.detailValue}>{salaryInfo?.salary_grade ?? '—'}</Text>
                  </View>
                  <View style={[modal.detailRow, modal.detailRowBorder]}>
                    <Text style={modal.detailLabel}>Step</Text>
                    <Text style={modal.detailValue}>{salaryInfo?.step ?? '—'}</Text>
                  </View>
                  <View style={modal.detailRow}>
                    <Text style={modal.detailLabel}>Monthly Rate</Text>
                    <Text style={modal.detailValue}>{monthlyRateFormatted}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Progress bar */}
            {downloading && progress > 0 && (
              <View style={modal.progressWrap}>
                <View style={modal.progressBar}>
                  <View style={[modal.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
                </View>
                <Text style={modal.progressText}>{Math.round(progress * 100)}%</Text>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity
              style={modal.secondaryBtn}
              onPress={() => {
                onClose();
                router.push(`/payslip/${payslip.id}?name=${encodeURIComponent(payslip.payslip_name)}` as never);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="bar-chart-outline" size={18} color={BSU.green} />
              <Text style={modal.secondaryBtnText}>View Salary Breakdown</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[modal.primaryBtn, downloading && modal.primaryBtnDisabled]}
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.8}
            >
              {downloading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={modal.primaryBtnText}>
                    {progress > 0 ? `Downloading ${Math.round(progress * 100)}%…` : 'Preparing…'}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={modal.primaryBtnText}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={modal.ghostBtn} onPress={onClose}>
              <Text style={modal.ghostBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Payslip Card ─────────────────────────────────────────────────────────────

function PayslipCard({ payslip, onPress }: { payslip: Payslip; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardIconWrap}>
        <Ionicons name="document-text-outline" size={22} color={BSU.green} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{payslip.payslip_name}</Text>
        <Text style={styles.cardType}>{payslip.payslip_type}</Text>
        <Text style={styles.cardMeta}>
          {[payslip.payroll_month, payslip.payroll_year].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PayslipsScreen() {
  const { user } = useAuth();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employeeId = user?.employee_id ?? '';

  const fetchPayslips = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { selectedEmployeeId: employeeId };
      if (year) params.payrollYear = year;
      if (typeFilter) params.payslipType = typeFilter;
      if (search) params.searchKey = search;

      const res = await api.get('/api/employee/payslips', { params });
      const items: Payslip[] = res.data?.payslips ?? [];
      const years: string[] = res.data?.available_years ?? [];
      const types: string[] = res.data?.available_types ?? [];

      setPayslips(items);
      setAvailableTypes(types);
      if (years.length > 0) {
        setAvailableYears(years);
        setYear(prev => (prev === '' ? years[0] : prev));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load payslips.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, year, typeFilter, search]);

  useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayslips(false);
  }, [fetchPayslips]);

  if (!employeeId) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Payslips</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No employee record linked</Text>
          <Text style={styles.emptySubtext}>
            Your account ({user?.email}) does not have an employee ID assigned.
            Please contact HR or the system administrator.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Payslips</Text>
        <Text style={styles.headerSub}>
          {user?.first_name} {user?.last_name} · ID {employeeId}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersBox}>
        <Text style={styles.filterLabel}>Year</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={styles.chipRow}>
            {[{ label: 'All', value: '' }, ...availableYears.map(y => ({ label: y, value: y }))].map(item => (
              <TouchableOpacity
                key={item.value || 'all'}
                style={[styles.chip, year === item.value && styles.chipActive]}
                onPress={() => setYear(item.value)}
              >
                <Text style={[styles.chipText, year === item.value && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {availableTypes.length > 0 && (
          <>
            <Text style={styles.filterLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={styles.chipRow}>
                {[{ label: 'All', value: '' }, ...availableTypes.map(t => ({ label: t, value: t }))].map(item => (
                  <TouchableOpacity
                    key={item.value || 'all'}
                    style={[styles.chip, typeFilter === item.value && styles.chipActive]}
                    onPress={() => setTypeFilter(item.value)}
                  >
                    <Text style={[styles.chipText, typeFilter === item.value && styles.chipTextActive]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search payslips…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Count badge */}
      {!loading && !error && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {payslips.length} payslip{payslips.length !== 1 ? 's' : ''}
            {year ? ` · ${year}` : ''}
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={BSU.green} size="large" />
          <Text style={styles.loadingText}>Loading payslips…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Could not load payslips</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPayslips()}>
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={payslips}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={payslips.length === 0 ? styles.emptyFlex : { paddingTop: 8, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BSU.green} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="folder-open-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No payslips found</Text>
              <Text style={styles.emptySubtext}>
                {search
                  ? 'No payslips match your search.'
                  : typeFilter
                  ? `No "${typeFilter}" payslips for ${year || 'any year'}.`
                  : year
                  ? `No payslips found for ${year}.`
                  : 'No payslips have been generated yet for your account.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PayslipCard payslip={item} onPress={() => setSelected(item)} />
          )}
        />
      )}

      <DetailModal payslip={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },

  header: {
    backgroundColor: BSU.green,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: BSU.textOnGreen, marginTop: 4 },

  filtersBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 10, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', gap: 6, paddingRight: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: BSU.green, borderColor: BSU.green },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    backgroundColor: '#f9fafb', paddingHorizontal: 10, marginTop: 4,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14, color: '#111827',
  },

  countRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },
  countText: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 8 },
  emptyFlex: { flex: 1 },
  loadingText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, backgroundColor: BSU.green,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 5,
    borderRadius: 14, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: BSU.greenLight, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  cardType: { fontSize: 11, color: BSU.goldDark, fontWeight: '600', marginTop: 3 },
  cardMeta: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 56,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12,
  },
  headerIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: BSU.greenLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 20 },
  subtitle: { fontSize: 12, color: BSU.goldDark, marginTop: 3, fontWeight: '600' },
  closeBtn: { padding: 2 },

  body: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  detailCard: {
    borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 14,
    overflow: 'hidden', marginBottom: 4, backgroundColor: '#fafafa',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 13, color: '#9ca3af', flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1.5, textAlign: 'right' },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: BSU.goldDark, borderRadius: 3 },
  progressText: { fontSize: 12, color: BSU.goldDark, fontWeight: '700', width: 36 },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BSU.greenLight, borderRadius: 14,
    paddingVertical: 14, marginTop: 16, marginBottom: 10,
    borderWidth: 1, borderColor: BSU.greenBorder,
  },
  secondaryBtnText: { color: BSU.green, fontSize: 15, fontWeight: '700' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BSU.green, borderRadius: 14,
    paddingVertical: 15, marginBottom: 10,
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  ghostBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  ghostBtnText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },
});
