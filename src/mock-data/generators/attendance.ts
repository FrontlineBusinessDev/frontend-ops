import type { AttendanceRecord, AttendanceStatus, Employee, Schedule } from '@/types/domain'

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function pickStatus(seed: number): AttendanceStatus {
  const roll = seed % 20
  if (roll === 0) return 'absent'
  if (roll <= 2) return 'undertime'
  if (roll <= 5) return 'late'
  return 'present'
}

/** Generates the last `days` weekdays of attendance for every active employee, following each company's default schedule. */
export function generateAttendanceRecords(
  employees: Employee[],
  schedulesByCompany: Map<string, Schedule>,
  days = 14,
): AttendanceRecord[] {
  const records: AttendanceRecord[] = []
  const today = new Date()

  let cursorDays = 0
  const workingDays: Date[] = []
  while (workingDays.length < days) {
    const d = new Date(today)
    d.setDate(today.getDate() - cursorDays)
    cursorDays++
    if (d.getDay() !== 0 && d.getDay() !== 6) workingDays.push(d)
  }

  for (const employee of employees) {
    if (employee.employment.status !== 'active') continue
    const schedule = schedulesByCompany.get(employee.companyId)
    if (!schedule) continue

    workingDays.forEach((date, dayIndex) => {
      const seed = dayIndex + employee.id.length + employee.employeeNumber.charCodeAt(0)
      const status = pickStatus(seed)
      const dateKey = toDateKey(date)

      records.push({
        id: `${employee.id}_att_${dateKey}`,
        companyId: employee.companyId,
        employeeId: employee.id,
        scheduleId: schedule.id,
        date: dateKey,
        timeIn: status === 'absent' ? null : status === 'late' ? '09:24' : '08:57',
        timeOut: status === 'absent' ? null : status === 'undertime' ? '16:30' : '18:05',
        status,
      })
    })
  }

  return records
}
