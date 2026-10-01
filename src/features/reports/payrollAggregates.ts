import type { PayrollLineWithContext } from '@/lib/services/reportService'
import type { PayrollLine, PayrollPeriod } from '@/types/domain'

/**
 * Shared aggregation helpers for payroll-driven reports. Every figure is summed from the real
 * payroll lines (useAllPayrollLines) — nothing here computes pay, it only regroups what runs produced.
 */

/** Earnings labels the payroll engine writes for overtime-type pay (see payrollService OVERTIME_EARNING_LABEL). */
const OVERTIME_LABELS = { overtime: 'Overtime Pay', nightDiff: 'Night Differential', restDay: 'Rest Day / Holiday Overtime' } as const

export interface PayrollTotals {
  /** Distinct employees paid. */
  employees: number
  /** Distinct payroll runs included. */
  runs: number
  lines: number
  gross: number
  net: number
  totalDeductions: number
  /** Employee-side SSS + PhilHealth + Pag-IBIG. */
  statutory: number
  tax: number
  loans: number
  /** Absences and other non-statutory, non-loan deductions. */
  otherDeductions: number
  overtime: number
  nightDiff: number
  restDay: number
  employerContributions: number
}

export function deductionBreakdown(line: PayrollLine) {
  const statutory = line.sssEmployeeShare + line.philhealthEmployeeShare + line.pagibigEmployeeShare
  const loans = line.loanDeductions.reduce((sum, d) => sum + d.amount, 0)
  const other = line.otherDeductions.reduce((sum, d) => sum + d.amount, 0)
  return { statutory, tax: line.withholdingTax, loans, other }
}

export function overtimeBreakdown(line: PayrollLine) {
  const amountFor = (label: string) => line.earnings.filter((e) => e.label === label).reduce((sum, e) => sum + e.amount, 0)
  return { overtime: amountFor(OVERTIME_LABELS.overtime), nightDiff: amountFor(OVERTIME_LABELS.nightDiff), restDay: amountFor(OVERTIME_LABELS.restDay) }
}

/** Sums rows into one bucket per key (department, payroll group, pay month…), largest gross first unless `sort` is false. */
export function summarizeBy(rows: PayrollLineWithContext[], keyFor: (row: PayrollLineWithContext) => string, sort = true): [string, PayrollTotals][] {
  const buckets = new Map<string, { totals: PayrollTotals; employees: Set<string>; runs: Set<string> }>()
  for (const row of rows) {
    const key = keyFor(row)
    const bucket = buckets.get(key) ?? {
      totals: { employees: 0, runs: 0, lines: 0, gross: 0, net: 0, totalDeductions: 0, statutory: 0, tax: 0, loans: 0, otherDeductions: 0, overtime: 0, nightDiff: 0, restDay: 0, employerContributions: 0 },
      employees: new Set<string>(),
      runs: new Set<string>(),
    }
    const { line } = row
    const d = deductionBreakdown(line)
    const ot = overtimeBreakdown(line)
    const t = bucket.totals
    t.lines += 1
    t.gross += line.grossPay
    t.net += line.netPay
    t.totalDeductions += line.totalDeductions
    t.statutory += d.statutory
    t.tax += d.tax
    t.loans += d.loans
    t.otherDeductions += d.other
    t.overtime += ot.overtime
    t.nightDiff += ot.nightDiff
    t.restDay += ot.restDay
    t.employerContributions += line.sssEmployerShare + line.philhealthEmployerShare + line.pagibigEmployerShare
    bucket.employees.add(row.employee.id)
    bucket.runs.add(row.period.id)
    buckets.set(key, bucket)
  }
  const entries = [...buckets.entries()].map(([key, b]) => [key, { ...b.totals, employees: b.employees.size, runs: b.runs.size }] as [string, PayrollTotals])
  return sort ? entries.sort((a, b) => b[1].gross - a[1].gross) : entries
}

/**
 * "2026-09" — the payroll month a run belongs to (the month its period starts), so weekly, semi-monthly
 * and monthly runs compare like for like. Pay dates can spill into the next month (a Sep 21 – 27 week
 * paid Oct 2), which would otherwise leave a near-empty trailing month.
 */
export function payrollMonthKey(period: PayrollPeriod): string {
  return period.startDate.slice(0, 7)
}

/** Totals per payroll month, oldest first. */
export function summarizeByPayrollMonth(rows: PayrollLineWithContext[]): [string, PayrollTotals][] {
  return summarizeBy(rows, (r) => payrollMonthKey(r.period), false).sort((a, b) => a[0].localeCompare(b[0]))
}

/** Month-over-month change in percent (0 when there's no prior month). */
export function changePct(current: number, previous: number | undefined): number {
  return previous ? Math.round(((current - previous) / previous) * 1000) / 10 : 0
}
