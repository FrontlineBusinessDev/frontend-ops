import { getEmployees } from '@/lib/services/employeeService'
import { scopeToCompany } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { AttendanceAdjustment, AttendanceRecord, ApprovalStatus, SessionUser } from '@/types/domain'

async function scopedEmployeeIds(session: SessionUser): Promise<Set<string>> {
  const employees = await getEmployees(session)
  return new Set(employees.map((e) => e.id))
}

export async function getSchedules(session: SessionUser) {
  return scopeToCompany(db.schedules, session.companyId)
}

export async function getAttendanceForDate(session: SessionUser, date: string): Promise<AttendanceRecord[]> {
  const employeeIds = await scopedEmployeeIds(session)
  return db.attendanceRecords.filter((r) => r.companyId === session.companyId && r.date === date && employeeIds.has(r.employeeId))
}

export async function getAttendanceForEmployee(session: SessionUser, employeeId: string): Promise<AttendanceRecord[]> {
  const employeeIds = await scopedEmployeeIds(session)
  if (!employeeIds.has(employeeId)) return []
  return db.attendanceRecords
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function getAttendanceRecordForEmployeeDate(
  session: SessionUser,
  employeeId: string,
  date: string,
): Promise<AttendanceRecord | undefined> {
  return db.attendanceRecords.find((r) => r.companyId === session.companyId && r.employeeId === employeeId && r.date === date)
}

/** Employee ids with an approved leave request covering the given date — powers the "On Leave" filter option. */
export async function getEmployeeIdsOnLeaveForDate(session: SessionUser, date: string): Promise<Set<string>> {
  const employeeIds = await scopedEmployeeIds(session)
  const onLeave = db.leaveRequests.filter(
    (r) =>
      r.companyId === session.companyId &&
      r.status === 'approved' &&
      employeeIds.has(r.employeeId) &&
      r.dateFrom <= date &&
      r.dateTo >= date,
  )
  return new Set(onLeave.map((r) => r.employeeId))
}

/** Employee ids with a pending adjustment request tied to the given date's attendance record — powers the "Pending Adjustment" filter option. */
export async function getEmployeeIdsWithPendingAdjustmentForDate(session: SessionUser, date: string): Promise<Set<string>> {
  const employeeIds = await scopedEmployeeIds(session)
  const recordIdsForDate = new Set(
    db.attendanceRecords.filter((r) => r.companyId === session.companyId && r.date === date).map((r) => r.id),
  )
  const pending = db.attendanceAdjustments.filter(
    (a) =>
      a.companyId === session.companyId &&
      a.status === 'pending' &&
      employeeIds.has(a.employeeId) &&
      recordIdsForDate.has(a.attendanceRecordId),
  )
  return new Set(pending.map((a) => a.employeeId))
}

export async function getAttendanceAdjustments(session: SessionUser): Promise<AttendanceAdjustment[]> {
  const employeeIds = await scopedEmployeeIds(session)
  return db.attendanceAdjustments
    .filter((a) => a.companyId === session.companyId && employeeIds.has(a.employeeId))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

export interface CreateAdjustmentInput {
  attendanceRecordId: string
  requestedTimeIn: string | null
  requestedTimeOut: string | null
  reason: string
  reasonCategory?: string
}

export async function createAttendanceAdjustment(
  session: SessionUser,
  input: CreateAdjustmentInput,
): Promise<AttendanceAdjustment> {
  const record = db.attendanceRecords.find((r) => r.id === input.attendanceRecordId)
  if (!record) throw new Error('Attendance record not found')

  const adjustment: AttendanceAdjustment = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    employeeId: record.employeeId,
    attendanceRecordId: record.id,
    requestedTimeIn: input.requestedTimeIn,
    requestedTimeOut: input.requestedTimeOut,
    reason: input.reason,
    reasonCategory: input.reasonCategory,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  }
  db.attendanceAdjustments.unshift(adjustment)
  return adjustment
}

export interface FileAdjustmentInput {
  employeeId: string
  date: string
  requestedTimeIn: string | null
  requestedTimeOut: string | null
  reasonCategory: string
  remarks: string
}

/**
 * Backs the standalone "+ File Adjustment" flow, which starts from an employee + date
 * rather than an existing attendance-table row. Resolves (or creates, if the employee
 * has no record yet for that date — e.g. an unlogged absence) the underlying
 * AttendanceRecord so every adjustment still ties back to one, matching the existing
 * per-row request flow's data shape.
 */
export async function fileAttendanceAdjustment(session: SessionUser, input: FileAdjustmentInput): Promise<AttendanceAdjustment> {
  let record = db.attendanceRecords.find(
    (r) => r.companyId === session.companyId && r.employeeId === input.employeeId && r.date === input.date,
  )

  if (!record) {
    const schedule = db.schedules.find((s) => s.companyId === session.companyId)
    record = {
      id: crypto.randomUUID(),
      companyId: session.companyId,
      employeeId: input.employeeId,
      scheduleId: schedule?.id ?? '',
      date: input.date,
      timeIn: null,
      timeOut: null,
      status: 'absent',
    }
    db.attendanceRecords.push(record)
  }

  return createAttendanceAdjustment(session, {
    attendanceRecordId: record.id,
    requestedTimeIn: input.requestedTimeIn,
    requestedTimeOut: input.requestedTimeOut,
    reason: input.remarks,
    reasonCategory: input.reasonCategory,
  })
}

export async function decideAttendanceAdjustment(
  session: SessionUser,
  adjustmentId: string,
  decision: Extract<ApprovalStatus, 'approved' | 'rejected'>,
): Promise<void> {
  const adjustment = db.attendanceAdjustments.find((a) => a.id === adjustmentId)
  if (!adjustment) return

  adjustment.status = decision
  adjustment.decidedBy = session.name
  adjustment.decidedAt = new Date().toISOString()

  if (decision === 'approved') {
    const record = db.attendanceRecords.find((r) => r.id === adjustment.attendanceRecordId)
    if (record) {
      record.timeIn = adjustment.requestedTimeIn
      record.timeOut = adjustment.requestedTimeOut
      record.status = 'present'
    }
  }
}
