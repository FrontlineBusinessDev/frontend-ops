import { scopeToCompany } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { Employee, PayrollLine, PayrollPeriod, PayrollPeriodStatus, SessionUser, StatutoryConfig } from '@/types/domain'

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

function computeLine(session: SessionUser, period: PayrollPeriod, config: StatutoryConfig, employee: Employee): PayrollLine {
  const workingDaysInPeriod = 11 // half-month approximation for a semi-monthly period
  const dailyRate = employee.compensation.basicPay / (workingDaysInPeriod * 2)
  const absentDays = countAbsences(employee.id, period.startDate, period.endDate)
  const absenceDeduction = Math.round(dailyRate * absentDays)

  const earnings = [
    { label: 'Basic Pay', amount: employee.compensation.basicPay / 2 },
    ...employee.compensation.allowances.map((a) => ({ label: a.label, amount: a.amount / 2 })),
  ]
  const grossPay = earnings.reduce((sum, e) => sum + e.amount, 0)

  const activeLoans = db.loans.filter((l) => l.employeeId === employee.id && l.status === 'active' && l.balance > 0)
  const loanDeductions = activeLoans.map((loan) => ({
    label: loan.label,
    amount: Math.min(loan.monthlyDeduction / 2, loan.balance),
  }))

  const sssEmployeeShare = Math.round(employee.compensation.basicPay * config.sssEmployeeRate) / 2
  const sssEmployerShare = Math.round(employee.compensation.basicPay * config.sssEmployerRate) / 2
  const philhealthTotal = employee.compensation.basicPay * config.philhealthRate
  const philhealthEmployeeShare = Math.round(philhealthTotal / 2) / 2
  const philhealthEmployerShare = Math.round(philhealthTotal / 2) / 2
  const pagibigEmployeeShare = config.pagibigEmployeeAmount / 2
  const pagibigEmployerShare = config.pagibigEmployerAmount / 2

  const monthlyTaxable =
    employee.compensation.basicPay - employee.compensation.basicPay * config.sssEmployeeRate - philhealthTotal / 2 - config.pagibigEmployeeAmount
  const withholdingTax = Math.round(taxFor(monthlyTaxable, config) / 2)

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

  const activeEmployees = db.employees.filter((e) => e.companyId === session.companyId && e.employment.status === 'active')

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
