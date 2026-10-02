import type { DailyImportRecord } from '@/features/attendance/biometricsImport'
import { addDaysIso, cellFor, datesBetween, type RosterContext, type RosterKind } from '@/lib/schedule/roster'
import type { Employee, ShiftTemplate } from '@/types/domain'

/**
 * Schedule-based biometrics import: every (employee, date) the roster expects work on is matched against the
 * punches in the file, so the review shows what was scheduled next to what the terminal recorded.
 */

export type MatchFlag =
  | 'on_time'
  | 'late'
  | 'undertime'
  | 'missing_in'
  | 'missing_out'
  | 'absent'
  | 'rest_day_punch'
  | 'unscheduled_punch'
  | 'leave'
  | 'leave_punch'

export const FLAG_META: Record<MatchFlag, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'brand'; needsReview: boolean }> = {
  on_time: { label: 'On time', tone: 'success', needsReview: false },
  late: { label: 'Late', tone: 'warning', needsReview: false },
  undertime: { label: 'Undertime', tone: 'warning', needsReview: false },
  missing_in: { label: 'Missing time-in', tone: 'danger', needsReview: true },
  missing_out: { label: 'Missing time-out', tone: 'danger', needsReview: true },
  absent: { label: 'No punch', tone: 'danger', needsReview: true },
  rest_day_punch: { label: 'Punch on rest day', tone: 'warning', needsReview: true },
  unscheduled_punch: { label: 'Not scheduled', tone: 'warning', needsReview: true },
  leave: { label: 'On leave', tone: 'brand', needsReview: false },
  leave_punch: { label: 'Punch while on leave', tone: 'warning', needsReview: true },
}

export interface MatchRow {
  key: string
  employee: Employee
  date: string
  kind: RosterKind
  template?: ShiftTemplate
  /** Times as read from the file (before any edit). */
  timeIn: string | null
  timeOut: string | null
  source?: DailyImportRecord
}

export interface MatchResult {
  rows: MatchRow[]
  /** File records not shown (outside the date range, other departments/schedules, unmapped IDs), and range days the file has no punches for at all. */
  excluded: { outsideRange: number; outsideFilter: number; unmapped: number; uncoveredDays: number }
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const isOvernight = (t: Pick<ShiftTemplate, 'startTime' | 'endTime'>) => toMin(t.endTime) <= toMin(t.startTime)

/** Flags for one row given its (possibly edited) times. */
export function evaluateRow(kind: RosterKind, template: ShiftTemplate | undefined, timeIn: string | null, timeOut: string | null): MatchFlag[] {
  const hasPunch = Boolean(timeIn || timeOut)
  if (kind === 'leave') return hasPunch ? ['leave', 'leave_punch'] : ['leave']
  if (kind === 'rest') return hasPunch ? ['rest_day_punch'] : []
  if (kind === 'unscheduled') return hasPunch ? ['unscheduled_punch'] : []
  if (!template) return []

  if (!hasPunch) return ['absent']
  const flags: MatchFlag[] = []
  if (!timeIn) flags.push('missing_in')
  if (!timeOut) flags.push('missing_out')
  const overnight = isOvernight(template)
  const start = toMin(template.startTime)
  const end = toMin(template.endTime)
  const grace = template.gracePeriodMinutes ?? 0
  if (timeIn) {
    const t = toMin(timeIn)
    const adjusted = overnight && t < 12 * 60 ? t + 1440 : t
    if (adjusted > start + grace) flags.push('late')
  }
  if (timeOut) {
    const t = toMin(timeOut)
    const short = overnight ? t < 12 * 60 && t < end : t < end
    if (short) flags.push('undertime')
  }
  if (!flags.includes('late') && !flags.includes('undertime') && !flags.includes('missing_in') && !flags.includes('missing_out')) flags.push('on_time')
  return flags
}

export const needsReview = (flags: MatchFlag[]) => flags.some((f) => FLAG_META[f].needsReview)

export interface MatchOptions {
  records: DailyImportRecord[]
  employees: Employee[]
  /** Roster context covering the range plus a day either side (overnight shifts). */
  roster: RosterContext
  from: string
  to: string
  department: string
  /** A shift template id, or 'all'. */
  templateId: string
}

export function buildScheduleMatch({ records, employees, roster, from, to, department, templateId }: MatchOptions): MatchResult {
  const byKey = new Map(records.map((r) => [`${r.employeeId}|${r.date}`, r]))
  const excluded = { outsideRange: 0, outsideFilter: 0, unmapped: 0, uncoveredDays: 0 }
  // A day with no punches from anyone isn't in this file (e.g. a week range with a 2-day export) — don't call everyone absent.
  const covered = new Set(records.filter((r) => r.action !== 'skip').map((r) => r.date))
  excluded.uncoveredDays = datesBetween(from, to).filter((d) => !covered.has(d)).length
  const consumed = new Set<string>()
  const rows: MatchRow[] = []

  const inScope = employees.filter((e) => e.employment.status === 'active' && (department === 'all' || e.employment.department === department))
  const scopeIds = new Set(inScope.map((e) => e.id))

  for (const employee of inScope) {
    for (const date of datesBetween(from, to)) {
      const cell = cellFor(employee.id, date, roster)
      const key = `${employee.id}|${date}`
      const own = byKey.get(key)
      if (cell.kind === 'shift' && templateId !== 'all' && cell.template?.id !== templateId) continue
      if (cell.kind !== 'shift' && templateId !== 'all') continue

      let timeIn = own?.timeIn ?? null
      let timeOut = own?.timeOut ?? null
      let source = own

      if (cell.kind === 'shift' && cell.template && isOvernight(cell.template)) {
        // Overnight shift: clock-in is the evening punch on this date, clock-out the morning punch on the next.
        const start = toMin(cell.template.startTime)
        const evening = own ? (own.timeOut ?? own.timeIn) : null
        timeIn = evening && toMin(evening) >= start - 180 ? evening : null
        const next = byKey.get(`${employee.id}|${addDaysIso(date, 1)}`)
        if (next?.timeIn && toMin(next.timeIn) <= toMin(cell.template.endTime) + 180) {
          timeOut = next.timeIn
          consumed.add(`${employee.id}|${addDaysIso(date, 1)}`)
        } else timeOut = null
        source = own ?? next
      } else if (own && !own.timeOut) {
        // A lone morning punch right after an overnight shift is that shift's clock-out, not a new day.
        const prev = cellFor(employee.id, addDaysIso(date, -1), roster)
        if (prev.kind === 'shift' && prev.template && isOvernight(prev.template) && own.timeIn && toMin(own.timeIn) <= toMin(prev.template.endTime) + 180) {
          if (consumed.has(key) || cell.kind !== 'shift') {
            timeIn = null
            timeOut = null
            source = undefined
          }
        }
      }

      if (!timeIn && !timeOut && !covered.has(date)) continue

      // Rest days / leave days / unscheduled days with no punch aren't worth a row.
      if (cell.kind !== 'shift' && !timeIn && !timeOut) {
        if (cell.kind === 'leave') rows.push({ key, employee, date, kind: cell.kind, template: cell.template, timeIn: null, timeOut: null })
        continue
      }
      rows.push({ key, employee, date, kind: cell.kind, template: cell.template, timeIn, timeOut, source })
    }
  }

  for (const r of records) {
    if (r.action === 'skip' || !r.employeeId) {
      excluded.unmapped++
    } else if (r.date < from || r.date > to) excluded.outsideRange++
    else if (!scopeIds.has(r.employeeId)) excluded.outsideFilter++
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || `${a.employee.personal.lastName}${a.employee.personal.firstName}`.localeCompare(`${b.employee.personal.lastName}${b.employee.personal.firstName}`))
  return { rows, excluded }
}

/** Reviewer changes to a row before applying: corrected punch times, or leaving the row out. */
export interface RowEdit {
  timeIn?: string | null
  timeOut?: string | null
  include?: boolean
}

export interface EffectiveRow extends MatchRow {
  effectiveIn: string | null
  effectiveOut: string | null
  flags: MatchFlag[]
  include: boolean
  edited: boolean
}

export function effectiveRow(row: MatchRow, edit: RowEdit | undefined): EffectiveRow {
  const effectiveIn = edit?.timeIn !== undefined ? edit.timeIn : row.timeIn
  const effectiveOut = edit?.timeOut !== undefined ? edit.timeOut : row.timeOut
  const flags = evaluateRow(row.kind, row.template, effectiveIn, effectiveOut)
  const include = edit?.include ?? (Boolean(effectiveIn) && row.kind !== 'leave')
  const edited = (edit?.timeIn !== undefined && edit.timeIn !== row.timeIn) || (edit?.timeOut !== undefined && edit.timeOut !== row.timeOut)
  return { ...row, effectiveIn, effectiveOut, flags, include, edited }
}
