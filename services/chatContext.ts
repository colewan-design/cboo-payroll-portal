import type { User } from "@/context/AuthContext";
import api from "./api";
import { getCache, setCache } from "./cache";

type EmployeeProfile = {
  position: string | null;
  salary_grade: string | null;
  step: number | null;
  monthly_rate: string | null;
  employee_status: string | null;
  place_of_assignment: string | null;
};

type Payslip = {
  id: number;
  payslip_name: string;
  payslip_type: string;
  payroll_year: string;
  payroll_month: string | null;
};

type DeductionItem = { name: string; amount: number };

type Breakdown = {
  available: boolean;
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

type Analytics = {
  total_gross_amount: string | null;
  total_deductions: string | null;
  total_net_amount_due: string | null;
  total_basic_salary: string | null;
  total_pera: string | null;
};

type Announcement = {
  id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  published_at: string | null;
  created_at: string;
};

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatBreakdown(b: Breakdown): string {
  const period = [b.payroll_month, b.payroll_year].filter(Boolean).join(" ");
  const sg = b.salary_grade && b.step ? ` SG${b.salary_grade} S${b.step}` : "";
  const deductions = b.deductions
    .map((d) => `${d.name}: ${peso(d.amount)}`)
    .join(", ");
  return `  ${b.payslip_name} (${period}${sg}): Basic ${peso(b.basic_salary)} | Gross ${peso(b.gross_amount)} | ${deductions} | Net ${peso(b.net_amount_due)}`;
}

function formatAnalytics(a: Analytics): string {
  const gross = a.total_gross_amount ? peso(Number(a.total_gross_amount)) : "—";
  const deductions = a.total_deductions
    ? peso(Number(a.total_deductions))
    : "—";
  const net = a.total_net_amount_due
    ? peso(Number(a.total_net_amount_due))
    : "—";
  const basic = a.total_basic_salary ? peso(Number(a.total_basic_salary)) : "—";
  return `Gross ${gross} | Basic ${basic} | Deductions ${deductions} | Net ${net}`;
}

export async function buildEmployeeContext(user: User): Promise<string> {
  const cacheKey = `chat_ctx_${user.employee_id ?? "anon"}`;
  const cached = await getCache<string>(cacheKey);
  if (cached) return cached;

  const sections: string[] = [];

  const [
    profileRes,
    payslipsRes,
    announcementsRes,
    analyticsYearRes,
    analyticsAllRes,
  ] = await Promise.allSettled([
    api.get("/api/employee/me"),
    api.get("/api/employee/payslips", {
      params: { selectedEmployeeId: user.employee_id },
    }),
    api.get("/api/announcements", { params: { page: 1 } }),
    api.get("/api/getEmployee/analytics", {
      params: { selected_employee: user.employee_id, filter: "this year" },
    }),
    api.get("/api/getEmployee/analytics", {
      params: { selected_employee: user.employee_id },
    }),
  ]);

  // Employee profile
  if (profileRes.status === "fulfilled") {
    const p: EmployeeProfile = profileRes.value.data;
    const parts = [
      p.position && `Position: ${p.position}`,
      p.salary_grade && p.step && `SG ${p.salary_grade} Step ${p.step}`,
      p.monthly_rate && `Monthly Rate: ${peso(Number(p.monthly_rate))}`,
      p.employee_status && `Status: ${p.employee_status}`,
      p.place_of_assignment && `Assignment: ${p.place_of_assignment}`,
    ].filter(Boolean);
    if (parts.length) sections.push(`Profile: ${parts.join(" | ")}`);
  }

  // Payroll totals (year-to-date + all-time)
  const yearLabel = new Date().getFullYear();
  const ytdLine =
    analyticsYearRes.status === "fulfilled" &&
    analyticsYearRes.value.data?.total_gross_amount
      ? `  YTD ${yearLabel}: ${formatAnalytics(analyticsYearRes.value.data)}`
      : null;
  const allTimeLine =
    analyticsAllRes.status === "fulfilled" &&
    analyticsAllRes.value.data?.total_gross_amount
      ? `  All-time: ${formatAnalytics(analyticsAllRes.value.data)}`
      : null;
  const totalLines = [ytdLine, allTimeLine].filter(Boolean);
  if (totalLines.length)
    sections.push(`Payroll Totals:\n${totalLines.join("\n")}`);

  // Payslip list + breakdowns for last 3
  if (payslipsRes.status === "fulfilled") {
    const payslips: Payslip[] = payslipsRes.value.data?.payslips ?? [];

    if (payslips.length > 0) {
      const list = payslips
        .slice(0, 6)
        .map(
          (p) =>
            `  - ${p.payslip_name} (${p.payslip_type}${p.payroll_month ? ", " + p.payroll_month : ""} ${p.payroll_year})`,
        )
        .join("\n");
      sections.push(`Payslips (${payslips.length} total):\n${list}`);

      const breakdownResults = await Promise.allSettled(
        payslips
          .slice(0, 2)
          .map((p) => api.get(`/api/employee/payslip/breakdown/${p.id}`)),
      );

      const breakdowns = breakdownResults
        .filter(
          (r): r is PromiseFulfilledResult<{ data: Breakdown }> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value.data)
        .filter((b) => b.available)
        .map(formatBreakdown);

      if (breakdowns.length > 0)
        sections.push(`Recent Payslip Details:\n${breakdowns.join("\n")}`);
    }
  }

  // Recent announcements
  if (announcementsRes.status === "fulfilled") {
    const items: Announcement[] = announcementsRes.value.data?.data ?? [];
    if (items.length > 0) {
      const formatted = items
        .slice(0, 3)
        .map((a) => {
          const date = new Date(
            a.published_at ?? a.created_at,
          ).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const preview = a.content
            .replace(/<[^>]*>/g, "")
            .trim()
            .slice(0, 50);
          return `  - [${date}${a.is_pinned ? " PINNED" : ""}] ${a.title}: ${preview}`;
        })
        .join("\n");
      sections.push(`Recent News:\n${formatted}`);
    }
  }

  const result = sections.join("\n\n");
  await setCache(cacheKey, result);
  return result;
}
