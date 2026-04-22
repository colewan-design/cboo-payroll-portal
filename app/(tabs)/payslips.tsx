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
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/AuthContext';
import api, { TOKEN_KEY } from '@/services/api';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/constants/api';

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

type DetailModalProps = {
  payslip: Payslip | null;
  onClose: () => void;
};

type SalaryInfo = {
  salary_grade: number | null;
  step: number | null;
  basic_salary: string | null;
};

function DetailModal({ payslip, onClose }: DetailModalProps) {
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

  const item = payslip;

  async function handleDownload() {
    setDownloading(true);
    setProgress(0);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) throw new Error('Not authenticated');

      const safeName = item.payslip_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileUri = `${FileSystem.cacheDirectory}${safeName}.pdf`;

      const callback = (dl: FileSystem.DownloadProgressData) => {
        if (dl.totalBytesExpectedToWrite > 0) {
          setProgress(dl.totalBytesWritten / dl.totalBytesExpectedToWrite);
        }
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        `${API_BASE_URL}/api/employee/payslip/download/${item.id}`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } },
        callback,
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || result.status !== 200) {
        throw new Error(`Download failed (status ${result?.status ?? 'unknown'})`);
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Error', 'Sharing is not available on this device.');
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: item.payslip_name,
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      Alert.alert('Download Failed', err?.message ?? 'Could not download the payslip.');
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Payslip Name', value: item.payslip_name },
    { label: 'Type', value: item.payslip_type },
    { label: 'Year', value: item.payroll_year },
    { label: 'Month', value: item.payroll_month ?? '—' },
    {
      label: 'Date Generated',
      value: new Date(item.created_at).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    },
    {
      label: 'Last Updated',
      value: new Date(item.updated_at).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    },
  ];

  const montlyRateFormatted = salaryInfo?.basic_salary
    ? `₱${Number(salaryInfo.basic_salary).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    : '—';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />

          <View style={modal.header}>
            <View style={modal.headerIcon}>
              <Text style={modal.headerIconText}>📄</Text>
            </View>
            <View style={modal.headerText}>
              <Text style={modal.title} numberOfLines={2}>{item.payslip_name}</Text>
              <Text style={modal.subtitle}>{item.payslip_type} · {item.payroll_year}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn} hitSlop={8}>
              <Text style={modal.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={modal.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 48 }}
          >
            <Text style={modal.sectionLabel}>Payslip Details</Text>
            <View style={modal.detailCard}>
              {rows.map((row, i) => (
                <View
                  key={row.label}
                  style={[modal.detailRow, i < rows.length - 1 && modal.detailRowBorder]}
                >
                  <Text style={modal.detailLabel}>{row.label}</Text>
                  <Text style={modal.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Salary Info */}
            <Text style={[modal.sectionLabel, { marginTop: 16 }]}>Compensation</Text>
            <View style={modal.detailCard}>
              {salaryLoading ? (
                <View style={modal.detailRow}>
                  <ActivityIndicator size="small" color="#1B5E20" />
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
                    <Text style={modal.detailValue}>{montlyRateFormatted}</Text>
                  </View>
                </>
              )}
            </View>

            {downloading && progress > 0 && (
              <View style={modal.progressWrap}>
                <View style={modal.progressBar}>
                  <View style={[modal.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>
                <Text style={modal.progressText}>{Math.round(progress * 100)}%</Text>
              </View>
            )}

            <TouchableOpacity
              style={modal.breakdownBtn}
              onPress={() => {
                onClose();
                router.push(`/payslip/${item.id}?name=${encodeURIComponent(item.payslip_name)}` as never);
              }}
              activeOpacity={0.8}
            >
              <Text style={modal.breakdownBtnText}>📊  View Salary Breakdown</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[modal.downloadBtn, downloading && modal.downloadBtnDisabled]}
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.8}
            >
              {downloading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={modal.downloadBtnText}>
                    {progress > 0 ? `Downloading ${Math.round(progress * 100)}%…` : 'Preparing…'}
                  </Text>
                </View>
              ) : (
                <Text style={modal.downloadBtnText}>⬇  Download & Open PDF</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelBtnText}>Close</Text>
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
      <View style={styles.cardIconBox}>
        <Text style={styles.cardIcon}>📄</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{payslip.payslip_name}</Text>
        <Text style={styles.cardType}>{payslip.payslip_type}</Text>
        <Text style={styles.cardMeta}>
          {[payslip.payroll_month, payslip.payroll_year].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={styles.cardArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PayslipsScreen() {
  const { user } = useAuth();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  const [year, setYear] = useState('');        // '' = all years
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
      const params: Record<string, string> = {
        selectedEmployeeId: employeeId,
      };
      if (year) params.payrollYear = year;
      if (typeFilter) params.payslipType = typeFilter;
      if (search) params.searchKey = search;

      const res = await api.get('/api/employee/payslips', { params });

      const items: Payslip[] = res.data?.payslips ?? [];
      const years: string[] = res.data?.available_years ?? [];
      const types: string[] = res.data?.available_types ?? [];

      setPayslips(items);
      setAvailableTypes(types);

      // Only update years list once (or when it changes), and auto-select if not already chosen
      if (years.length > 0) {
        setAvailableYears(years);
        // Auto-select the most recent year on first load
        setYear(prev => (prev === '' ? years[0] : prev));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load payslips.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId, year, typeFilter, search]);

  // Initial load — fetch with no year filter to get available years
  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayslips(false);
  }, [fetchPayslips]);

  // ─── No employee linked ───────────────────────────────────────────────────
  if (!employeeId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Payslips</Text>
        </View>
        <View style={styles.centeredBox}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>No employee record linked</Text>
          <Text style={styles.emptySubtext}>
            Your account ({user?.email}) does not have an employee ID assigned.
            Please contact HR or the system administrator.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Payslips</Text>
        <Text style={styles.headerSub}>
          {user?.first_name} {user?.last_name}
          {'  ·  '}ID {employeeId}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersBox}>
        {/* Year chips — built from API response */}
        <Text style={styles.filterLabel}>Year</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, year === '' && styles.chipActive]}
              onPress={() => setYear('')}
            >
              <Text style={[styles.chipText, year === '' && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {availableYears.map(y => (
              <TouchableOpacity
                key={y}
                style={[styles.chip, year === y && styles.chipActive]}
                onPress={() => setYear(y)}
              >
                <Text style={[styles.chipText, year === y && styles.chipTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Type chips — built from API response */}
        {availableTypes.length > 0 && (
          <>
            <Text style={styles.filterLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, typeFilter === '' && styles.chipActive]}
                  onPress={() => setTypeFilter('')}
                >
                  <Text style={[styles.chipText, typeFilter === '' && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                {availableTypes.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, typeFilter === t && styles.chipActive]}
                    onPress={() => setTypeFilter(t)}
                  >
                    <Text style={[styles.chipText, typeFilter === t && styles.chipTextActive]}
                      numberOfLines={1}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        <TextInput
          style={styles.searchInput}
          placeholder="Search payslip name…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Count */}
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
        <View style={styles.centeredBox}>
          <ActivityIndicator color="#1B5E20" size="large" />
          <Text style={styles.loadingText}>Loading payslips…</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredBox}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>Error loading payslips</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPayslips()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={payslips}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={payslips.length === 0 ? styles.emptyFlex : { paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centeredBox}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyText}>No payslips found</Text>
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
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  header: {
    backgroundColor: '#1B5E20',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#A5D6A7', marginTop: 4 },

  filtersBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
  },
  chipRow: { flexDirection: 'row', gap: 6, paddingRight: 16 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#d1d5db', backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  searchInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 4,
  },

  countRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 },
  countText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  centeredBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingVertical: 48,
  },
  emptyFlex: { flex: 1 },
  loadingText: { fontSize: 14, color: '#6b7280', marginTop: 12 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: '#9ca3af', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  retryBtn: {
    marginTop: 16, backgroundColor: '#1B5E20',
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10,
    borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardIcon: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  cardType: { fontSize: 11, color: '#B8940A', fontWeight: '600', marginTop: 3 },
  cardMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  cardArrow: { fontSize: 22, color: '#9ca3af', marginLeft: 6 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 56,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerIcon: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerIconText: { fontSize: 22 },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 20 },
  subtitle: { fontSize: 12, color: '#B8940A', marginTop: 3, fontWeight: '600' },
  closeBtn: { padding: 4 },
  closeX: { fontSize: 16, color: '#9ca3af', fontWeight: '700' },

  body: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  detailCard: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    overflow: 'hidden', marginBottom: 20, backgroundColor: '#f9fafb',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 11,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  detailLabel: { fontSize: 13, color: '#6b7280', flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1.5, textAlign: 'right' },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  progressBar: {
    flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#B8940A', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#B8940A', fontWeight: '700', width: 36 },

  breakdownBtn: {
    backgroundColor: '#E8F5E9', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: '#A5D6A7',
  },
  breakdownBtnText: { color: '#1B5E20', fontSize: 15, fontWeight: '700' },

  downloadBtn: {
    backgroundColor: '#1B5E20', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginBottom: 10,
  },
  downloadBtnDisabled: { opacity: 0.65 },
  downloadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  cancelBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 4,
  },
  cancelBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
});
