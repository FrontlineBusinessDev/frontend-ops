import type { Employee, EmployeeCategory, PayrollGroup } from '@/types/domain'

export const CATEGORY_LABEL: Record<EmployeeCategory, string> = {
  regular: 'Regular Employee',
  admin_staff: 'Admin Staff',
  production_worker: 'Production Worker',
  field_worker: 'Field Worker',
  contractor: 'Contractor',
}

export function categoryLabel(category: EmployeeCategory): string {
  return CATEGORY_LABEL[category] ?? category
}

export function findEmployeePayrollGroup(groups: PayrollGroup[], employeeId: string): PayrollGroup | undefined {
  return groups.find((g) => g.employeeIds.includes(employeeId))
}

/** Keywords that hint a category is relevant to a Payroll Group's name/description — a suggestion signal only, never a restriction. */
const CATEGORY_KEYWORDS: Record<EmployeeCategory, string[]> = {
  admin_staff: ['admin', 'accounting', 'hr', 'office', 'finance', 'administrative'],
  production_worker: ['production', 'machine', 'factory', 'plant', 'operator'],
  field_worker: ['field', 'delivery', 'driver', 'sales', 'support'],
  contractor: ['contract', 'project'],
  regular: [],
}

export function isSuggestedForGroup(employee: Employee, group: PayrollGroup): boolean {
  const haystack = `${group.name} ${group.description ?? ''}`.toLowerCase()
  const keywords = CATEGORY_KEYWORDS[employee.employment.category] ?? []
  if (keywords.some((k) => haystack.includes(k))) return true

  const words = `${employee.employment.position} ${employee.employment.department}`
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
  return words.some((w) => haystack.includes(w))
}

function mode<T>(values: T[]): T | undefined {
  if (values.length === 0) return undefined
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/** The most common branch/department/position among a group's current members — used to power "Same Branch/Department/Position" quick filters. */
export function referenceProfile(group: PayrollGroup, employees: Employee[]) {
  const members = employees.filter((e) => group.employeeIds.includes(e.id))
  return {
    branchId: mode(members.map((e) => e.branchId)),
    department: mode(members.map((e) => e.employment.department)),
    position: mode(members.map((e) => e.employment.position)),
  }
}
