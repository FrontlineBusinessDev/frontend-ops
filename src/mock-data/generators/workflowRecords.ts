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

/**
 * Approved leaves that overlap the biometrics sample log (today and yesterday) for end-to-end testing of
 * the leave override on Attendance → Import Biometrics Record: a full-day leave with no punches, a
 * full-day leave WITH punches (review flag), two half-day leaves, and a pending leave that must not override.
 */
export function generateSampleLeaveOverrides(employees: Employee[]): LeaveRequest[] {
  const dateKey = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
  }
  const today = dateKey(0)
  const yesterday = dateKey(-1)
  const companyId = 'co_frontline'
  const byNumber = (n: string) => employees.find((e) => e.companyId === companyId && e.employeeNumber === n)
  const samples: { number: string; type: string; from: string; to: string; portion: LeaveRequest['dayPortion']; status: LeaveRequest['status']; reason: string }[] = [
    { number: 'FR-0008', type: 'vacation', from: yesterday, to: today, portion: 'full', status: 'approved', reason: 'Family trip to Bohol' },
    { number: 'FR-0003', type: 'sick', from: today, to: today, portion: 'full', status: 'approved', reason: 'Flu — filed in the morning' },
    { number: 'FR-0006', type: 'vacation', from: today, to: today, portion: 'half_pm', status: 'approved', reason: 'Bank appointment in the afternoon' },
    { number: 'FR-0009', type: 'emergency', from: today, to: today, portion: 'half_am', status: 'approved', reason: 'Child school emergency' },
    { number: 'FR-0010', type: 'sick', from: yesterday, to: yesterday, portion: 'full', status: 'approved', reason: 'Medical check-up' },
    { number: 'FR-0013', type: 'vacation', from: today, to: today, portion: 'full', status: 'pending', reason: 'Personal errand (awaiting approval)' },
  ]
  return samples.flatMap((s, i) => {
    const employee = byNumber(s.number)
    if (!employee) return []
    return [
      {
        id: `${employee.id}_leave_sample_${i}`,
        companyId,
        employeeId: employee.id,
        leaveTypeId: `${companyId}_lt_${s.type}`,
        dateFrom: s.from,
        dateTo: s.to,
        dayPortion: s.portion,
        reason: s.reason,
        status: s.status,
        requestedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        ...(s.status === 'approved' ? { decidedBy: 'Ramon Torres', decidedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() } : {}),
      },
    ]
  })
}
