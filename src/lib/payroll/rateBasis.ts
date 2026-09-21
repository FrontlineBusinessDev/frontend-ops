import { formatCurrency } from '@/lib/utils/format'
import type { AttendanceRecord, Employee, PayrollPeriod } from '@/types/domain'

export const STANDARD_WORKING_DAYS_PER_YEAR = 261
export const STANDARD_HOURS_PER_DAY = 8
/** Matches the engine's existing half-month approximation (`workingDaysInPeriod` in payrollService.ts) — used only when no attendance is recorded for the period, so daily/hourly Basic Pay never collapses to zero purely from a mock-data coverage gap. */
const FALLBACK_PAID_DAYS_PER_PERIOD = 11

export interface RateBasis {
  quantity: number
  unit: string
  /** true when real attendance/output data wasn't available for this period and a standard assumption was substituted. */
  isFallback: boolean
}

export function computePaidDays(employeeId: string, period: PayrollPeriod, attendanceRecords: AttendanceRecord[]): RateBasis {
  const periodRecords = attendanceRecords.filter(
    (r) => r.employeeId === employeeId && r.date >= period.startDate && r.date <= period.endDate,
  )
  if (periodRecords.length === 0) {
    return { quantity: FALLBACK_PAID_DAYS_PER_PERIOD, unit: 'days', isFallback: true }
  }
  const paidDays = periodRecords.filter((r) => r.status !== 'absent').length
  return { quantity: paidDays, unit: 'days', isFallback: false }
}

export function computePaidHours(employeeId: string, period: PayrollPeriod, attendanceRecords: AttendanceRecord[]): RateBasis {
  const days = computePaidDays(employeeId, period, attendanceRecords)
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

export interface BasicPayResult {
  amount: number
  basis: RateBasis | null
  /** Human-readable label for the earning line at the rate's own display layer — "Basic Pay" for time-based rates, "Output Pay" for piece-rate. */
  label: string
  formula: string
}

/**
 * Pay Rate Type + Base Rate + applicable period work/output data → Basic (or Output) Pay.
 * This is the one place that decides how a per-period earning amount is derived from an
 * employee's configured rate — reused by both the payroll engine (`payrollService.ts`) and the
 * read-only computation breakdown, so the two can never drift apart.
 */
export function basicPayFor(employee: Employee, period: PayrollPeriod, attendanceRecords: AttendanceRecord[]): BasicPayResult {
  const rate = employee.compensation.basicPay
  switch (employee.compensation.payType) {
    case 'monthly':
      return {
        amount: rate / 2,
        basis: null,
        label: 'Basic Pay',
        formula: `Monthly Rate ${formatCurrency(rate)} ÷ 2 pay periods = ${formatCurrency(rate / 2)}`,
      }
    case 'semi_monthly':
      return {
        amount: rate,
        basis: null,
        label: 'Basic Pay',
        formula: `Semi-Monthly Rate ${formatCurrency(rate)} × 1 payroll period = ${formatCurrency(rate)}`,
      }
    case 'daily': {
      const basis = computePaidDays(employee.id, period, attendanceRecords)
      const amount = Math.round(rate * basis.quantity * 100) / 100
      return { amount, basis, label: 'Basic Pay', formula: `Daily Rate ${formatCurrency(rate)} × ${basis.quantity} paid day(s) = ${formatCurrency(amount)}` }
    }
    case 'hourly': {
      const basis = computePaidHours(employee.id, period, attendanceRecords)
      const amount = Math.round(rate * basis.quantity * 100) / 100
      return { amount, basis, label: 'Basic Pay', formula: `Hourly Rate ${formatCurrency(rate)} × ${basis.quantity} paid hour(s) = ${formatCurrency(amount)}` }
    }
    case 'output_based': {
      const basis = mockOutputQuantity(employee.id, period)
      const unitWord = (employee.compensation.outputUnit ?? 'unit').replace(/^per\s+/i, '').toLowerCase()
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
