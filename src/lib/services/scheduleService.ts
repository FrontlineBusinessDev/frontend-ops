import { addDaysIso, cellFor, datesBetween, mondayOf, weekdayOf, type RosterContext } from '@/lib/schedule/roster'
import { db } from '@/mock-data'
import type { ScheduleTeam, SessionUser, ShiftAssignment, ShiftTemplate } from '@/types/domain'

/** Mock-backed; same async signatures a real API would keep. Everything is scoped to the session's company. */

export async function getShiftTemplates(session: SessionUser): Promise<ShiftTemplate[]> {
  return db.shiftTemplates.filter((t) => t.companyId === session.companyId)
}

export type ShiftTemplateInput = Omit<ShiftTemplate, 'id' | 'companyId' | 'assignedEmployeeIds'>

export async function createShiftTemplate(session: SessionUser, input: ShiftTemplateInput): Promise<ShiftTemplate> {
  const template: ShiftTemplate = { id: `${session.companyId}_shift_${crypto.randomUUID().slice(0, 8)}`, companyId: session.companyId, assignedEmployeeIds: [], ...input }
  db.shiftTemplates.push(template)
  return template
}

export async function updateShiftTemplate(session: SessionUser, templateId: string, updates: Partial<ShiftTemplateInput>): Promise<void> {
  const template = db.shiftTemplates.find((t) => t.id === templateId && t.companyId === session.companyId)
  if (template) Object.assign(template, updates)
}

/** Removes a template; people who followed it become unscheduled and day assignments that used it are cleared. The company default can't be deleted. */
export async function deleteShiftTemplate(session: SessionUser, templateId: string): Promise<boolean> {
  if (templateId.endsWith('_sched_default')) return false
  const index = db.shiftTemplates.findIndex((t) => t.id === templateId && t.companyId === session.companyId)
  if (index < 0) return false
  db.shiftTemplates.splice(index, 1)
  for (let i = db.shiftAssignments.length - 1; i >= 0; i--) if (db.shiftAssignments[i].scheduleId === templateId) db.shiftAssignments.splice(i, 1)
  return true
}

/** Sets who follows a template. Each employee follows at most one, so they're removed from the others. */
export async function setTemplateEmployees(session: SessionUser, templateId: string, employeeIds: string[]): Promise<void> {
  const own = db.shiftTemplates.filter((t) => t.companyId === session.companyId)
  const chosen = new Set(employeeIds)
  for (const t of own) {
    t.assignedEmployeeIds = (t.assignedEmployeeIds ?? []).filter((id) => !chosen.has(id) || t.id === templateId)
    if (t.id === templateId) t.assignedEmployeeIds = [...chosen]
  }
}

export async function getRosterContext(session: SessionUser, from: string, to: string): Promise<RosterContext> {
  return {
    templates: await getShiftTemplates(session),
    assignments: db.shiftAssignments.filter((a) => a.companyId === session.companyId && a.date >= from && a.date <= to),
    leaves: db.leaveRequests.filter((l) => l.companyId === session.companyId && l.dateTo >= from && l.dateFrom <= to),
  }
}

/** A weekday → shift pattern: a template id, `null` for a rest day, or absent to leave that weekday untouched. */
export type WeekdayPattern = Partial<Record<number, string | null>>

export interface AssignShiftInput {
  employeeIds: string[]
  /** Apply one shift (id) or rest day (null) to every date in the range / list… */
  scheduleId?: string | null
  /** …or a different outcome per weekday. */
  pattern?: WeekdayPattern
  /** Either an explicit list of dates, or an inclusive range. */
  dates?: string[]
  from?: string
  to?: string
}

/** Writes day-level assignments (replacing any existing ones for those days). Returns how many days were written. */
export async function assignShift(session: SessionUser, input: AssignShiftInput): Promise<number> {
  const dates = input.dates ?? (input.from && input.to ? datesBetween(input.from, input.to) : [])
  const inCompany = new Set(db.employees.filter((e) => e.companyId === session.companyId).map((e) => e.id))
  let written = 0
  for (const employeeId of input.employeeIds) {
    if (!inCompany.has(employeeId)) continue
    for (const date of dates) {
      let scheduleId: string | null | undefined
      if (input.pattern) scheduleId = input.pattern[weekdayOf(date)]
      else scheduleId = input.scheduleId
      if (scheduleId === undefined) continue
      const existing = db.shiftAssignments.findIndex((a) => a.employeeId === employeeId && a.date === date)
      const record: ShiftAssignment = {
        id: `${employeeId}_${date}`,
        companyId: session.companyId,
        employeeId,
        date,
        scheduleId,
        assignedById: session.id,
        assignedByRole: session.role,
      }
      if (existing >= 0) db.shiftAssignments[existing] = record
      else db.shiftAssignments.push(record)
      written++
    }
  }
  return written
}

/** Removes day-level assignments so those days go back to the employee's template. */
export async function clearAssignments(session: SessionUser, employeeIds: string[], from: string, to: string): Promise<void> {
  const ids = new Set(employeeIds)
  for (let i = db.shiftAssignments.length - 1; i >= 0; i--) {
    const a = db.shiftAssignments[i]
    if (a.companyId === session.companyId && ids.has(a.employeeId) && a.date >= from && a.date <= to) db.shiftAssignments.splice(i, 1)
  }
}

/** Copies one week's resolved schedule onto another (day-level assignments for each employee), keeping the same weekdays. */
export async function copyWeek(session: SessionUser, fromAnchor: string, toAnchor: string, employeeIds: string[]): Promise<number> {
  const fromMonday = mondayOf(fromAnchor)
  const toMonday = mondayOf(toAnchor)
  const ctx = await getRosterContext(session, fromMonday, addDaysIso(fromMonday, 6))
  let written = 0
  for (const employeeId of employeeIds) {
    for (let i = 0; i < 7; i++) {
      const cell = cellFor(employeeId, addDaysIso(fromMonday, i), { ...ctx, leaves: [] })
      if (cell.kind === 'unscheduled') continue
      written += await assignShift(session, { employeeIds: [employeeId], scheduleId: cell.kind === 'shift' ? cell.template!.id : null, dates: [addDaysIso(toMonday, i)] })
    }
  }
  return written
}

/** Teams for the company, creating any missing branch/department rows so newly added departments show up. */
export async function getScheduleTeams(session: SessionUser): Promise<ScheduleTeam[]> {
  const branches = db.branches.filter((b) => b.companyId === session.companyId)
  for (const branch of branches) {
    if (!db.scheduleTeams.some((t) => t.branchId === branch.id && t.department === null)) {
      db.scheduleTeams.push({ id: `${branch.id}_team_branch`, companyId: branch.companyId, branchId: branch.id, department: null, managerEmployeeId: branch.managerEmployeeId, canEdit: true })
    }
    const departments = new Set(db.employees.filter((e) => e.branchId === branch.id && e.employment.status === 'active').map((e) => e.employment.department))
    for (const department of departments) {
      if (!db.scheduleTeams.some((t) => t.branchId === branch.id && t.department === department)) {
        db.scheduleTeams.push({ id: `${branch.id}_team_${department.replace(/\W+/g, '_').toLowerCase()}`, companyId: branch.companyId, branchId: branch.id, department, canEdit: true })
      }
    }
  }
  return db.scheduleTeams.filter((t) => t.companyId === session.companyId)
}

export async function updateScheduleTeam(
  session: SessionUser,
  teamId: string,
  updates: Partial<Pick<ScheduleTeam, 'managerEmployeeId' | 'supervisorEmployeeId' | 'canEdit'>>,
): Promise<void> {
  const team = db.scheduleTeams.find((t) => t.id === teamId && t.companyId === session.companyId)
  if (!team) return
  Object.assign(team, updates)
  // Keep the branch record's manager in step with the branch-level team row.
  if (team.department === null && 'managerEmployeeId' in updates) {
    const branch = db.branches.find((b) => b.id === team.branchId)
    if (branch) branch.managerEmployeeId = updates.managerEmployeeId
  }
}
