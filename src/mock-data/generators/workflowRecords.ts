import type {
  AttendanceAdjustment,
  AttendanceRecord,
  Employee,
  LeaveRequest,
  LeaveType,
} from '@/types/domain'

/** A handful of attendance-adjustment requests in varying statuses, for demoing the HR-adjusts / manager-approves flow. */
export function generateAttendanceAdjustments(
  employees: Employee[],
  attendanceRecords: AttendanceRecord[],
): AttendanceAdjustment[] {
  const candidates = attendanceRecords.filter((r) => r.status === 'late' || r.status === 'undertime' || r.status === 'absent')
  const adjustments: AttendanceAdjustment[] = []

  const employeeIds = new Set(employees.map((e) => e.id))

  candidates.slice(0, 18).forEach((record, idx) => {
    if (!employeeIds.has(record.employeeId)) return

    const statusRoll = idx % 3
    const status = statusRoll === 0 ? 'pending' : statusRoll === 1 ? 'approved' : 'rejected'

    adjustments.push({
      id: `${record.id}_adj`,
      companyId: record.companyId,
      employeeId: record.employeeId,
      attendanceRecordId: record.id,
      requestedTimeIn: record.status === 'absent' ? '09:00' : record.timeIn,
      requestedTimeOut: '18:00',
      reason:
        record.status === 'absent'
          ? 'System failed to log biometric entry; I was on-site the whole shift.'
          : 'Traffic incident along the route caused a late clock-in.',
      status,
      requestedAt: `${record.date}T19:00:00.000Z`,
      ...(status !== 'pending'
        ? { decidedBy: 'Ramon Torres', decidedAt: `${record.date}T20:00:00.000Z` }
        : {}),
    })
  })

  return adjustments
}

const REASONS = [
  'Family gathering out of town.',
  'Medical check-up and recovery.',
  'Personal matters to attend to.',
]

/** A handful of leave requests in varying statuses, for demoing the employee-requests / manager-approves flow. */
export function generateLeaveRequests(employees: Employee[], leaveTypes: LeaveType[]): LeaveRequest[] {
  const requests: LeaveRequest[] = []
  const activeEmployees = employees.filter((e) => e.employment.status === 'active')

  activeEmployees.slice(0, 15).forEach((employee, idx) => {
    const companyLeaveTypes = leaveTypes.filter((lt) => lt.companyId === employee.companyId)
    const leaveType = companyLeaveTypes[idx % companyLeaveTypes.length]
    if (!leaveType) return

    const statusRoll = idx % 3
    const status = statusRoll === 0 ? 'pending' : statusRoll === 1 ? 'approved' : 'rejected'
    const startOffset = 3 + idx
    const start = new Date()
    start.setDate(start.getDate() + startOffset)
    const end = new Date(start)
    end.setDate(start.getDate() + (idx % 3))

    requests.push({
      id: `${employee.id}_leave_${idx}`,
      companyId: employee.companyId,
      employeeId: employee.id,
      leaveTypeId: leaveType.id,
      dateFrom: start.toISOString().slice(0, 10),
      dateTo: end.toISOString().slice(0, 10),
      reason: REASONS[idx % REASONS.length],
      status,
      requestedAt: new Date(start.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      ...(status !== 'pending'
        ? { decidedBy: 'Ramon Torres', decidedAt: new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() }
        : {}),
    })
  })

  return requests
}
