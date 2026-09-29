import { formatCurrency } from '@/lib/utils/format'
import type { AttendanceRecord, CompensationApproval, Employee, PayrollPeriod } from '@/types/domain'

export const STANDARD_WORKING_DAYS_PER_YEAR = 261
export const STANDARD_HOURS_PER_DAY = 8
/** Matches the engine's existing half-month approximation (`workingDaysInPeriod` in payrollService.ts) — used only when no attendance is recorded for the period, so daily/hourly Basic Pay never collapses to zero purely from a mock-data coverage gap. */
const FALLBACK_PAID_DAYS_PER_PERIOD = 11
/** Working days per month used to derive daily/hourly rates from a monthly salary (the engine's existing 11-days-per-half-month convention). */
export const WORKING_DAYS_PER_MONTH = 22

export interface RateBasis {
  quantity: number
  unit: string
  /** true when real attendance/output data wasn't available for this period and a standard assumption was substituted. */
  isFallback: boolean
}

export function computePaidDays(employeeId: string, period: PayrollPeriod, attendanceRecords: AttendanceRecord[], periodsPerMonth = 2): RateBasis {
  const periodRecords = attendanceRecords.filter(
    (r) => r.employeeId === employeeId && r.date >= period.startDate && r.date <= period.endDate,
  )
  if (periodRecords.length === 0) {
    const fallback = periodsPerMonth === 2 ? FALLBACK_PAID_DAYS_PER_PERIOD : Math.round((WORKING_DAYS_PER_MONTH / periodsPerMonth) * 100) / 100
    return { quantity: fallback, unit: 'days', isFallback: true }
  }
  const paidDays = periodRecords.filter((r) => r.status !== 'absent').length
  return { quantity: paidDays, unit: 'days', isFallback: false }
}

export function computePaidHours(employeeId: string, period: PayrollPeriod, attendanceRecords: AttendanceRecord[], periodsPerMonth = 2): RateBasis {
  const days = computePaidDays(employeeId, period, attendanceRecords, periodsPerMonth)
  return { quantity: days.quantity * STANDARD_HOURS_PER_DAY, unit: 'hours', isFallback: days.isFallback }
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return hash
}

/** No output/production-tracking system exists yet — a deterministic mock quantity stands in for it, clearly flagged as illustrative. */
export function mockOutputQuantity(employeeId: string, period: PayrollPeriod): RateBasis {
  const seed = hashString(employeeId + period.id)
  return { quantity: 150 + (seed % 200), unit: 'units', isFallback: true }
}

export interface WorkLogsForPeriod {
  /** Every Approvals-module entry for this employee dated inside the period, any status. */
  inRange: CompensationApproval[]
  /** The approved entries this period pays. */
  payable: CompensationApproval[]
  pendingCount: number
  rejectedCount: number
}

/**
 * Approved hourly/output entries are payable in a draft period unless another run already paid
 * them; once a period has been run, it pays exactly the entries that run locked to it — so the
 * breakdown can't drift when more entries are approved afterward.
 */
export function workLogsForPeriod(employeeId: string, period: Pick<PayrollPeriod, 'id' | 'status' | 'startDate' | 'endDate'>, approvals: CompensationApproval[]): WorkLogsForPeriod {
  const inRange = approvals.filter((a) => a.employeeId === employeeId && a.workDate >= period.startDate && a.workDate <= period.endDate)
  const payable = inRange.filter(
    (a) => a.status === 'approved' && (period.status === 'draft' ? !a.payrollPeriodId || a.payrollPeriodId === period.id : a.payrollPeriodId === period.id),
  )
  return {
    inRange,
    payable,
    pendingCount: inRange.filter((a) => a.status === 'pending').length,
    rejectedCount: inRange.filter((a) => a.status === 'rejected').length,
  }
}

export interface BasicPayResult {
  amount: number
  basis: RateBasis | null
  /** Human-readable label for the earning line — "Basic Pay" for time-based rates, "Output Pay" for piece-rate, or the approved-work-log labels below. */
  label: string
  formula: string
  /** Present when the amount came from approved Approvals-module entries rather than attendance/placeholder data. */
  workLogs?: WorkLogsForPeriod
}

export const HOURLY_WORK_LOG_LABEL = 'Hourly Compensation Pay'
export const OUTPUT_WORK_LOG_LABEL = 'Output / Piece-Rate Pay'

function outputUnitWord(employee: Employee): string {
  return (employee.compensation.outputUnit ?? 'unit').replace(/^per\s+/i, '').toLowerCase()
}

/**
 * Pay Rate Type + Base Rate + applicable period work/output data → Basic (or Output) Pay.
 * This is the one place that decides how a per-period earning amount is derived from an
 * employee's configured rate — reused by both the payroll engine (`payrollService.ts`) and the
 * read-only computation breakdown, so the two can never drift apart.
 */
export function basicPayFor(
  employee: Employee,
  period: PayrollPeriod,
  attendanceRecords: AttendanceRecord[],
  compensationApprovals: CompensationApproval[] = [],
  /** Pay periods per month for this run's frequency (2 = semi-monthly, 1 = monthly, 52/12 = weekly…). */
  periodsPerMonth = 2,
): BasicPayResult {
  const ppmLabel = Number.isInteger(periodsPerMonth) ? String(periodsPerMonth) : periodsPerMonth.toFixed(2)
  const rate = employee.compensation.basicPay
  const payType = employee.compensation.payType

  // Hourly / output-based employees who submitted work logs for this period are paid from the
  // approved ones only (pending and rejected excluded). Employees with no logs in the period keep
  // the attendance / placeholder basis below.
  if (payType === 'hourly' || payType === 'output_based') {
    const workLogs = workLogsForPeriod(employee.id, period, compensationApprovals)
    if (workLogs.inRange.length > 0) {
      const quantity = Math.round(workLogs.payable.reduce((sum, a) => sum + a.quantity, 0) * 100) / 100
      const amount = Math.round(rate * quantity * 100) / 100
      const entries = `${workLogs.payable.length} approved ${payType === 'hourly' ? 'timecard' : 'submission'}${workLogs.payable.length === 1 ? '' : 's'}`
      if (payType === 'hourly') {
        return {
          amount,
          basis: { quantity, unit: 'approved hours', isFallback: false },
          label: HOURLY_WORK_LOG_LABEL,
          formula: `Hourly Rate ${formatCurrency(rate)} × ${quantity} approved hour(s) from ${entries} = ${formatCurrency(amount)}`,
          workLogs,
        }
      }
      const unitWord = outputUnitWord(employee)
      return {
        amount,
        basis: { quantity, unit: `approved ${unitWord}s`, isFallback: false },
        label: OUTPUT_WORK_LOG_LABEL,
        formula: `Piece Rate ${formatCurrency(rate)} × ${quantity} approved ${unitWord}(s) from ${entries} = ${formatCurrency(amount)}`,
        workLogs,
      }
    }
  }

  switch (payType) {
    case 'monthly': {
      const amount = Math.round((rate / periodsPerMonth) * 100) / 100
      return {
        amount,
        basis: null,
        label: 'Basic Pay',
        formula: periodsPerMonth === 1 ? `Monthly Rate ${formatCurrency(rate)} (full month) = ${formatCurrency(amount)}` : `Monthly Rate ${formatCurrency(rate)} ÷ ${ppmLabel} pay periods = ${formatCurrency(amount)}`,
      }
    }
    case 'semi_monthly': {
      const amount = Math.round(((rate * 2) / periodsPerMonth) * 100) / 100
      return {
        amount,
        basis: null,
        label: 'Basic Pay',
        formula:
          periodsPerMonth === 2
            ? `Semi-Monthly Rate ${formatCurrency(rate)} × 1 payroll period = ${formatCurrency(amount)}`
            : `Semi-Monthly Rate ${formatCurrency(rate)} × 2 ÷ ${ppmLabel} pay periods = ${formatCurrency(amount)}`,
      }
    }
    case 'daily': {
      const basis = computePaidDays(employee.id, period, attendanceRecords, periodsPerMonth)
      const amount = Math.round(rate * basis.quantity * 100) / 100
      return { amount, basis, label: 'Basic Pay', formula: `Daily Rate ${formatCurrency(rate)} × ${basis.quantity} paid day(s) = ${formatCurrency(amount)}` }
    }
    case 'hourly': {
      const basis = computePaidHours(employee.id, period, attendanceRecords, periodsPerMonth)
      const amount = Math.round(rate * basis.quantity * 100) / 100
      return { amount, basis, label: 'Basic Pay', formula: `Hourly Rate ${formatCurrency(rate)} × ${basis.quantity} paid hour(s) = ${formatCurrency(amount)}` }
    }
    case 'output_based': {
      const basis = mockOutputQuantity(employee.id, period)
      const unitWord = outputUnitWord(employee)
      const amount = Math.round(rate * basis.quantity * 100) / 100
      return {
        amount,
        basis,
        label: 'Output Pay',
        formula: `Piece Rate ${formatCurrency(rate)} × ${basis.quantity} ${unitWord}(s) = ${formatCurrency(amount)}`,
      }
    }
  }
}

/**
 * A rough monthly-equivalent figure fed into the *existing, unchanged* statutory/tax bracket
 * lookups in `payrollService.ts`, so SSS/PhilHealth/Pag-IBIG/tax don't collapse toward zero for
 * daily/hourly/output-based employees whose `basicPay` isn't a monthly amount. The bracket
 * formulas themselves are untouched — only their input is made rate-type-aware.
 */
export function monthlyEquivalentFor(employee: Employee): number {
  const rate = employee.compensation.basicPay
  const daysPerMonth = STANDARD_WORKING_DAYS_PER_YEAR / 12
  switch (employee.compensation.payType) {
    case 'monthly':
      return rate
    case 'semi_monthly':
      return rate * 2
    case 'daily':
      return rate * daysPerMonth
    case 'hourly':
      return rate * STANDARD_HOURS_PER_DAY * daysPerMonth
    case 'output_based':
      // No reliable expected-output baseline exists yet — an illustrative placeholder only.
      return rate * 250
  }
}

/** Daily rate for deductions/premiums: the daily rate itself, or the monthly-equivalent pay ÷ 22 working days. */
export function dailyRateFor(employee: Employee): number {
  const rate = employee.compensation.basicPay
  if (employee.compensation.payType === 'daily') return rate
  if (employee.compensation.payType === 'hourly') return rate * STANDARD_HOURS_PER_DAY
  return monthlyEquivalentFor(employee) / WORKING_DAYS_PER_MONTH
}

/** Hourly rate for overtime, night differential, and undertime: the daily rate ÷ 8 hours. */
export function hourlyRateFor(employee: Employee): number {
  return dailyRateFor(employee) / STANDARD_HOURS_PER_DAY
}
