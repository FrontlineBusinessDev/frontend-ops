import type { Employee } from '@/types/domain'

/**
 * The app doesn't model shift "groups" as their own entity yet, so this derives a
 * stable, deterministic group label per employee for filtering/display purposes only.
 * Swap for a real `Employee.groupId` field if group management becomes a real feature.
 */
export const GROUP_OPTIONS = ['Shift A', 'Night Shift', 'Executive Group'] as const

export function getEmployeeGroup(employee: Employee): string {
  const seed = employee.employeeNumber.split('-')[1] ?? employee.id
  const numeric = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  if (employee.employment.position === 'Manager' || employee.employment.position === 'Supervisor') {
    return numeric % 2 === 0 ? 'Executive Group' : GROUP_OPTIONS[numeric % GROUP_OPTIONS.length]
  }
  return GROUP_OPTIONS[numeric % GROUP_OPTIONS.length]
}
