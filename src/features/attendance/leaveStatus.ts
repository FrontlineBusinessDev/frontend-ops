import type { AttendanceStatus, Employee, LeaveDayPortion, LeaveRequest, ShiftTemplate } from '@/types/domain'

/*
 * Leave-aware attendance status (Company Admin portal).
 *
 * An approved leave covering a day takes priority over "Absent": the day shows "On Leave" (or
 * "On Leave – Half Day (AM/PM)") instead of being treated as a missing punch. The stored attendance
 * record is left untouched — this is resolved when attendance is displayed or imported, so approving
 * or cancelling a leave later is reflected immediately, and payroll keeps its own paid/unpaid leave rules.
 *
 * Conflict rule — an employee on approved leave who still punches:
 *  - Full-day leave: the leave status is RETAINED, the punches are kept for audit, and the day is
 *    flagged for review (either the leave should be cancelled or the punches are wrong).
 *  - Half-day leave: punches are expected for the working half. The day shows "On Leave – Half Day" and is
 *    checked against that half only (late / early out / no punches for the half → review flag).
 */

export type LeaveAwareStatus = AttendanceStatus | 'on_leave' | 'on_leave_half_day'

export interface ApprovedLeave {
  request: LeaveRequest
  typeName: string
  isPaid: boolean
}

export interface LeaveResolution {
  status: LeaveAwareStatus
  /** "On Leave", "On Leave – Half Day (AM)". */
  label: string
  /** e.g. "Vacation Leave · paid". */
  leaveLabel: string
  /** Set when the day needs an admin's attention. */
  review?: string
  /** Extra context shown under the status. */
  detail?: string
}

export const PORTION_LABEL: Record<LeaveDayPortion, string> = {
  full: 'Full Day',
  half_am: 'Half Day (AM)',
  half_pm: 'Half Day (PM)',
}

/** The approved leave covering `date` for an employee (full-day wins over half-day if both exist). */
export function approvedLeaveOn(leaves: ApprovedLeave[], employeeId: string, date: string): ApprovedLeave | undefined {
  const covering = leaves.filter((l) => l.request.employeeId === employeeId && l.request.status === 'approved' && l.request.dateFrom <= date && l.request.dateTo >= date)
  return covering.find((l) => (l.request.dayPortion ?? 'full') === 'full') ?? covering[0]
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** Midpoint of the shift (rounded to 30 minutes) — where a half-day leave ends or begins. */
export function shiftMidpoint(startTime: string, endTime: string): string {
  const mid = (toMinutes(startTime) + toMinutes(endTime)) / 2
  return fromMinutes(Math.round(mid / 30) * 30)
}

/**
 * Resolves the day's status for an employee on approved leave. Returns undefined when no approved leave
 * applies — the punch-based status (present / late / undertime / absent) stands.
 */
export function resolveLeaveStatus(
  punches: { timeIn: string | null; timeOut: string | null } | undefined,
  leave: ApprovedLeave | undefined,
  schedule: { startTime: string; endTime: string; gracePeriodMinutes?: number },
): LeaveResolution | undefined {
  if (!leave) return undefined
  const portion = leave.request.dayPortion ?? 'full'
  const leaveLabel = `${leave.typeName} · ${leave.isPaid ? 'paid' : 'unpaid'}`
  const timeIn = punches?.timeIn ?? null
  const timeOut = punches?.timeOut ?? null
  const hasPunch = !!timeIn || !!timeOut
  const grace = schedule.gracePeriodMinutes ?? 0

  if (portion === 'full') {
    return hasPunch
      ? {
          status: 'on_leave',
          label: 'On Leave',
          leaveLabel,
          review: `Punched ${timeIn ?? '—'}–${timeOut ?? '—'} while on approved full-day leave — confirm the leave or the punches`,
          detail: 'Leave status kept; punches recorded for audit',
        }
      : { status: 'on_leave', label: 'On Leave', leaveLabel, detail: 'Approved leave — not marked absent' }
  }

  const mid = shiftMidpoint(schedule.startTime, schedule.endTime)
  const half = portion === 'half_am' ? 'AM' : 'PM'
  const label = `On Leave – Half Day (${half})`
  // The half the employee is expected to work.
  const workStart = portion === 'half_am' ? mid : schedule.startTime
  const workEnd = portion === 'half_am' ? schedule.endTime : mid
  const workingHalf = portion === 'half_am' ? 'afternoon' : 'morning'

  if (!hasPunch) {
    return { status: 'on_leave_half_day', label, leaveLabel, review: `No punches for the ${workingHalf} half (${workStart}–${workEnd}) — possible half-day absence` }
  }

  const problems: string[] = []
  // Punches well inside the leave half mean the employee worked through their leave.
  if (portion === 'half_am' && timeIn && toMinutes(timeIn) < toMinutes(mid) - 60) problems.push(`punched in at ${timeIn}, during the AM leave half — confirm the leave`)
  if (portion === 'half_pm' && timeOut && toMinutes(timeOut) > toMinutes(mid) + 60) problems.push(`punched out at ${timeOut}, during the PM leave half — confirm the leave`)
  if (timeIn && toMinutes(timeIn) > toMinutes(workStart) + grace) problems.push(`late for the ${workingHalf} half (expected ${workStart})`)
  // Leaving at lunch on a PM half-day is normal — allow up to an hour before the half-day boundary.
  const earlyOutAllowance = portion === 'half_pm' ? 60 : 0
  if (timeOut && toMinutes(timeOut) < toMinutes(workEnd) - earlyOutAllowance) problems.push(`left before ${workEnd}`)
  if (!timeOut && portion === 'half_am') problems.push('no check-out')
  return {
    status: 'on_leave_half_day',
    label,
    leaveLabel,
    detail: `Worked ${timeIn ?? '—'}–${timeOut ?? (portion === 'half_pm' ? 'midday' : '—')} for the ${workingHalf} half`,
    review: problems.length ? `${problems.join('; ')}`.replace(/^./, (c) => c.toUpperCase()) : undefined,
  }
}

export interface ImportLeaveContext {
  /** Leave resolution for each imported day (key = employeeId|date). */
  byKey: Map<string, LeaveResolution>
  /** Employees on approved leave on the file's dates who have no punches in it — shown as On Leave, never Absent. */
  leaveOnly: { key: string; employee: Employee; date: string; resolution: LeaveResolution }[]
}

/** Matches imported daily records against approved leaves for the same dates. */
export function annotateImportWithLeaves(
  records: { key: string; employeeId: string; date: string; timeIn: string | null; timeOut: string | null }[],
  leaves: ApprovedLeave[],
  employees: Employee[],
  schedules: Pick<ShiftTemplate, 'id' | 'startTime' | 'endTime' | 'gracePeriodMinutes' | 'assignedEmployeeIds'>[],
): ImportLeaveContext {
  const scheduleFor = (employeeId: string) => schedules.find((s) => s.assignedEmployeeIds?.includes(employeeId)) ?? schedules[0] ?? { startTime: '09:00', endTime: '18:00' }
  const byKey = new Map<string, LeaveResolution>()
  for (const r of records) {
    const resolution = resolveLeaveStatus(r, approvedLeaveOn(leaves, r.employeeId, r.date), scheduleFor(r.employeeId))
    if (resolution) byKey.set(r.key, resolution)
  }
  const keys = new Set(records.map((r) => r.key))
  const dates = [...new Set(records.map((r) => r.date))].sort()
  const leaveOnly: ImportLeaveContext['leaveOnly'] = []
  for (const date of dates) {
    for (const employee of employees) {
      if (employee.employment.status !== 'active' || keys.has(`${employee.id}|${date}`)) continue
      const resolution = resolveLeaveStatus(undefined, approvedLeaveOn(leaves, employee.id, date), scheduleFor(employee.id))
      if (resolution) leaveOnly.push({ key: `${employee.id}|${date}`, employee, date, resolution })
    }
  }
  return { byKey, leaveOnly }
}
