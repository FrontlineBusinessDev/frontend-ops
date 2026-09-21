import { monthlyEquivalentFor } from '@/lib/payroll/rateBasis'
import type { BonusIncentive, Employee } from '@/types/domain'

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
