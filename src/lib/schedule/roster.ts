import type { Employee, LeaveRequest, ScheduleTeam, ShiftAssignment, ShiftTemplate } from '@/types/domain'

/**
 * Pure roster rules shared by the Schedules module, Attendance and Payroll. An employee's schedule on a day is:
 * 1. a day-level assignment (a specific shift, or a rest day), else
 * 2. the shift template they follow (working on its days, resting on the others), else
 * 3. unscheduled — the roster shows an empty cell; Attendance and Payroll fall back to the company default.
 * Approved leave is layered on top for display.
 */

export interface RosterContext {
  /** Already scoped to the company. */
  templates: ShiftTemplate[]
  assignments: ShiftAssignment[]
  leaves?: LeaveRequest[]
}

export type RosterKind = 'shift' | 'rest' | 'leave' | 'unscheduled'

export interface RosterCell {
  kind: RosterKind
  /** The shift worked (also kept on a leave day, for reference). */
  template?: ShiftTemplate
  assignment?: ShiftAssignment
}

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const parseIso = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))
export const addDaysIso = (iso: string, days: number) => {
  const d = parseIso(iso)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}
export const weekdayOf = (iso: string) => parseIso(iso).getDay()

/** Monday of the week containing `iso`. */
export function mondayOf(iso: string): string {
  const day = weekdayOf(iso)
  return addDaysIso(iso, day === 0 ? -6 : 1 - day)
}

/** The seven ISO dates Monday → Sunday of the week containing `anchor`. */
export function weekDates(anchor: string): string[] {
  const monday = mondayOf(anchor)
  return Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i))
}

export function datesBetween(from: string, to: string): string[] {
  const dates: string[] = []
  for (let d = from; d <= to; d = addDaysIso(d, 1)) dates.push(d)
  return dates
}

/** The company's default template: the seeded Standard Day Shift, else the first one. */
export function companyDefaultTemplate(templates: ShiftTemplate[]): ShiftTemplate | undefined {
  return templates.find((t) => t.id.endsWith('_sched_default')) ?? templates[0]
}

/** The template an employee follows on days without an individual assignment. */
export function followedTemplate(employeeId: string, templates: ShiftTemplate[]): ShiftTemplate | undefined {
  return templates.find((t) => t.assignedEmployeeIds?.includes(employeeId))
}

export function assignmentFor(employeeId: string, date: string, ctx: RosterContext): ShiftAssignment | undefined {
  return ctx.assignments.find((a) => a.employeeId === employeeId && a.date === date)
}

export function onLeave(employeeId: string, date: string, leaves: LeaveRequest[] = []): boolean {
  return leaves.some((l) => l.employeeId === employeeId && l.status === 'approved' && l.dateFrom <= date && l.dateTo >= date && l.dayPortion !== 'half_am' && l.dayPortion !== 'half_pm')
}

export function cellFor(employeeId: string, date: string, ctx: RosterContext): RosterCell {
  const assignment = assignmentFor(employeeId, date, ctx)
  let cell: RosterCell
  if (assignment) {
    const template = assignment.scheduleId ? ctx.templates.find((t) => t.id === assignment.scheduleId) : undefined
    cell = assignment.scheduleId === null || !template ? { kind: 'rest', assignment } : { kind: 'shift', template, assignment }
  } else {
    const template = followedTemplate(employeeId, ctx.templates)
    if (!template) cell = { kind: 'unscheduled' }
    else cell = template.daysOfWeek.includes(weekdayOf(date)) ? { kind: 'shift', template } : { kind: 'rest', template }
  }
  if (cell.kind !== 'unscheduled' && onLeave(employeeId, date, ctx.leaves)) return { ...cell, kind: 'leave' }
  return cell
}

/**
 * What Attendance should measure a day against: the shift scheduled that day, or `restDay: true` when the
 * employee is off. Unscheduled employees fall back to the company default template and its working days.
 */
export function shiftForDay(employeeId: string, date: string, ctx: RosterContext): { template?: ShiftTemplate; restDay: boolean } {
  const cell = cellFor(employeeId, date, { ...ctx, leaves: [] })
  if (cell.kind === 'shift') return { template: cell.template, restDay: false }
  if (cell.kind === 'rest') return { restDay: true }
  const fallback = companyDefaultTemplate(ctx.templates)
  return { template: fallback, restDay: !!fallback && !fallback.daysOfWeek.includes(weekdayOf(date)) }
}

/** The template used for pay-frequency math (working days per month): the one the employee follows, else the company default. */
export function payrollTemplateFor(employeeId: string, templates: ShiftTemplate[]): ShiftTemplate | undefined {
  return followedTemplate(employeeId, templates) ?? companyDefaultTemplate(templates)
}

export interface SchedulerInfo {
  /** Employee id of whoever decides this employee's shifts; undefined means the company admin. */
  employeeId?: string
  level: 'department' | 'branch' | 'admin'
  team?: ScheduleTeam
}

/** Delegation chain: department supervisor → branch supervisor → company admin. Teams with editing off go straight to the admin. */
export function schedulerFor(employee: Employee, teams: ScheduleTeam[]): SchedulerInfo {
  const department = teams.find((t) => t.branchId === employee.branchId && t.department === employee.employment.department)
  if (department?.canEdit && department.supervisorEmployeeId) return { employeeId: department.supervisorEmployeeId, level: 'department', team: department }
  const branch = teams.find((t) => t.branchId === employee.branchId && t.department === null)
  if (branch?.canEdit && branch.supervisorEmployeeId) return { employeeId: branch.supervisorEmployeeId, level: 'branch', team: branch }
  return { level: 'admin' }
}

export function hoursFor(template: Pick<ShiftTemplate, 'startTime' | 'endTime' | 'breakMinutes'>): number {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  let minutes = toMin(template.endTime) - toMin(template.startTime)
  if (minutes <= 0) minutes += 24 * 60
  return Math.round(((minutes - (template.breakMinutes ?? 0)) / 60) * 10) / 10
}

/** "9a–6p", "10p–6a" style label for roster chips. */
export function shortTimeRange(template: Pick<ShiftTemplate, 'startTime' | 'endTime'>): string {
  const fmt = (t: string) => {
    const h = Number(t.slice(0, 2))
    const m = t.slice(3, 5)
    const suffix = h >= 12 ? 'p' : 'a'
    const hour = h % 12 === 0 ? 12 : h % 12
    return `${hour}${m === '00' ? '' : `:${m}`}${suffix}`
  }
  return `${fmt(template.startTime)}–${fmt(template.endTime)}`
}
