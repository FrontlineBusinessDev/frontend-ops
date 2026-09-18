import type { Employee, HierarchyLevel } from '@/types/domain'

export const HIERARCHY_LABEL: Record<HierarchyLevel, string> = {
  executive: 'Executive / C-Suite',
  managerial: 'Managerial / Supervisory',
  rank_and_file: 'Rank & File / Operational',
}

export const HIERARCHY_LEVELS: HierarchyLevel[] = ['executive', 'managerial', 'rank_and_file']

/**
 * The app doesn't model a dedicated hierarchy field yet, so this derives a stable
 * tier from the employee's position title — good enough for filtering and tiered
 * credit summaries. Swap for a real `Employee.hierarchyLevel` field if formal
 * hierarchy management becomes its own feature.
 */
export function getEmployeeHierarchyLevel(employee: Employee): HierarchyLevel {
  const position = employee.employment.position
  if (position === 'Manager') return 'executive'
  if (position === 'Supervisor' || position === 'Team Lead') return 'managerial'
  return 'rank_and_file'
}
