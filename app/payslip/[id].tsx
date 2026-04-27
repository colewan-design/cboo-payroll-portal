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
import { Ionicons } from '@expo/vector-icons';
import { getPayslipBreakdown } from '@/services/api';
import { TEAL, useAppTheme, AppTheme } from '@/constants/theme';

type DeductionItem = { name: string; amount: number };

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

const DEDUCTION_LABELS: Record<string, string> = {
  'GSIS Premium': 'GSIS', 'GSIS': 'GSIS',
  'PhilHealth Premium': 'PhilHealth', 'PhilHealth': 'PhilHealth',
  'HDMF Premium': 'Pag-IBIG', 'HDMF': 'Pag-IBIG', 'Pag-IBIG': 'Pag-IBIG',
  'BIR Tax': 'Withholding Tax', 'Tax': 'Withholding Tax',
  'COCO Premium': 'COCO',
};

function friendlyLabel(name: string) { return DEDUCTION_LABELS[name] ?? name; }

const MANDATORY_KEYS = ['gsis', 'philhealth', 'hdmf', 'pag-ibig', 'bir', 'tax', 'coco'];
function isMandatory(name: string) {
  const lower = name.toLowerCase();
  return MANDATORY_KEYS.some(k => lower.includes(k));
}

export default function PayslipBreakdownScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPayslipBreakdown(Number(id))
      .then(res => setBreakdown(res.data))
      .catch(err => setError(err?.response?.data?.message ?? 'Could not load breakdown.'))
      .finally(() => setLoading(false));
  }, [id]);

  const period = breakdown
    ? [breakdown.payroll_month, breakdown.payroll_year].filter(Boolean).join(' ')
    : '';

  const mandatoryDeductions = breakdown?.deductions.filter(d => isMandatory(d.name)) ?? [];
  const otherDeductions = breakdown?.deductions.filter(d => !isMandatory(d.name)) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>{name ?? 'Salary Breakdown'}</Text>
          {period ? <Text style={styles.headerSub}>{period}</Text> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL.primary} />
          <Text style={styles.loadingText}>Loading breakdown…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.textMuted} />
          <Text style={styles.errorTitle}>Could not load breakdown</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Ionicons name="arrow-back-outline" size={14} color={TEAL.primary} />
            <Text style={styles.backLinkText}> Go back</Text>
          </TouchableOpacity>
        </View>
      ) : !breakdown?.available ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
          <Text style={styles.errorTitle}>Breakdown Not Available</Text>
          <Text style={styles.errorText}>
            {breakdown?.message ?? 'No detailed breakdown is available for this payslip. Download the PDF to view full details.'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Ionicons name="arrow-back-outline" size={14} color={TEAL.primary} />
            <Text style={styles.backLinkText}> Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.metaCard}>
            <View style={styles.metaIconWrap}>
              <Ionicons name="document-text-outline" size={20} color={TEAL.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaName} numberOfLines={2}>{breakdown.payslip_name}</Text>
              <Text style={styles.metaType}>{breakdown.payslip_type}</Text>
              {(breakdown.salary_grade || breakdown.step) ? (
                <Text style={styles.metaSG}>SG {breakdown.salary_grade ?? '—'}  ·  Step {breakdown.step ?? '—'}</Text>
              ) : null}
            </View>
          </View>

          <SectionHeader title="Earnings" styles={styles} />
          <View style={styles.card}>
            <AmountRow label="Basic Salary" value={peso(breakdown.basic_salary)} styles={styles} />
            {breakdown.pera > 0 && (
              <AmountRow label="PERA" value={peso(breakdown.pera)} sublabel="Personnel Economic Relief Allowance" styles={styles} />
            )}
            {breakdown.gross_amount > breakdown.basic_salary + breakdown.pera && (
              <AmountRow label="Other Allowances" value={peso(breakdown.gross_amount - breakdown.basic_salary - breakdown.pera)} styles={styles} />
            )}
            <AmountRow label="Gross Pay" value={peso(breakdown.gross_amount)} total styles={styles} />
          </View>

          {mandatoryDeductions.length > 0 && (
            <>
              <SectionHeader title="Mandatory Deductions" styles={styles} />
              <View style={styles.card}>
                {mandatoryDeductions.map((d, i) => (
                  <AmountRow key={i} label={friendlyLabel(d.name)} sublabel={d.name !== friendlyLabel(d.name) ? d.name : undefined} value={peso(d.amount)} deduction styles={styles} />
                ))}
              </View>
            </>
          )}

          {otherDeductions.length > 0 && (
            <>
              <SectionHeader title="Other Deductions" styles={styles} />
              <View style={styles.card}>
                {otherDeductions.map((d, i) => (
                  <AmountRow key={i} label={d.name} value={peso(d.amount)} deduction styles={styles} />
                ))}
              </View>
            </>
          )}

          <SectionHeader title="Summary" styles={styles} />
          <View style={styles.summaryCard}>
            <SummaryRow label="Gross Pay" value={peso(breakdown.gross_amount)} styles={styles} />
            <SummaryRow label="Total Deductions" value={`− ${peso(breakdown.total_deductions)}`} deduction styles={styles} />
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

function SectionHeader({ title, styles }: { title: string; styles: ReturnType<typeof makeStyles> }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

type AmountRowProps = {
  label: string; sublabel?: string; value: string;
  total?: boolean; deduction?: boolean;
  styles: ReturnType<typeof makeStyles>;
};

function AmountRow({ label, sublabel, value, total, deduction, styles }: AmountRowProps) {
  return (
    <View style={[styles.row, total && styles.rowTotal]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, total && styles.rowLabelTotal]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Text style={[styles.rowValue, total && styles.rowValueTotal, deduction && styles.rowValueDeduction]}>
        {value}
      </Text>
    </View>
  );
}

function SummaryRow({ label, value, deduction, styles }: { label: string; value: string; deduction?: boolean; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, deduction && styles.summaryDeduction]}>{value}</Text>
    </View>
  );
}

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },

    header: {
      backgroundColor: TEAL.primary,
      paddingTop: Platform.OS === 'ios' ? 56 : 48,
      paddingBottom: 16, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center',
    },
    headerTextWrap: { flex: 1 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 12, color: TEAL.textSub, marginTop: 2 },

    center: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 32, paddingVertical: 48, gap: 8,
    },
    loadingText: { fontSize: 14, color: t.textLight, marginTop: 4 },
    errorTitle: { fontSize: 16, fontWeight: '700', color: t.textSecondary, textAlign: 'center' },
    errorText: { fontSize: 13, color: t.textLight, textAlign: 'center', lineHeight: 20 },
    backLink: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    backLinkText: { color: TEAL.primary, fontWeight: '600', fontSize: 14 },

    content: { padding: 16 },

    metaCard: {
      backgroundColor: t.cardBg, borderRadius: 14, padding: 16, marginBottom: 20,
      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
      borderWidth: 0.5, borderColor: t.cardBorder,
    },
    metaIconWrap: {
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: t.primaryLight, alignItems: 'center', justifyContent: 'center',
    },
    metaName: { fontSize: 15, fontWeight: '700', color: t.textPrimary, lineHeight: 21 },
    metaType: { fontSize: 12, color: t.primaryDark, marginTop: 4, fontWeight: '600' },
    metaSG: { fontSize: 12, color: t.textMuted, marginTop: 4 },

    sectionHeader: {
      fontSize: 11, fontWeight: '700', color: t.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4,
    },

    card: {
      backgroundColor: t.cardBg, borderRadius: 14, marginBottom: 16,
      overflow: 'hidden', borderWidth: 0.5, borderColor: t.cardBorder,
    },

    row: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingHorizontal: 16, paddingVertical: 11,
      borderBottomWidth: 1, borderBottomColor: t.divider,
    },
    rowTotal: {
      backgroundColor: t.primaryLight, borderBottomWidth: 0,
      borderTopWidth: 1, borderTopColor: t.primaryBorder,
    },
    rowLeft: { flex: 1, paddingRight: 8 },
    rowLabel: { fontSize: 13, color: t.textSecondary },
    rowLabelTotal: { fontWeight: '700', color: t.primaryDarker },
    rowSublabel: { fontSize: 11, color: t.textMuted, marginTop: 2 },
    rowValue: { fontSize: 13, fontWeight: '600', color: t.textPrimary },
    rowValueTotal: { color: t.primaryDarker, fontWeight: '700' },
    rowValueDeduction: { color: '#dc2626' },

    summaryCard: {
      backgroundColor: t.cardBg, borderRadius: 14, marginBottom: 16,
      overflow: 'hidden', borderWidth: 0.5, borderColor: t.cardBorder,
    },
    summaryRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: t.divider,
    },
    summaryLabel: { fontSize: 14, color: t.textSecondary, fontWeight: '500' },
    summaryValue: { fontSize: 14, fontWeight: '600', color: t.textPrimary },
    summaryDeduction: { color: '#dc2626' },

    netRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 16,
      backgroundColor: TEAL.primary,
    },
    netLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
    netValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  });
}
