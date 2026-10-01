import { findEmployeePayrollGroup } from '@/lib/payroll/groupAssignment'
import { formatDate } from '@/lib/utils/format'
import type { BenefitCategory, Employee, LoanRecord, PayrollGroup, PayrollPeriod } from '@/types/domain'

export function fullName(employee: Employee | undefined): string {
  return employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown'
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface ProjectedInstallment {
  /** "Oct 2026" */
  month: string
  amount: number
  balanceAfter: number
}

/** Projects the remaining monthly installments of a loan from the current month, never collecting more than the balance. */
export function projectInstallments(loan: LoanRecord, today = new Date()): ProjectedInstallment[] {
  if (loan.status !== 'active' || loan.balance <= 0 || loan.monthlyDeduction <= 0) return []
  // A loan that hasn't started yet is first collected in its start month.
  const start = new Date(`${loan.startDate}T00:00:00`)
  const from = start > today ? start : today
  const installments: ProjectedInstallment[] = []
  let balance = loan.balance
  for (let i = 0; balance > 0.004 && i < 120; i++) {
    const amount = Math.min(loan.monthlyDeduction, balance)
    balance = Math.round((balance - amount) * 100) / 100
    const date = new Date(from.getFullYear(), from.getMonth() + i, 1)
    installments.push({ month: `${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`, amount, balanceAfter: balance })
  }
  return installments
}

export const BENEFIT_CATEGORY_META: Record<BenefitCategory, { title: string; singular: string; namePlaceholder: string; helper: string }> = {
  hmo: { title: 'HMO', singular: 'HMO plan', namePlaceholder: 'HMO', helper: 'Health coverage provided by the company. Add an employee share when the employee pays for part of it (e.g. a dependent).' },
  allowance: { title: 'Allowances', singular: 'allowance', namePlaceholder: 'Transportation Allowance', helper: 'Cash allowances are added to earnings on the payslip, split across the month’s pay runs like other allowances.' },
  insurance: { title: 'Insurance', singular: 'insurance policy', namePlaceholder: 'Group Life Insurance', helper: 'Company-provided insurance. Shown on the payslip as an employer-paid benefit.' },
  other: { title: 'Other Benefits', singular: 'benefit', namePlaceholder: 'Wellness Program', helper: 'Any other perk the company pays for. Shown on the payslip as an employer-paid benefit.' },
}

export interface NextDeduction {
  /** "Oct 9, 2026" when a scheduled pay run will collect it, else the month, e.g. "Oct 2026". */
  when: string
  /** What the deduction is waiting on, e.g. the run's label. */
  detail?: string
}

/**
 * When a loan is next deducted: the pay date of the employee's next payroll run that hasn't been finalized
 * (a run for their Payroll Group, or an All Employees run); when no such run exists yet, the month of the
 * next installment.
 */
export function nextDeduction(loan: LoanRecord, periods: PayrollPeriod[], groups: PayrollGroup[], today = new Date()): NextDeduction | undefined {
  const installments = projectInstallments(loan, today)
  if (installments.length === 0) return undefined
  const group = findEmployeePayrollGroup(groups, loan.employeeId)
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const run = periods
    .filter((p) => p.status !== 'finalized' && p.payDate >= todayIso && p.payDate >= loan.startDate && (!p.payrollGroupId || p.payrollGroupId === group?.id))
    .sort((a, b) => a.payDate.localeCompare(b.payDate))[0]
  return run ? { when: formatDate(run.payDate), detail: run.label } : { when: installments[0].month }
}
