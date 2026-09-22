import { getOtRateById } from '@/features/company-settings/payrollRatesStore'
import { getEmployees } from '@/lib/services/employeeService'
import { db } from '@/mock-data'
import type { ApprovalStatus, Employee, OvertimeRecord, OvertimeType, SessionUser } from '@/types/domain'

async function scopedEmployeeIds(session: SessionUser): Promise<Set<string>> {
  const employees = await getEmployees(session)
  return new Set(employees.map((e) => e.id))
}

export async function getOvertimeRecords(session: SessionUser): Promise<OvertimeRecord[]> {
  const employeeIds = await scopedEmployeeIds(session)
  return db.overtimeRecords
    .filter((r) => r.companyId === session.companyId && employeeIds.has(r.employeeId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.requestedAt.localeCompare(a.requestedAt))
}

export interface CreateOvertimeInput {
  employeeId: string
  date: string
  startTime: string
  endTime: string
  type: OvertimeType
  reason?: string
}

/** Fallback only for the (practically unreachable) case the shared Payroll Settings rate store
 * doesn't have an entry for a standard type — the store is always seeded with these ids. */
const FALLBACK_MULTIPLIER_BY_TYPE: Record<OvertimeType, number> = {
  regular: 1.25,
  night_diff: 1.1,
  rest_day_holiday: 1.3,
}

/** Reads live from Company & Payroll Settings > Overtime & Holiday Rates, so an admin's rate edits
 * immediately apply to newly filed overtime records. */
function multiplierForType(type: OvertimeType): number {
  return getOtRateById(type)?.multiplier ?? FALLBACK_MULTIPLIER_BY_TYPE[type]
}

function computeHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  let minutes = endH * 60 + endM - (startH * 60 + startM)
  if (minutes <= 0) minutes += 24 * 60 // shift crosses midnight (night differential)
  return Math.round((minutes / 60) * 10) / 10
}

export async function createOvertimeRecord(session: SessionUser, input: CreateOvertimeInput): Promise<OvertimeRecord> {
  const record: OvertimeRecord = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    employeeId: input.employeeId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    hours: computeHours(input.startTime, input.endTime),
    type: input.type,
    multiplier: multiplierForType(input.type),
    status: 'pending',
    reason: input.reason,
    requestedAt: new Date().toISOString(),
  }
  db.overtimeRecords.unshift(record)
  return record
}

export async function decideOvertimeRecord(
  session: SessionUser,
  recordId: string,
  decision: Extract<ApprovalStatus, 'approved' | 'rejected'>,
): Promise<void> {
  const record = db.overtimeRecords.find((r) => r.id === recordId && r.companyId === session.companyId)
  if (!record) return

  record.status = decision
  record.decidedBy = session.name
  record.decidedAt = new Date().toISOString()
}

function estimateHourlyRate(employee: Employee): number {
  const workingDaysPerMonth = 22
  const hoursPerDay = 8
  return employee.compensation.basicPay / (workingDaysPerMonth * hoursPerDay)
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function isWithin(dateKey: string, from: Date, to: Date): boolean {
  const date = new Date(dateKey)
  return date >= from && date <= to
}

export interface OvertimeSummary {
  pendingCount: number
  pendingOvertimeCount: number
  pendingNightDiffCount: number
  totalOvertimeHours: number
  overtimeHoursChangePct: number | null
  nightDiffHours: number
  activeNightShiftWorkers: number
  estimatedCost: number
}

/** Metric cards on the Overtime & Night Differential module. "Current period" is approximated as the trailing 15 days (payroll periods are created ad hoc and may not exist yet). */
export async function getOvertimeSummary(session: SessionUser): Promise<OvertimeSummary> {
  const [records, employees] = await Promise.all([getOvertimeRecords(session), getEmployees(session)])
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const now = new Date()
  const currentFrom = daysAgo(15)
  const previousFrom = daysAgo(30)
  const previousTo = daysAgo(16)

  const currentRecords = records.filter((r) => isWithin(r.date, currentFrom, now))
  const previousRecords = records.filter((r) => isWithin(r.date, previousFrom, previousTo))

  const isOvertimeType = (t: OvertimeType) => t === 'regular' || t === 'rest_day_holiday'

  const pendingRecords = currentRecords.filter((r) => r.status === 'pending')
  const pendingOvertimeCount = pendingRecords.filter((r) => isOvertimeType(r.type)).length
  const pendingNightDiffCount = pendingRecords.filter((r) => r.type === 'night_diff').length

  const currentOvertimeHours = currentRecords.filter((r) => isOvertimeType(r.type)).reduce((sum, r) => sum + r.hours, 0)
  const previousOvertimeHours = previousRecords.filter((r) => isOvertimeType(r.type)).reduce((sum, r) => sum + r.hours, 0)
  const overtimeHoursChangePct =
    previousOvertimeHours > 0 ? ((currentOvertimeHours - previousOvertimeHours) / previousOvertimeHours) * 100 : null

  const nightDiffRecords = currentRecords.filter((r) => r.type === 'night_diff')
  const nightDiffHours = nightDiffRecords.reduce((sum, r) => sum + r.hours, 0)
  const activeNightShiftWorkers = new Set(nightDiffRecords.map((r) => r.employeeId)).size

  const estimatedCost = currentRecords
    .filter((r) => r.status !== 'rejected')
    .reduce((sum, r) => {
      const employee = employeeById.get(r.employeeId)
      if (!employee) return sum
      return sum + r.hours * estimateHourlyRate(employee) * r.multiplier
    }, 0)

  return {
    pendingCount: pendingRecords.length,
    pendingOvertimeCount,
    pendingNightDiffCount,
    totalOvertimeHours: Math.round(currentOvertimeHours * 10) / 10,
    overtimeHoursChangePct: overtimeHoursChangePct === null ? null : Math.round(overtimeHoursChangePct * 10) / 10,
    nightDiffHours: Math.round(nightDiffHours * 10) / 10,
    activeNightShiftWorkers,
    estimatedCost: Math.round(estimatedCost),
  }
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

export async function exportOvertimeSummaryCsv(session: SessionUser): Promise<string> {
  const [records, employees] = await Promise.all([getOvertimeRecords(session), getEmployees(session)])
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const header = ['Employee', 'Employee ID', 'Department', 'Date', 'Start', 'End', 'Hours', 'Type', 'Multiplier', 'Status']
  const rows = records.map((r) => {
    const employee = employeeById.get(r.employeeId)
    return [
      employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : r.employeeId,
      employee?.employeeNumber ?? '',
      employee?.employment.department ?? '',
      r.date,
      r.startTime,
      r.endTime,
      String(r.hours),
      r.type,
      `${Math.round(r.multiplier * 100)}%`,
      r.status,
    ]
  })
  return toCsv([header, ...rows])
}
