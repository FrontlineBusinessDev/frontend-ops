import { bonusAmountFor, bonusAppliesToEmployee, includedInRegularPayroll } from '@/lib/payroll/bonusMatching'
import { findEmployeePayrollGroup } from '@/lib/payroll/groupAssignment'
import { LOAN_CONFIG_NAME, allocateMonthly, payScheduleFor } from '@/lib/payroll/payFrequency'
import { basicPayFor, dailyRateFor, hourlyRateFor, monthlyEquivalentFor, workLogsForPeriod } from '@/lib/payroll/rateBasis'
import { scopeToCompany } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { BonusIncentive, Employee, OvertimeRecord, PayrollLine, PayrollPeriod, PayrollPeriodStatus, SessionUser, SssBracket, StatutoryConfig } from '@/types/domain'

/** Case/whitespace-insensitive match between a bonus/13th-month payout label and a real payroll period's label — the seam that lets those modules' approved records flow into a run without a hard foreign key to a period that may not exist yet when they're created. */
function periodLabelMatches(label: string, period: PayrollPeriod): boolean {
  return label.trim().toLowerCase() === period.label.trim().toLowerCase()
}

export async function getPayrollPeriods(session: SessionUser): Promise<PayrollPeriod[]> {
  return scopeToCompany(db.payrollPeriods, session.companyId).sort((a, b) => b.startDate.localeCompare(a.startDate))
}

export async function getPayrollLines(session: SessionUser, periodId: string): Promise<PayrollLine[]> {
  return db.payrollLines.filter((l) => l.companyId === session.companyId && l.periodId === periodId)
}

export async function getPayrollLine(session: SessionUser, lineId: string): Promise<PayrollLine | undefined> {
  return db.payrollLines.find((l) => l.companyId === session.companyId && l.id === lineId)
}

export interface CreatePeriodInput {
  label: string
  startDate: string
  endDate: string
  payDate: string
  /** When set, `runPayroll` only includes employees currently assigned to this Payroll Group. */
  payrollGroupId?: string
}

export async function createPayrollPeriod(session: SessionUser, input: CreatePeriodInput): Promise<PayrollPeriod> {
  const period: PayrollPeriod = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    status: 'draft',
    ...input,
  }
  db.payrollPeriods.unshift(period)
  return period
}

/** Whether an approved leave of a paid leave type covers `date` — a paid-leave day is paid, never deducted as an absence. */
function coveredByPaidLeave(companyId: string, employeeId: string, date: string): boolean {
  return db.leaveRequests.some((r) => {
    if (r.employeeId !== employeeId || r.status !== 'approved' || r.dateFrom > date || r.dateTo < date) return false
    const type = db.leaveTypes.find((t) => t.id === r.leaveTypeId && t.companyId === companyId)
    return !!type && type.isPaid !== false
  })
}

/** Absent days in the period, split into unpaid absences (deducted) and paid-leave days (paid). */
function attendanceOutcome(companyId: string, employeeId: string, startDate: string, endDate: string): { unpaidAbsentDays: number; paidLeaveDays: number } {
  const absences = db.attendanceRecords.filter((r) => r.employeeId === employeeId && r.status === 'absent' && r.date >= startDate && r.date <= endDate)
  const paidLeaveDays = absences.filter((r) => coveredByPaidLeave(companyId, employeeId, r.date)).length
  return { unpaidAbsentDays: absences.length - paidLeaveDays, paidLeaveDays }
}

function taxFor(taxable: number, config: StatutoryConfig): number {
  const bracket = config.taxBrackets.find((b) => taxable >= b.min && (b.max === null || taxable < b.max))
  if (!bracket) return 0
  return bracket.baseTax + (taxable - bracket.min) * bracket.rate
}

function sssBracketFor(basicPay: number, brackets: SssBracket[]): SssBracket | undefined {
  return (
    brackets.find((b) => basicPay >= b.minSalary && (b.maxSalary === null || basicPay < b.maxSalary)) ??
    brackets[brackets.length - 1]
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface MonthlyStatutory {
  /** Monthly compensation the brackets are applied to (rate-type-aware monthly-equivalent basic pay). */
  monthlyBasis: number
  sssMsc: number
  sssEmployee: number
  /** Employer SSS share including the EC premium. */
  sssEmployer: number
  sssEc: number
  philhealthBase: number
  philhealthEmployee: number
  philhealthEmployer: number
  pagibigEmployee: number
  pagibigEmployer: number
  /** Monthly compensation income subject to withholding: basis − employee SSS, PhilHealth, Pag-IBIG. */
  monthlyTaxable: number
  withholdingTax: number
  /** Marginal bracket rate — applied to taxable extras (overtime, taxable bonuses) paid in a cutoff. */
  marginalRate: number
}

/**
 * Full monthly statutory contributions and withholding tax for one employee under Philippine rules:
 *  - SSS: bracket MSC × 5% employee / 10% employer (+ EC ₱10/₱30), per the configured schedule;
 *  - PhilHealth: premium rate × basic salary clamped to the floor/ceiling, split per the configured shares;
 *  - Pag-IBIG: 2% (1% at ≤ ₱1,500) of pay up to the maximum fund salary, capped at the configured amount
 *    (a higher voluntary employee contribution on the employee record is honored);
 *  - BIR: TRAIN monthly table on basis − employee contributions.
 * The single source for the payroll engine, the Statutory Contributions employee view, and payslips.
 */
export function monthlyStatutoryFor(config: StatutoryConfig, employee: Employee): MonthlyStatutory {
  const monthlyBasis = monthlyEquivalentFor(employee)

  const sssBracket = sssBracketFor(monthlyBasis, config.sssBrackets)
  const sssEc = sssBracket?.ec ?? 0
  const sssEmployee = round2(sssBracket?.employeeShare ?? 0)
  const sssEmployer = round2((sssBracket?.employerShare ?? 0) + sssEc)

  const floor = config.philhealthSalaryFloor ?? 10_000
  const ceiling = config.philhealthSalaryCeiling ?? 100_000
  const philhealthBase = Math.min(Math.max(monthlyBasis, floor), ceiling)
  const philhealthPremium = philhealthBase * config.philhealthRate
  const philhealthEmployee = round2(philhealthPremium * config.philhealthEmployeeSharePercent)
  const philhealthEmployer = round2(philhealthPremium * config.philhealthEmployerSharePercent)

  const pagibigRate = config.pagibigRate ?? 0.02
  const fundSalary = Math.min(monthlyBasis, config.pagibigMaxFundSalary ?? 10_000)
  const employeeRate = monthlyBasis <= 1_500 ? pagibigRate / 2 : pagibigRate
  const mandatoryEmployee = Math.min(round2(fundSalary * employeeRate), config.pagibigEmployeeAmount)
  const pagibigEmployee = Math.max(mandatoryEmployee, employee.government.pagibigEmployeeContribution ?? 0)
  const pagibigEmployer = Math.min(round2(fundSalary * pagibigRate), config.pagibigEmployerAmount)

  const monthlyTaxable = Math.max(0, monthlyBasis - sssEmployee - philhealthEmployee - pagibigEmployee)
  const withholdingTax = round2(taxFor(monthlyTaxable, config))
  const marginalRate = config.taxBrackets.find((b) => monthlyTaxable >= b.min && (b.max === null || monthlyTaxable < b.max))?.rate ?? 0

  return {
    monthlyBasis,
    sssMsc: sssBracket?.msc ?? 0,
    sssEmployee,
    sssEmployer,
    sssEc,
    philhealthBase,
    philhealthEmployee,
    philhealthEmployer,
    pagibigEmployee,
    pagibigEmployer,
    monthlyTaxable,
    withholdingTax,
    marginalRate,
  }
}

const OVERTIME_EARNING_LABEL: Record<OvertimeRecord['type'], string> = {
  regular: 'Overtime Pay',
  night_diff: 'Night Differential',
  rest_day_holiday: 'Rest Day / Holiday Overtime',
}

/** Earnings labels the engine produces besides Basic Pay, allowances and bonuses — so payslips can type them correctly. */
export const OVERTIME_EARNING_LABELS = new Set(Object.values(OVERTIME_EARNING_LABEL))
export const PAID_LEAVE_EARNING_LABEL = 'Paid Leave'

function configNamed(companyId: string, name: string) {
  return db.deductionConfigs.find((c) => c.companyId === companyId && c.name === name)
}

function computeLine(session: SessionUser, period: PayrollPeriod, config: StatutoryConfig, employee: Employee): PayrollLine {
  const group = period.payrollGroupId ? db.payrollGroups.find((g) => g.id === period.payrollGroupId) : undefined
  // The group's work schedule decides the daily-payroll divisor (22 working days for 5-day weeks, 26 for 6-day).
  // All Employees runs follow each employee's own Payroll Group frequency (see payScheduleFor).
  const employeeGroup = findEmployeePayrollGroup(db.payrollGroups.filter((g) => g.companyId === session.companyId), employee.id)
  const workSchedule =
    db.schedules.find((s) => s.id === (group ?? employeeGroup)?.workScheduleId) ?? db.schedules.find((s) => s.companyId === session.companyId)
  const schedule = payScheduleFor(period, group, workSchedule, employeeGroup)
  // A run covering several of the employee's cutoffs pays that many periods' worth of salary/allowances.
  const payPeriodsPerMonth = schedule.periodsPerMonth / (schedule.cutoffsCovered?.length ?? 1)
  const { unpaidAbsentDays, paidLeaveDays } = attendanceOutcome(session.companyId, employee.id, period.startDate, period.endDate)

  // Pay Rate Type + Base Rate + this period's attendance/output data → the base earning amount,
  // sized to the run's pay frequency. Daily/Hourly/Output-Based rates only pay for days/hours/units
  // actually recorded, so — unlike Monthly/Semi-Monthly — they get no separate absence deduction.
  const basicPayResult = basicPayFor(employee, period, db.attendanceRecords, db.compensationApprovals, payPeriodsPerMonth)
  const payType = employee.compensation.payType
  const isSalaried = payType === 'monthly' || payType === 'semi_monthly'
  const dailyRate = dailyRateFor(employee)
  const hourlyRate = hourlyRateFor(employee)
  const absenceDeduction = isSalaried ? Math.round(dailyRate * unpaidAbsentDays) : 0
  // Daily/hourly employees aren't paid for absent days, so an approved paid leave on such a day is paid here.
  const paidLeaveEarning =
    !isSalaried && (payType === 'daily' || payType === 'hourly') && paidLeaveDays > 0
      ? [{ label: PAID_LEAVE_EARNING_LABEL, amount: round2(dailyRate * paidLeaveDays) }]
      : []

  // Approved overtime / night differential in the period: hours × hourly rate × the OT rate multiplier.
  const overtimeByType = new Map<OvertimeRecord['type'], number>()
  for (const r of db.overtimeRecords) {
    if (r.employeeId !== employee.id || r.status !== 'approved' || r.date < period.startDate || r.date > period.endDate) continue
    overtimeByType.set(r.type, (overtimeByType.get(r.type) ?? 0) + r.hours * hourlyRate * r.multiplier)
  }
  const overtimeEarnings = [...overtimeByType].map(([type, amount]) => ({ label: OVERTIME_EARNING_LABEL[type], amount: round2(amount) }))
  const overtimePay = overtimeEarnings.reduce((sum, e) => sum + e.amount, 0)

  // Approved Bonuses & Incentives tagged for this cutoff flow into Gross Pay. Bonuses set to
  // "Generate Separate Payslip", and 13th Month Pay, are always paid on their own payslips.
  const approvedBonuses = db.bonuses.filter(
    (b) =>
      b.companyId === session.companyId &&
      b.status === 'approved' &&
      includedInRegularPayroll(b) &&
      periodLabelMatches(b.periodLabel, period) &&
      bonusAppliesToEmployee(b, employee),
  )
  const bonusEarnings = approvedBonuses.map((b) => ({ label: b.name, amount: bonusAmountFor(b, employee) }))

  const earnings = [
    { label: basicPayResult.label, amount: basicPayResult.amount },
    ...paidLeaveEarning,
    ...overtimeEarnings,
    ...employee.compensation.allowances.map((a) => ({ label: a.label, amount: round2(a.amount / payPeriodsPerMonth) })),
    ...bonusEarnings,
  ]
  const grossPay = round2(earnings.reduce((sum, e) => sum + e.amount, 0))

  // Loans: the monthly amortization, allocated per the loan type's Payroll Settings schedule, never above the balance.
  const activeLoans = db.loans.filter((l) => l.employeeId === employee.id && l.status === 'active' && l.balance > 0)
  const loanDeductions = activeLoans
    .map((loan) => ({
      label: loan.label,
      amount: Math.min(allocateMonthly(loan.monthlyDeduction, schedule, configNamed(session.companyId, LOAN_CONFIG_NAME[loan.type])), loan.balance),
    }))
    .filter((d) => d.amount > 0)

  // Statutory: full monthly amounts, then each allocated to this cutoff per its Payroll Settings schedule
  // (equal split by pay frequency, one specific cutoff, or a custom split).
  const monthly = monthlyStatutoryFor(config, employee)
  const alloc = (amount: number, name: string) => allocateMonthly(amount, schedule, configNamed(session.companyId, name))
  const sssEmployeeShare = alloc(monthly.sssEmployee, 'SSS Contribution')
  const sssEmployerShare = alloc(monthly.sssEmployer, 'SSS Contribution')
  const philhealthEmployeeShare = alloc(monthly.philhealthEmployee, 'PhilHealth Contribution')
  const philhealthEmployerShare = alloc(monthly.philhealthEmployer, 'PhilHealth Contribution')
  const pagibigEmployeeShare = alloc(monthly.pagibigEmployee, 'Pag-IBIG Contribution')
  const pagibigEmployerShare = alloc(monthly.pagibigEmployer, 'Pag-IBIG Contribution')

  // Withholding tax: the monthly TRAIN tax on regular compensation, allocated like the others, plus
  // taxable extras paid this cutoff (overtime, taxable bonuses) at the employee's marginal rate — a
  // simplified stand-in for BIR's annualized method that never alters the regular withholding.
  const baseWithholdingTax = Math.round(alloc(monthly.withholdingTax, 'Withholding Tax'))
  const taxableBonusAmount = approvedBonuses.filter((b) => b.taxable).reduce((sum, b) => sum + bonusAmountFor(b, employee), 0)
  const extrasWithholdingTax = Math.round((taxableBonusAmount + overtimePay) * monthly.marginalRate)
  const withholdingTax = baseWithholdingTax + extrasWithholdingTax

  const otherDeductions = absenceDeduction > 0 ? [{ label: 'Absences', amount: absenceDeduction }] : []

  // Statutory contributions, tax and absences are always taken; loan amortizations only up to what
  // the remaining pay covers, so a thin cutoff never goes negative. The uncollected amortization
  // simply stays on the loan balance for later cutoffs.
  let remainingForLoans = grossPay - (sssEmployeeShare + philhealthEmployeeShare + pagibigEmployeeShare + withholdingTax + absenceDeduction)
  const collectedLoanDeductions = loanDeductions
    .map((d) => {
      const amount = round2(Math.max(0, Math.min(d.amount, remainingForLoans)))
      remainingForLoans -= amount
      return { ...d, amount }
    })
    .filter((d) => d.amount > 0)

  const totalDeductions = round2(
    collectedLoanDeductions.reduce((s, d) => s + d.amount, 0) +
      otherDeductions.reduce((s, d) => s + d.amount, 0) +
      sssEmployeeShare +
      philhealthEmployeeShare +
      pagibigEmployeeShare +
      withholdingTax,
  )

  return {
    id: `${period.id}_${employee.id}`,
    companyId: session.companyId,
    periodId: period.id,
    employeeId: employee.id,
    basicPay: employee.compensation.basicPay,
    earnings,
    grossPay,
    absentDays: unpaidAbsentDays,
    loanDeductions: collectedLoanDeductions,
    otherDeductions,
    sssEmployeeShare,
    sssEmployerShare,
    philhealthEmployeeShare,
    philhealthEmployerShare,
    pagibigEmployeeShare,
    pagibigEmployerShare,
    withholdingTax,
    totalDeductions,
    netPay: Math.round(grossPay - totalDeductions),
    payFrequency: schedule.frequency,
    periodsPerMonth: payPeriodsPerMonth,
    periodsInMonth: schedule.periodsPerCycle,
    cutoffIndex: schedule.cutoffIndex,
    cutoffsCovered: schedule.cutoffsCovered,
    monthlyStatutory: {
      sssEmployee: monthly.sssEmployee,
      sssEmployer: monthly.sssEmployer,
      philhealthEmployee: monthly.philhealthEmployee,
      philhealthEmployer: monthly.philhealthEmployer,
      pagibigEmployee: monthly.pagibigEmployee,
      pagibigEmployer: monthly.pagibigEmployer,
      withholdingTax: monthly.withholdingTax,
    },
    overtimePay: round2(overtimePay),
  }
}

export interface SeparateBonusPayslip {
  bonus: BonusIncentive
  employee: Employee
  grossBonus: number
  withholdingTax: number
  netPay: number
  /** Marginal bracket rate applied to a taxable bonus (0 for non-taxable). */
  taxRate: number
}

/**
 * The standalone payslip for a bonus set to "Generate Separate Payslip". It carries only the bonus:
 * no basic pay, allowances or statutory contributions (those stay on the regular payroll payslip).
 * A taxable bonus is withheld at the employee's marginal bracket rate, exactly as the regular run
 * withholds a bonus included there. Read-only; nothing is saved.
 */
export function computeSeparateBonusPayslip(session: SessionUser, bonus: BonusIncentive, employee: Employee): SeparateBonusPayslip | undefined {
  const config = db.statutoryConfigs.find((c) => c.companyId === session.companyId)
  if (!config) return undefined

  const grossBonus = bonusAmountFor(bonus, employee)
  const taxRate = bonus.taxable ? marginalTaxRate(config, employee) : 0
  const withholdingTax = Math.round(grossBonus * taxRate)
  return { bonus, employee, grossBonus, withholdingTax, netPay: Math.round(grossBonus - withholdingTax), taxRate }
}

/** The employee's marginal withholding bracket rate — the same simplified rate the regular run applies to taxable bonuses. */
function marginalTaxRate(config: StatutoryConfig, employee: Employee): number {
  return monthlyStatutoryFor(config, employee).marginalRate
}

/** Marginal withholding rate for an employee under the company's statutory config (0 if none configured). */
export function marginalTaxRateFor(session: SessionUser, employee: Employee): number {
  const config = db.statutoryConfigs.find((c) => c.companyId === session.companyId)
  return config ? marginalTaxRate(config, employee) : 0
}

/** Computes a line exactly as `runPayroll` would, without saving it or changing any state — for report previews. */
export function previewPayrollLine(session: SessionUser, period: PayrollPeriod, employee: Employee): PayrollLine | undefined {
  const config = db.statutoryConfigs.find((c) => c.companyId === session.companyId)
  return config ? computeLine(session, period, config, employee) : undefined
}

/** Computes payroll lines for every active employee and moves the period from draft to review. */
export async function runPayroll(session: SessionUser, periodId: string): Promise<PayrollLine[]> {
  const period = db.payrollPeriods.find((p) => p.id === periodId && p.companyId === session.companyId)
  if (!period) throw new Error('Payroll period not found')

  const config = db.statutoryConfigs.find((c) => c.companyId === session.companyId)
  if (!config) throw new Error('Statutory configuration not found')

  const payrollGroup = period.payrollGroupId ? db.payrollGroups.find((g) => g.id === period.payrollGroupId) : undefined
  const activeEmployees = db.employees.filter(
    (e) =>
      e.companyId === session.companyId &&
      e.employment.status === 'active' &&
      (!payrollGroup || payrollGroup.employeeIds.includes(e.id)),
  )

  db.payrollLines = db.payrollLines.filter((l) => l.periodId !== periodId)
  for (const approval of db.compensationApprovals) {
    if (approval.payrollPeriodId === periodId) approval.payrollPeriodId = undefined
  }

  const lines = activeEmployees.map((employee) => computeLine(session, period, config, employee))
  db.payrollLines.push(...lines)

  // Lock the approved work logs this run paid to the period (computed while still 'draft', the
  // same selection `computeLine` just used) so no other run can pay them again.
  for (const employee of activeEmployees) {
    for (const approval of workLogsForPeriod(employee.id, period, db.compensationApprovals).payable) {
      approval.payrollPeriodId = period.id
    }
  }

  period.status = 'review'
  return lines
}

function transition(session: SessionUser, periodId: string, from: PayrollPeriodStatus, to: PayrollPeriodStatus) {
  const period = db.payrollPeriods.find((p) => p.id === periodId && p.companyId === session.companyId)
  if (!period || period.status !== from) return
  period.status = to
}

export async function approvePayroll(session: SessionUser, periodId: string): Promise<void> {
  transition(session, periodId, 'review', 'approved')
}

export async function finalizePayroll(session: SessionUser, periodId: string): Promise<void> {
  const period = db.payrollPeriods.find((p) => p.id === periodId && p.companyId === session.companyId)
  if (!period || period.status !== 'approved') return

  const lines = db.payrollLines.filter((l) => l.periodId === periodId)
  for (const line of lines) {
    for (const deduction of line.loanDeductions) {
      const loan = db.loans.find((l) => l.employeeId === line.employeeId && l.label === deduction.label)
      if (loan) {
        loan.balance = Math.max(0, loan.balance - deduction.amount)
        if (loan.balance === 0) loan.status = 'completed'
        loan.repaymentHistory = [
          ...(loan.repaymentHistory ?? []),
          {
            id: crypto.randomUUID(),
            date: period.payDate,
            payrollReference: period.label,
            amount: deduction.amount,
            remainingBalanceAfter: loan.balance,
          },
        ]
      }
    }
  }

  period.status = 'finalized'
}

export async function getStatutoryConfig(session: SessionUser): Promise<StatutoryConfig | undefined> {
  return db.statutoryConfigs.find((c) => c.companyId === session.companyId)
}

export async function updateStatutoryConfig(session: SessionUser, updates: Partial<StatutoryConfig>): Promise<void> {
  const config = db.statutoryConfigs.find((c) => c.companyId === session.companyId)
  if (!config) return
  Object.assign(config, updates)
}
