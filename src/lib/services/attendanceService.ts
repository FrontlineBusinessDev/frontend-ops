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
    status: 'pending',
    requestedAt: new Date().toISOString(),
  }
  db.attendanceAdjustments.unshift(adjustment)
  return adjustment
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
