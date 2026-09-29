import { monthlyEquivalentFor } from '@/lib/payroll/rateBasis'
import type { BonusIncentive, BonusPayoutMode, Employee } from '@/types/domain'

export const BONUS_PAYOUT_MODE_LABEL: Record<BonusPayoutMode, string> = {
  regular_payroll: 'Include in Regular Payroll Run',
  separate_payslip: 'Generate Separate Payslip',
}

export function bonusPayoutMode(bonus: BonusIncentive): BonusPayoutMode {
  return bonus.payoutMode ?? 'regular_payroll'
}

/** Only bonuses set to "Include in Regular Payroll Run" are added to the standard payroll payslip; separate-payslip bonuses are paid on their own. */
export function includedInRegularPayroll(bonus: BonusIncentive): boolean {
  return bonusPayoutMode(bonus) === 'regular_payroll'
}

/** Whether `bonus`'s target (a specific employee, a department, or the whole company) covers `employee`. */
export function bonusAppliesToEmployee(bonus: BonusIncentive, employee: Employee): boolean {
  if (bonus.targetType === 'company') return true
  if (bonus.targetType === 'department') return employee.employment.department === bonus.targetDepartment
  return employee.id === bonus.targetEmployeeId
}

/** Resolves a bonus's configured amount/rate into a peso figure for one specific employee. */
export function bonusAmountFor(bonus: BonusIncentive, employee: Employee): number {
  if (bonus.bonusType === 'percentage') return Math.round(monthlyEquivalentFor(employee) * (bonus.amount / 100))
  return bonus.amount
}

/** Every currently-active employee a bonus's target rule reaches. */
export function resolveBonusRecipients(bonus: BonusIncentive, employees: Employee[]): Employee[] {
  return employees.filter((e) => e.employment.status === 'active' && bonusAppliesToEmployee(bonus, e))
}
