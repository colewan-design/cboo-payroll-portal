import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getPayslipBreakdown } from '@/services/api';

type DeductionItem = {
  name: string;
  amount: number;
};

type Breakdown = {
  available: boolean;
  message?: string;
  payslip_name: string;
  payslip_type: string;
  payroll_month: string | null;
  payroll_year: string;
  salary_grade: number | null;
  step: number | null;
  basic_salary: number;
  pera: number;
  gross_amount: number;
  deductions: DeductionItem[];
  total_deductions: number;
  net_amount_due: number;
};

function peso(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Map common deduction names to friendly labels
const DEDUCTION_LABELS: Record<string, string> = {
  'GSIS Premium': 'GSIS',
  'GSIS': 'GSIS',
  'PhilHealth Premium': 'PhilHealth',
  'PhilHealth': 'PhilHealth',
  'HDMF Premium': 'Pag-IBIG',
  'HDMF': 'Pag-IBIG',
  'Pag-IBIG': 'Pag-IBIG',
  'BIR Tax': 'Withholding Tax',
  'Tax': 'Withholding Tax',
  'COCO Premium': 'COCO',
};

function friendlyLabel(name: string) {
  return DEDUCTION_LABELS[name] ?? name;
}

// Separate government-mandated from other deductions for display grouping
const MANDATORY_KEYS = ['gsis', 'philhealth', 'hdmf', 'pag-ibig', 'bir', 'tax', 'coco'];
function isMandatory(name: string) {
  const lower = name.toLowerCase();
  return MANDATORY_KEYS.some(k => lower.includes(k));
}

export default function PayslipBreakdownScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPayslipBreakdown(Number(id))
      .then(res => setBreakdown(res.data))
      .catch(err => {
        setError(err?.response?.data?.message ?? 'Could not load breakdown.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const period = breakdown
    ? [breakdown.payroll_month, breakdown.payroll_year].filter(Boolean).join(' ')
    : '';

  const mandatoryDeductions = breakdown?.deductions.filter(d => isMandatory(d.name)) ?? [];
  const otherDeductions = breakdown?.deductions.filter(d => !isMandatory(d.name)) ?? [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name ?? 'Salary Breakdown'}
          </Text>
          {period ? <Text style={styles.headerSub}>{period}</Text> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={styles.loadingText}>Loading breakdown…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : !breakdown?.available ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>📄</Text>
          <Text style={styles.errorTitle}>Breakdown Not Available</Text>
          <Text style={styles.errorText}>
            {breakdown?.message ?? 'No detailed breakdown is available for this payslip. Download the PDF to view full details.'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Payslip meta */}
          <View style={styles.metaCard}>
            <Text style={styles.metaName} numberOfLines={2}>{breakdown.payslip_name}</Text>
            <Text style={styles.metaType}>{breakdown.payslip_type}</Text>
            {(breakdown.salary_grade || breakdown.step) ? (
              <Text style={styles.metaSG}>
                SG {breakdown.salary_grade ?? '—'}  ·  Step {breakdown.step ?? '—'}
              </Text>
            ) : null}
          </View>

          {/* Earnings */}
          <SectionHeader title="Earnings" />
          <View style={styles.card}>
            <AmountRow label="Basic Salary" value={peso(breakdown.basic_salary)} />
            {breakdown.pera > 0 && (
              <AmountRow label="PERA" value={peso(breakdown.pera)} sublabel="Personnel Economic Relief Allowance" />
            )}
            {breakdown.gross_amount > breakdown.basic_salary + breakdown.pera && (
              <AmountRow
                label="Other Allowances"
                value={peso(breakdown.gross_amount - breakdown.basic_salary - breakdown.pera)}
              />
            )}
            <AmountRow label="Gross Pay" value={peso(breakdown.gross_amount)} total />
          </View>

          {/* Government deductions */}
          {mandatoryDeductions.length > 0 && (
            <>
              <SectionHeader title="Mandatory Deductions" />
              <View style={styles.card}>
                {mandatoryDeductions.map((d, i) => (
                  <AmountRow
                    key={i}
                    label={friendlyLabel(d.name)}
                    sublabel={d.name !== friendlyLabel(d.name) ? d.name : undefined}
                    value={peso(d.amount)}
                    deduction
                  />
                ))}
              </View>
            </>
          )}

          {/* Other deductions */}
          {otherDeductions.length > 0 && (
            <>
              <SectionHeader title="Other Deductions" />
              <View style={styles.card}>
                {otherDeductions.map((d, i) => (
                  <AmountRow key={i} label={d.name} value={peso(d.amount)} deduction />
                ))}
              </View>
            </>
          )}

          {/* Summary */}
          <SectionHeader title="Summary" />
          <View style={styles.summaryCard}>
            <SummaryRow label="Gross Pay" value={peso(breakdown.gross_amount)} />
            <SummaryRow label="Total Deductions" value={`− ${peso(breakdown.total_deductions)}`} deduction />
            <View style={styles.netRow}>
              <Text style={styles.netLabel}>Net Pay</Text>
              <Text style={styles.netValue}>{peso(breakdown.net_amount_due)}</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

type AmountRowProps = {
  label: string;
  sublabel?: string;
  value: string;
  total?: boolean;
  deduction?: boolean;
};

function AmountRow({ label, sublabel, value, total, deduction }: AmountRowProps) {
  return (
    <View style={[styles.row, total && styles.rowTotal]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, total && styles.rowLabelTotal]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Text style={[
        styles.rowValue,
        total && styles.rowValueTotal,
        deduction && styles.rowValueDeduction,
      ]}>
        {value}
      </Text>
    </View>
  );
}

function SummaryRow({ label, value, deduction }: { label: string; value: string; deduction?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, deduction && styles.summaryDeduction]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  header: {
    backgroundColor: '#1B5E20',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { paddingRight: 4 },
  backText: { color: '#A5D6A7', fontSize: 15, fontWeight: '600' },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#A5D6A7', marginTop: 2 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, paddingVertical: 48,
  },
  loadingText: { fontSize: 14, color: '#6b7280', marginTop: 12 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8, textAlign: 'center' },
  errorText: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  backLink: { marginTop: 16 },
  backLinkText: { color: '#1B5E20', fontWeight: '600', fontSize: 14 },

  content: { padding: 16 },

  metaCard: {
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  metaName: { fontSize: 15, fontWeight: '700', color: '#fff', lineHeight: 21 },
  metaType: { fontSize: 12, color: '#A5D6A7', marginTop: 4, fontWeight: '600' },
  metaSG: { fontSize: 12, color: '#A5D6A7', marginTop: 6 },

  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 8, marginTop: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowTotal: {
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
  },
  rowLeft: { flex: 1, paddingRight: 8 },
  rowLabel: { fontSize: 13, color: '#374151' },
  rowLabelTotal: { fontWeight: '700', color: '#1B5E20' },
  rowSublabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  rowValueTotal: { color: '#1B5E20', fontWeight: '700' },
  rowValueDeduction: { color: '#dc2626' },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  summaryDeduction: { color: '#dc2626' },

  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1B5E20',
  },
  netLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  netValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
});
