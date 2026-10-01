import { loanConfigNameFor, allocateMonthly as allocateForDisplay, describeAllocation, periodsPerCycleForFrequency, type PaySchedule } from '@/lib/payroll/payFrequency'
import { basicPayFor, dailyRateFor, hourlyRateFor, monthlyEquivalentFor, type BasicPayResult } from '@/lib/payroll/rateBasis'
import { formatCurrency } from '@/lib/utils/format'
import type {
  AttendanceRecord,
  BonusIncentive,
  CompensationApproval,
  DeductionAllocationMethod,
  DeductionConfig,
  Employee,
  LoanRecord,
  OvertimeRecord,
  PayrollFrequency,
  PayrollGroup,
  PayrollLine,
  PayrollPeriod,
  StatutoryConfig,
  ThirteenthMonthLine,
} from '@/types/domain'

export interface EarningItem {
  label: string
  amount: number
  formula: string
}

export interface OvertimePreviewItem {
  label: string
  hours: number
  amount: number
  formula: string
}

export interface AllocationDetail {
  monthlyAmount: number
  currentPeriodAmount: number
  allocationMethod: DeductionAllocationMethod
  periodsPerCycle: number
  cutoffIndex: number
  /** Every cutoff the run covered, when more than one. */
  cutoffsCovered?: number[]
}

export interface DeductionItem {
  label: string
  currentPeriodAmount: number
  formula: string
  allocation?: AllocationDetail
  remainingBalance?: number
  isIllustrative?: boolean
}

export interface ComputationSummary {
  grossPay: number
  totalStatutory: number
  withholdingTax: number
  totalLoans: number
  otherDeductions: number
  totalDeductions: number
  netPay: number
}

export interface ComputationBreakdown {
  earnings: EarningItem[]
  /** How the Basic/Output Pay earning above was actually derived — the rate basis (paid days, paid hours, output units) the engine used, if any. */
  basicPayResult: BasicPayResult
  overtimePreview: OvertimePreviewItem[]
  deductions: DeductionItem[]
  illustrativeDeductions: DeductionItem[]
  summary: ComputationSummary
}

/** Pay periods a Payroll Group runs per month — display/allocation math only, used for the illustrative "Recurring Company Deductions" preview, never for the authoritative payroll engine. */
export function periodsPerCycleFor(frequency: PayrollFrequency | undefined, group: PayrollGroup | undefined): number {
  switch (frequency) {
    case 'weekly':
      return 4
    case 'biweekly':
    case 'semi_monthly':
      return 2
    case 'monthly':
      return 1
    case 'custom':
      return group?.periodsPerMonth ?? 2
    default:
      return 2
  }
}

/** Which 1-based period within the cycle `period` falls in, given how many periods the cycle has. Approximated from the start date's day-of-month — a display-only heuristic. */
export function cutoffIndexFor(period: PayrollPeriod, periodsPerCycle: number): number {
  if (periodsPerCycle <= 1) return 1
  const day = new Date(period.startDate).getDate()
  const index = Math.ceil((day / 31) * periodsPerCycle)
  return Math.min(Math.max(index, 1), periodsPerCycle)
}

/** Splits `monthlyAmount` into `periods` equal shares, guaranteed to sum exactly back to `monthlyAmount` (any rounding remainder lands on the last period). */
export function splitEqual(monthlyAmount: number, periods: number): number[] {
  if (periods <= 1) return [Math.round(monthlyAmount * 100) / 100]
  const base = Math.floor((monthlyAmount / periods) * 100) / 100
  const amounts = Array(periods - 1).fill(base)
  const last = Math.round((monthlyAmount - base * (periods - 1)) * 100) / 100
  return [...amounts, last]
}

/** Splits `monthlyAmount` by percentage, guaranteed to sum exactly back to `monthlyAmount` (the last share absorbs any rounding remainder). */
export function splitCustom(monthlyAmount: number, percentages: number[]): number[] {
  if (percentages.length === 0) return []
  const amounts = percentages.slice(0, -1).map((pct) => Math.round(monthlyAmount * (pct / 100) * 100) / 100)
  const last = Math.round((monthlyAmount - amounts.reduce((s, a) => s + a, 0)) * 100) / 100
  return [...amounts, last]
}

/** Full amount on the configured cutoff, zero for every other period. */
export function splitSpecificCutoff(monthlyAmount: number, periods: number, cutoffPeriod: number): number[] {
  return Array.from({ length: periods }, (_, i) => (i + 1 === cutoffPeriod ? monthlyAmount : 0))
}

export function allocationFormula(
  method: DeductionAllocationMethod,
  monthly: number,
  current: number,
  periodsPerCycle: number,
  cutoffIndex: number,
): string {
  if (method === 'specific_cutoff') {
    return `${formatCurrency(monthly)} monthly → collected entirely on cutoff ${cutoffIndex} of ${periodsPerCycle}`
  }
  if (method === 'custom') {
    return `${formatCurrency(monthly)} monthly, custom split — this cutoff (${cutoffIndex} of ${periodsPerCycle}): ${formatCurrency(current)}`
  }
  return `${formatCurrency(monthly)} monthly ÷ ${periodsPerCycle} pay periods = ${formatCurrency(current)}`
}

const OVERTIME_TYPE_LABEL_ENGINE: Record<OvertimeRecord['type'], string> = {
  regular: 'Overtime Pay',
  night_diff: 'Night Differential',
  rest_day_holiday: 'Rest Day / Holiday Overtime',
}

/** Allocation context for a statutory/tax/loan deduction, using the schedule the engine actually applied. */
function realAllocation(
  monthlyAmount: number,
  currentPeriodAmount: number,
  configuredMethod: DeductionAllocationMethod | undefined,
  schedule: PaySchedule,
): { detail: AllocationDetail; formula: string } {
  const detail: AllocationDetail = {
    monthlyAmount,
    currentPeriodAmount,
    allocationMethod: configuredMethod ?? 'equal_split',
    periodsPerCycle: schedule.periodsPerCycle,
    cutoffIndex: schedule.cutoffIndex,
    cutoffsCovered: schedule.cutoffsCovered,
  }
  return { detail, formula: describeAllocation(monthlyAmount, currentPeriodAmount, schedule, configuredMethod) }
}

const OVERTIME_EARNING_LABELS = new Set(['Overtime Pay', 'Night Differential', 'Rest Day / Holiday Overtime'])

export function buildComputationBreakdown(params: {
  employee: Employee
  line: PayrollLine
  period: PayrollPeriod
  payrollGroup: PayrollGroup | undefined
  deductionConfigs: DeductionConfig[]
  loans: LoanRecord[]
  overtimeRecords: OvertimeRecord[]
  attendanceRecords: AttendanceRecord[]
  /** Approvals-module work logs — hourly/output employees with logs in the period are paid from the approved ones. */
  compensationApprovals?: CompensationApproval[]
  statutoryConfig: StatutoryConfig | undefined
  /** Approved Bonuses & Incentives that matched this employee/period — only used to label their earnings lines correctly (one-time full amount, not a ÷2 allowance). */
  approvedBonuses?: BonusIncentive[]
  /** This employee's line from a finalized 13th Month Pay batch paying out this period, if any. */
  thirteenthMonthLine?: ThirteenthMonthLine
}): ComputationBreakdown {
  const {
    employee,
    line,
    period,
    deductionConfigs,
    loans,
    overtimeRecords,
    attendanceRecords,
    compensationApprovals = [],
    statutoryConfig,
    approvedBonuses = [],
    thirteenthMonthLine,
  } = params
  const configByName = new Map(deductionConfigs.map((c) => [c.name, c]))
  const bonusByName = new Map(approvedBonuses.map((b) => [b.name, b]))

  // The schedule the engine used for this line (older lines without it were semi-monthly).
  const schedule: PaySchedule = line.periodsPerMonth
    ? {
        frequency: line.payFrequency ?? 'semi_monthly',
        periodsPerMonth: line.periodsPerMonth,
        periodsPerCycle: line.periodsInMonth ?? periodsPerCycleForFrequency(line.payFrequency ?? 'semi_monthly', line.periodsPerMonth),
        cutoffIndex: line.cutoffIndex ?? 1,
        cutoffsCovered: line.cutoffsCovered,
      }
    : { frequency: 'semi_monthly', periodsPerMonth: 2, periodsPerCycle: 2, cutoffIndex: 1 }
  const ppm = schedule.periodsPerMonth
  const ppmLabel = Number.isInteger(ppm) ? String(ppm) : ppm.toFixed(2)
  const hourlyRate = hourlyRateFor(employee)
  const dailyRate = dailyRateFor(employee)

  // ---- Earnings (real — the Basic/Output Pay line is recomputed via the exact same function the engine used, so it can never drift from `line.earnings`) ----
  const basicPayResult = basicPayFor(employee, period, attendanceRecords, compensationApprovals, ppm)
  const periodOvertime = overtimeRecords.filter(
    (r) => r.employeeId === employee.id && r.status === 'approved' && r.date >= period.startDate && r.date <= period.endDate,
  )
  const earnings: EarningItem[] = line.earnings.map((e) => {
    if (e.label === basicPayResult.label) {
      return { ...e, formula: basicPayResult.formula }
    }
    const bonus = bonusByName.get(e.label)
    if (bonus) {
      const taxNote = bonus.taxable ? 'taxable' : 'non-taxable'
      return {
        ...e,
        formula:
          bonus.bonusType === 'percentage'
            ? `${bonus.amount}% of monthly-equivalent basic pay (${taxNote}, one-time this cutoff) = ${formatCurrency(e.amount)}`
            : `Approved Bonus/Incentive — "${bonus.name}" (${taxNote}, one-time this cutoff) = ${formatCurrency(e.amount)}`,
      }
    }
    if (thirteenthMonthLine && e.label === '13th Month Pay') {
      return {
        ...e,
        formula: `Total Basic Salary Earned ${formatCurrency(thirteenthMonthLine.annualBasicEarned)} (${thirteenthMonthLine.monthsCredited}/12 months credited) ÷ 12 = ${formatCurrency(e.amount)} (non-taxable)`,
      }
    }
    if (OVERTIME_EARNING_LABELS.has(e.label)) {
      const records = periodOvertime.filter((r) => OVERTIME_TYPE_LABEL_ENGINE[r.type] === e.label)
      const parts = records.map((r) => `${r.hours}h × ${Math.round(r.multiplier * 100)}%`).join(' + ')
      return { ...e, formula: `Hourly Rate ${formatCurrency(hourlyRate)} × (${parts || '—'}) = ${formatCurrency(e.amount)} (approved, taxable)` }
    }
    if (e.label === 'Paid Leave') {
      return { ...e, formula: `Daily Rate ${formatCurrency(dailyRate)} × ${Math.round(e.amount / dailyRate)} approved paid-leave day(s) = ${formatCurrency(e.amount)}` }
    }
    const monthly = employee.compensation.allowances.find((a) => a.label === e.label)?.amount ?? e.amount * ppm
    return { ...e, formula: `${e.label} ${formatCurrency(monthly)} monthly ÷ ${ppmLabel} pay periods = ${formatCurrency(e.amount)}` }
  })

  // Overtime is part of Gross Pay (see the earnings above), so there is no separate preview any more.
  const overtimePreview: OvertimePreviewItem[] = []

  // ---- Deductions (real — mirrors line fields exactly; formulas + allocation context added) ----
  const deductions: DeductionItem[] = []

  const ms = line.monthlyStatutory
  const sssMonthly = ms?.sssEmployee ?? line.sssEmployeeShare * 2
  const sssAlloc = realAllocation(sssMonthly, line.sssEmployeeShare, configByName.get('SSS Contribution')?.allocationMethod, schedule)
  const monthlyEquivalent = monthlyEquivalentFor(employee)
  const sssBracket = statutoryConfig?.sssBrackets.find(
    (b) => monthlyEquivalent >= b.minSalary && (b.maxSalary === null || monthlyEquivalent < b.maxSalary),
  )
  deductions.push({
    label: 'SSS Contribution',
    currentPeriodAmount: line.sssEmployeeShare,
    formula: `${sssBracket ? `MSC ${formatCurrency(sssBracket.msc)} × 5% employee share = ${formatCurrency(sssMonthly)} monthly → ` : ''}${sssAlloc.formula}`,
    allocation: sssAlloc.detail,
  })

  const philhealthMonthly = ms?.philhealthEmployee ?? line.philhealthEmployeeShare * 2
  const philhealthAlloc = realAllocation(philhealthMonthly, line.philhealthEmployeeShare, configByName.get('PhilHealth Contribution')?.allocationMethod, schedule)
  const philhealthRatePct = statutoryConfig ? Math.round(statutoryConfig.philhealthRate * 100) : 5
  const philhealthBase = Math.min(Math.max(monthlyEquivalent, statutoryConfig?.philhealthSalaryFloor ?? 10_000), statutoryConfig?.philhealthSalaryCeiling ?? 100_000)
  deductions.push({
    label: 'PhilHealth Contribution',
    currentPeriodAmount: line.philhealthEmployeeShare,
    formula: `Basic ${formatCurrency(philhealthBase)}${philhealthBase !== monthlyEquivalent ? ' (floor/ceiling applied)' : ''} × ${philhealthRatePct}% premium × 50% employee share = ${formatCurrency(philhealthMonthly)} monthly; ${philhealthAlloc.formula}`,
    allocation: philhealthAlloc.detail,
  })

  const pagibigMonthly = ms?.pagibigEmployee ?? line.pagibigEmployeeShare * 2
  const pagibigAlloc = realAllocation(pagibigMonthly, line.pagibigEmployeeShare, configByName.get('Pag-IBIG Contribution')?.allocationMethod, schedule)
  deductions.push({
    label: 'Pag-IBIG Contribution',
    currentPeriodAmount: line.pagibigEmployeeShare,
    formula: `2% of pay up to the ₱10,000 maximum fund salary = ${formatCurrency(pagibigMonthly)} monthly; ${pagibigAlloc.formula}`,
    allocation: pagibigAlloc.detail,
  })

  const taxMonthly = ms?.withholdingTax ?? line.withholdingTax * 2
  const taxAlloc = realAllocation(taxMonthly, line.withholdingTax, configByName.get('Withholding Tax')?.allocationMethod, schedule)
  const regularTax = ms ? Math.round(allocateForDisplay(taxMonthly, schedule, configByName.get('Withholding Tax'))) : line.withholdingTax
  const extrasTax = Math.max(0, line.withholdingTax - regularTax)
  deductions.push({
    label: 'Withholding Tax',
    currentPeriodAmount: line.withholdingTax,
    formula: `TRAIN monthly table on taxable pay (basic − SSS, PhilHealth, Pag-IBIG) = ${formatCurrency(taxMonthly)} monthly; ${describeAllocation(taxMonthly, regularTax, schedule, configByName.get('Withholding Tax')?.allocationMethod)}${extrasTax > 0 ? ` + ${formatCurrency(extrasTax)} on overtime/taxable bonuses at the marginal rate` : ''}`,
    allocation: taxAlloc.detail,
  })

  for (const loanDeduction of line.loanDeductions) {
    const loan = loans.find((l) => l.employeeId === employee.id && l.label === loanDeduction.label)
    const config = loan ? configByName.get(loanConfigNameFor(loan.type)) : undefined
    const monthly = loan?.monthlyDeduction ?? loanDeduction.amount * ppm
    const loanAlloc = realAllocation(monthly, loanDeduction.amount, config?.allocationMethod, schedule)
    deductions.push({
      label: loanDeduction.label,
      currentPeriodAmount: loanDeduction.amount,
      formula: loanAlloc.formula,
      allocation: loanAlloc.detail,
      remainingBalance: loan ? Math.max(0, loan.balance - loanDeduction.amount) : undefined,
    })
  }

  for (const other of line.otherDeductions) {
    deductions.push({
      label: other.label,
      currentPeriodAmount: other.amount,
      formula:
        other.label === 'Absences'
          ? `Daily Rate ${formatCurrency(dailyRate)} × ${line.absentDays} unpaid absence(s) (approved paid leave excluded) = ${formatCurrency(other.amount)}`
          : other.kind === 'recurring'
            ? `Recurring deduction — monthly amount split across this month's pay runs = ${formatCurrency(other.amount)} this payroll`
            : other.kind === 'benefit'
              ? `Employee share of the benefit premium — monthly amount split across this month's pay runs = ${formatCurrency(other.amount)} this payroll`
              : `${formatCurrency(other.amount)} this payroll (one-time, not a monthly recurring amount)`,
    })
  }

  // ---- Illustrative only: recurring "other" catalog deductions the engine doesn't compute yet ----
  const periodsPerCycle = schedule.periodsPerCycle
  const cutoffIndex = schedule.cutoffIndex
  const ILLUSTRATIVE_MOCK_MONTHLY: Record<string, number> = {
    'Late/Undertime Adjustment': 500.01,
    'Canteen/Meal Plan Deduction': 450,
    'Cooperative Savings': 300,
  }
  const illustrativeDeductions: DeductionItem[] = deductionConfigs
    .filter((c) => c.category === 'other' && c.recurrence === 'recurring' && c.isActive && ILLUSTRATIVE_MOCK_MONTHLY[c.name] !== undefined)
    .map((config) => {
      const monthly = ILLUSTRATIVE_MOCK_MONTHLY[config.name]
      const method = config.allocationMethod ?? 'equal_split'
      const splits =
        method === 'custom'
          ? splitCustom(monthly, config.customSplitPercentages ?? [50, 50])
          : method === 'specific_cutoff'
            ? splitSpecificCutoff(monthly, periodsPerCycle, config.specificCutoffPeriod ?? 1)
            : splitEqual(monthly, periodsPerCycle)
      const current = splits[Math.min(cutoffIndex, splits.length) - 1] ?? 0
      return {
        label: config.name,
        currentPeriodAmount: current,
        formula: allocationFormula(method, monthly, current, periodsPerCycle, cutoffIndex),
        allocation: { monthlyAmount: monthly, currentPeriodAmount: current, allocationMethod: method, periodsPerCycle, cutoffIndex },
        isIllustrative: true,
      }
    })

  const summary: ComputationSummary = {
    grossPay: line.grossPay,
    totalStatutory: line.sssEmployeeShare + line.philhealthEmployeeShare + line.pagibigEmployeeShare,
    withholdingTax: line.withholdingTax,
    totalLoans: line.loanDeductions.reduce((s, d) => s + d.amount, 0),
    otherDeductions: line.otherDeductions.reduce((s, d) => s + d.amount, 0),
    totalDeductions: line.totalDeductions,
    netPay: line.netPay,
  }

  return { earnings, basicPayResult, overtimePreview, deductions, illustrativeDeductions, summary }
}
