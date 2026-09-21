import { basicPayFor, monthlyEquivalentFor, type BasicPayResult } from '@/lib/payroll/rateBasis'
import { formatCurrency } from '@/lib/utils/format'
import type {
  AttendanceRecord,
  BonusIncentive,
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

/**
 * The real payroll engine (`payrollService.ts#computeLine`) always applies an equal semi-monthly
 * split to statutory contributions, tax, and loans — regardless of the employee's Payroll Group
 * frequency. This constant documents that fact so the breakdown never displays a formula that
 * contradicts the actual computed amount.
 */
const ENGINE_PERIODS_PER_CYCLE = 2

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

function estimateHourlyRate(employee: Employee): number {
  return employee.compensation.basicPay / (22 * 8)
}

const OVERTIME_TYPE_LABEL: Record<OvertimeRecord['type'], string> = {
  regular: 'Overtime',
  night_diff: 'Night Differential',
  rest_day_holiday: 'Rest Day / Holiday Overtime',
}

const LOAN_CONFIG_NAME: Record<LoanRecord['type'], string> = {
  sss_salary_loan: 'SSS Salary Loan',
  sss_calamity_loan: 'SSS Salary Loan',
  pagibig_multipurpose_loan: 'Pag-IBIG Loan',
  pagibig_calamity_loan: 'Pag-IBIG Loan',
  pagibig_mp2: 'Pag-IBIG Loan',
  company_loan: 'Company Loan',
  other_deduction: 'Late/Undertime Adjustment',
}

/** Statutory/tax/loan deductions are always actually computed by the engine as an equal ÷2 split — this builds the (real, non-contradictory) allocation context for one of them. */
function realAllocation(monthlyAmount: number, currentPeriodAmount: number, configuredMethod: DeductionAllocationMethod | undefined): {
  detail: AllocationDetail
  formula: string
} {
  // The configured method is surfaced for transparency, but the cycle/index always reflect what the engine actually did (equal ÷2) so the displayed math never contradicts the real deducted amount.
  const detail: AllocationDetail = {
    monthlyAmount,
    currentPeriodAmount,
    allocationMethod: configuredMethod ?? 'equal_split',
    periodsPerCycle: ENGINE_PERIODS_PER_CYCLE,
    cutoffIndex: 1,
  }
  return { detail, formula: allocationFormula('equal_split', monthlyAmount, currentPeriodAmount, ENGINE_PERIODS_PER_CYCLE, 1) }
}

export function buildComputationBreakdown(params: {
  employee: Employee
  line: PayrollLine
  period: PayrollPeriod
  payrollGroup: PayrollGroup | undefined
  deductionConfigs: DeductionConfig[]
  loans: LoanRecord[]
  overtimeRecords: OvertimeRecord[]
  attendanceRecords: AttendanceRecord[]
  statutoryConfig: StatutoryConfig | undefined
  /** Approved Bonuses & Incentives that matched this employee/period — only used to label their earnings lines correctly (one-time full amount, not a ÷2 allowance). */
  approvedBonuses?: BonusIncentive[]
  /** This employee's line from a finalized 13th Month Pay batch paying out this period, if any. */
  thirteenthMonthLine?: ThirteenthMonthLine
}): ComputationBreakdown {
  const { employee, line, period, payrollGroup, deductionConfigs, loans, overtimeRecords, attendanceRecords, statutoryConfig, approvedBonuses = [], thirteenthMonthLine } = params
  const configByName = new Map(deductionConfigs.map((c) => [c.name, c]))
  const bonusByName = new Map(approvedBonuses.map((b) => [b.name, b]))

  // ---- Earnings (real — the Basic/Output Pay line is recomputed via the exact same function the engine used, so it can never drift from `line.earnings`) ----
  const basicPayResult = basicPayFor(employee, period, attendanceRecords)
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
    const monthly = employee.compensation.allowances.find((a) => a.label === e.label)?.amount ?? e.amount * 2
    return { ...e, formula: `${e.label} ${formatCurrency(monthly)} ÷ 2 pay periods = ${formatCurrency(e.amount)}` }
  })

  // ---- Overtime preview (real approved OT records for this period — illustrative, not yet part of computed Gross Pay) ----
  const periodOvertime = overtimeRecords.filter(
    (r) => r.employeeId === employee.id && r.status === 'approved' && r.date >= period.startDate && r.date <= period.endDate,
  )
  const hourlyRate = estimateHourlyRate(employee)
  const overtimePreview: OvertimePreviewItem[] = periodOvertime.map((r) => {
    const amount = Math.round(r.hours * hourlyRate * r.multiplier * 100) / 100
    return {
      label: OVERTIME_TYPE_LABEL[r.type],
      hours: r.hours,
      amount,
      formula: `Hourly Rate ${formatCurrency(hourlyRate)} × ${r.hours}h × ${Math.round(r.multiplier * 100)}% = ${formatCurrency(amount)}`,
    }
  })

  // ---- Deductions (real — mirrors line fields exactly; formulas + allocation context added) ----
  const deductions: DeductionItem[] = []

  const sssMonthly = line.sssEmployeeShare * 2
  const sssAlloc = realAllocation(sssMonthly, line.sssEmployeeShare, configByName.get('SSS Contribution')?.allocationMethod)
  const monthlyEquivalent = monthlyEquivalentFor(employee)
  const sssBracket = statutoryConfig?.sssBrackets.find(
    (b) => monthlyEquivalent >= b.minSalary && (b.maxSalary === null || monthlyEquivalent < b.maxSalary),
  )
  deductions.push({
    label: 'SSS Contribution',
    currentPeriodAmount: line.sssEmployeeShare,
    formula: `${sssBracket ? `SSS bracket MSC ${formatCurrency(sssBracket.msc)} → ` : ''}${sssAlloc.formula}`,
    allocation: sssAlloc.detail,
  })

  const philhealthMonthly = line.philhealthEmployeeShare * 2
  const philhealthAlloc = realAllocation(philhealthMonthly, line.philhealthEmployeeShare, configByName.get('PhilHealth Contribution')?.allocationMethod)
  const philhealthRatePct = statutoryConfig ? Math.round(statutoryConfig.philhealthRate * 100) : 5
  deductions.push({
    label: 'PhilHealth Contribution',
    currentPeriodAmount: line.philhealthEmployeeShare,
    formula: `Monthly-Equivalent Pay ${formatCurrency(monthlyEquivalent)} × ${philhealthRatePct}% premium × 50% employee share = ${formatCurrency(philhealthMonthly)} monthly; ${philhealthAlloc.formula}`,
    allocation: philhealthAlloc.detail,
  })

  const pagibigMonthly = line.pagibigEmployeeShare * 2
  const pagibigAlloc = realAllocation(pagibigMonthly, line.pagibigEmployeeShare, configByName.get('Pag-IBIG Contribution')?.allocationMethod)
  deductions.push({
    label: 'Pag-IBIG Contribution',
    currentPeriodAmount: line.pagibigEmployeeShare,
    formula: pagibigAlloc.formula,
    allocation: pagibigAlloc.detail,
  })

  const taxMonthly = line.withholdingTax * 2
  const taxAlloc = realAllocation(taxMonthly, line.withholdingTax, configByName.get('Withholding Tax')?.allocationMethod)
  deductions.push({
    label: 'Withholding Tax',
    currentPeriodAmount: line.withholdingTax,
    formula: `Estimated from monthly taxable income bracket; ${taxAlloc.formula}`,
    allocation: taxAlloc.detail,
  })

  for (const loanDeduction of line.loanDeductions) {
    const loan = loans.find((l) => l.employeeId === employee.id && l.label === loanDeduction.label)
    const config = loan ? configByName.get(LOAN_CONFIG_NAME[loan.type]) : undefined
    const monthly = loan?.monthlyDeduction ?? loanDeduction.amount * 2
    const loanAlloc = realAllocation(monthly, loanDeduction.amount, config?.allocationMethod)
    deductions.push({
      label: loanDeduction.label,
      currentPeriodAmount: loanDeduction.amount,
      formula: loanAlloc.formula,
      allocation: loanAlloc.detail,
      remainingBalance: loan ? Math.max(0, loan.balance - loanDeduction.amount) : undefined,
    })
  }

  for (const other of line.otherDeductions) {
    const dailyRate = employee.compensation.basicPay / (11 * 2)
    deductions.push({
      label: other.label,
      currentPeriodAmount: other.amount,
      formula:
        other.label === 'Absences'
          ? `Daily Rate ${formatCurrency(dailyRate)} × ${line.absentDays} day(s) absent = ${formatCurrency(other.amount)}`
          : `${formatCurrency(other.amount)} this payroll (one-time, not a monthly recurring amount)`,
    })
  }

  // ---- Illustrative only: recurring "other" catalog deductions the engine doesn't compute yet ----
  const periodsPerCycle = periodsPerCycleFor(payrollGroup?.frequency, payrollGroup)
  const cutoffIndex = cutoffIndexFor(period, periodsPerCycle)
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
