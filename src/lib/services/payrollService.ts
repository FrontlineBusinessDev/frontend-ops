import { bonusAmountFor, bonusAppliesToEmployee } from '@/lib/payroll/bonusMatching'
import { basicPayFor, monthlyEquivalentFor } from '@/lib/payroll/rateBasis'
import { scopeToCompany } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { Employee, PayrollLine, PayrollPeriod, PayrollPeriodStatus, SessionUser, SssBracket, StatutoryConfig } from '@/types/domain'

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

function countAbsences(employeeId: string, startDate: string, endDate: string): number {
  return db.attendanceRecords.filter(
    (r) => r.employeeId === employeeId && r.status === 'absent' && r.date >= startDate && r.date <= endDate,
  ).length
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

function computeLine(session: SessionUser, period: PayrollPeriod, config: StatutoryConfig, employee: Employee): PayrollLine {
  const absentDays = countAbsences(employee.id, period.startDate, period.endDate)

  // Pay Rate Type + Base Rate + this period's attendance/output data → the base earning amount.
  // Daily/Hourly/Output-Based rates are inherently attendance/output-sensitive already (they only
  // pay for days/hours/units actually recorded), so — unlike Monthly/Semi-Monthly, which are a
  // fixed period amount regardless of attendance — they get no separate absence deduction below.
  const basicPayResult = basicPayFor(employee, period, db.attendanceRecords)
  const appliesAbsenceDeduction = employee.compensation.payType === 'monthly' || employee.compensation.payType === 'semi_monthly'
  const workingDaysInPeriod = 11 // half-month approximation for a semi-monthly period
  const dailyRate = employee.compensation.basicPay / (workingDaysInPeriod * 2)
  const absenceDeduction = appliesAbsenceDeduction ? Math.round(dailyRate * absentDays) : 0

  // Approved Bonuses & Incentives tagged for this cutoff, plus a finalized 13th Month Pay batch
  // paying out on this cutoff, flow straight into Gross Pay as additional earnings lines.
  const approvedBonuses = db.bonuses.filter(
    (b) => b.companyId === session.companyId && b.status === 'approved' && periodLabelMatches(b.periodLabel, period) && bonusAppliesToEmployee(b, employee),
  )
  const bonusEarnings = approvedBonuses.map((b) => ({ label: b.name, amount: bonusAmountFor(b, employee) }))

  const thirteenthMonthRun = db.thirteenthMonthRuns.find(
    (r) => r.companyId === session.companyId && r.status === 'finalized' && periodLabelMatches(r.payoutPeriodLabel, period),
  )
  const thirteenthMonthLine = thirteenthMonthRun
    ? db.thirteenthMonthLines.find((l) => l.runId === thirteenthMonthRun.id && l.employeeId === employee.id)
    : undefined
  const thirteenthMonthEarnings = thirteenthMonthLine ? [{ label: '13th Month Pay', amount: thirteenthMonthLine.thirteenthMonthPay }] : []

  const earnings = [
    { label: basicPayResult.label, amount: basicPayResult.amount },
    ...employee.compensation.allowances.map((a) => ({ label: a.label, amount: a.amount / 2 })),
    ...bonusEarnings,
    ...thirteenthMonthEarnings,
  ]
  const grossPay = earnings.reduce((sum, e) => sum + e.amount, 0)

  const activeLoans = db.loans.filter((l) => l.employeeId === employee.id && l.status === 'active' && l.balance > 0)
  const loanDeductions = activeLoans.map((loan) => ({
    label: loan.label,
    amount: Math.min(loan.monthlyDeduction / 2, loan.balance),
  }))

  // Statutory brackets/tax expect a monthly figure. `basicPay` only *is* one when payType is
  // 'monthly' — for every other rate type it's fed a rate-type-aware monthly-equivalent instead,
  // so a daily/hourly/output-based employee's SSS/PhilHealth/tax don't collapse toward zero. The
  // bracket/tax formulas themselves are unchanged.
  const monthlyEquivalent = monthlyEquivalentFor(employee)
  const sssBracket = sssBracketFor(monthlyEquivalent, config.sssBrackets)
  const sssEmployeeMonthly = sssBracket?.employeeShare ?? 0
  const sssEmployerMonthly = sssBracket?.employerShare ?? 0
  const sssEmployeeShare = Math.round(sssEmployeeMonthly) / 2
  const sssEmployerShare = Math.round(sssEmployerMonthly) / 2
  const philhealthTotal = monthlyEquivalent * config.philhealthRate
  const philhealthEmployeeMonthly = philhealthTotal * config.philhealthEmployeeSharePercent
  const philhealthEmployerMonthly = philhealthTotal * config.philhealthEmployerSharePercent
  const philhealthEmployeeShare = Math.round(philhealthEmployeeMonthly) / 2
  const philhealthEmployerShare = Math.round(philhealthEmployerMonthly) / 2
  const pagibigEmployeeMonthly = employee.government.pagibigEmployeeContribution ?? config.pagibigEmployeeAmount
  const pagibigEmployeeShare = pagibigEmployeeMonthly / 2
  const pagibigEmployerShare = config.pagibigEmployerAmount / 2

  const monthlyTaxable = monthlyEquivalent - sssEmployeeMonthly - philhealthEmployeeMonthly - pagibigEmployeeMonthly
  const baseWithholdingTax = Math.round(taxFor(monthlyTaxable, config) / 2)

  // Taxable bonuses (13th Month Pay is non-taxable by law and never reaches this) are withheld at
  // the employee's current marginal bracket rate — a deliberately simplified stand-in for BIR's
  // full annualized/cumulative-average bonus withholding method, applied on top of (never altering)
  // the regular salary withholding computed above.
  const taxableBonusAmount = approvedBonuses.filter((b) => b.taxable).reduce((sum, b) => sum + bonusAmountFor(b, employee), 0)
  const marginalBracket = config.taxBrackets.find((b) => monthlyTaxable >= b.min && (b.max === null || monthlyTaxable < b.max))
  const bonusWithholdingTax = taxableBonusAmount > 0 && marginalBracket ? Math.round(taxableBonusAmount * marginalBracket.rate) : 0
  const withholdingTax = baseWithholdingTax + bonusWithholdingTax

  const otherDeductions = absenceDeduction > 0 ? [{ label: 'Absences', amount: absenceDeduction }] : []

  const totalDeductions =
    loanDeductions.reduce((s, d) => s + d.amount, 0) +
    otherDeductions.reduce((s, d) => s + d.amount, 0) +
    sssEmployeeShare +
    philhealthEmployeeShare +
    pagibigEmployeeShare +
    withholdingTax

  return {
    id: `${period.id}_${employee.id}`,
    companyId: session.companyId,
    periodId: period.id,
    employeeId: employee.id,
    basicPay: employee.compensation.basicPay,
    earnings,
    grossPay,
    absentDays,
    loanDeductions,
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
  }
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
  const lines = activeEmployees.map((employee) => computeLine(session, period, config, employee))
  db.payrollLines.push(...lines)

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
