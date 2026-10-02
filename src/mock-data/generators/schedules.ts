import type { Branch, Employee, ScheduleTeam, ShiftAssignment, ShiftTemplate } from '@/types/domain'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const isLeadership = (e: Employee) => /manager|supervisor|head|lead/i.test(e.employment.position)

/** Which template each department mostly follows (sample data: a mix of fixed, shifting and flexible teams). */
const DEPARTMENT_SHIFT: Record<string, 'default' | 'mid' | 'night' | 'flex'> = {
  Warehouse: 'night',
  'Customer Support': 'mid',
  Sales: 'flex',
}

/**
 * Teams: one row per branch (manager + supervisor) and one per department that has employees in it. Managers and
 * supervisors come from the position text of active employees, the same signal the branch-manager seed uses.
 */
export function generateScheduleTeams(employees: Employee[], branches: Branch[]): ScheduleTeam[] {
  const teams: ScheduleTeam[] = []
  for (const branch of branches) {
    const staff = employees.filter((e) => e.branchId === branch.id && e.employment.status === 'active')
    const leaders = staff.filter(isLeadership)
    teams.push({
      id: `${branch.id}_team_branch`,
      companyId: branch.companyId,
      branchId: branch.id,
      department: null,
      managerEmployeeId: branch.managerEmployeeId ?? leaders[0]?.id,
      supervisorEmployeeId: (leaders.find((e) => e.id !== branch.managerEmployeeId) ?? leaders[0])?.id,
      canEdit: true,
    })
    const departments = [...new Set(staff.map((e) => e.employment.department))].sort()
    departments.forEach((department, index) => {
      const members = staff.filter((e) => e.employment.department === department)
      const supervisor = members.find(isLeadership)
      teams.push({
        id: `${branch.id}_team_${department.replace(/\W+/g, '_').toLowerCase()}`,
        companyId: branch.companyId,
        branchId: branch.id,
        department,
        managerEmployeeId: branch.managerEmployeeId,
        // One department is left without its own supervisor so the fall-back to the branch is visible.
        supervisorEmployeeId: index === departments.length - 1 ? undefined : supervisor?.id,
        canEdit: true,
      })
    })
  }
  return teams
}

/**
 * Follows-this-template assignments (on the templates themselves) plus day-level overrides for a window around
 * today: shifting teams get their own template and staggered rest days. A couple of employees are left unassigned
 * so the roster shows "unscheduled" cells to fill in.
 */
export function seedRoster(employees: Employee[], templates: ShiftTemplate[], today = new Date()): ShiftAssignment[] {
  const assignments: ShiftAssignment[] = []
  const windowStart = addDays(today, -14)
  const windowEnd = addDays(today, 21)

  for (const company of [...new Set(employees.map((e) => e.companyId))]) {
    const own = templates.filter((t) => t.companyId === company)
    const byId = (suffix: string) => own.find((t) => t.id.endsWith(suffix))
    const template = { default: byId('_sched_default'), mid: byId('_shift_mid'), night: byId('_shift_night'), flex: byId('_shift_flex') }
    const staff = employees.filter((e) => e.companyId === company && e.employment.status === 'active')
    const leftUnassigned = new Set(staff.filter((e) => !isLeadership(e)).slice(-2).map((e) => e.id))

    staff.forEach((employee, index) => {
      if (leftUnassigned.has(employee.id)) return
      const kind = DEPARTMENT_SHIFT[employee.employment.department] ?? 'default'
      const base = template[kind] ?? template.default
      if (!base) return
      base.assignedEmployeeIds = [...(base.assignedEmployeeIds ?? []), employee.id]

      // Staggered rest days for the shifting teams: weekend, or Tue/Wed for part of the team.
      const restDays = kind === 'default' ? [] : index % 3 === 0 ? [2, 3] : [0, 6]
      const sixDay = kind === 'default' && index % 4 === 1
      for (let d = windowStart; d <= windowEnd; d = addDays(d, 1)) {
        const weekday = d.getDay()
        const works = kind === 'default' ? (sixDay ? weekday >= 1 && weekday <= 6 : weekday >= 1 && weekday <= 5) : !restDays.includes(weekday)
        const defaultWorks = base.daysOfWeek.includes(weekday)
        if (works === defaultWorks) continue
        assignments.push({
          id: `${employee.id}_${iso(d)}`,
          companyId: company,
          employeeId: employee.id,
          date: iso(d),
          scheduleId: works ? base.id : null,
          assignedById: 'seed',
          assignedByRole: 'company_admin',
        })
      }
    })
  }
  return assignments
}
