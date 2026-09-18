import type { Employee, OvertimeRecord, OvertimeType } from '@/types/domain'

const REASONS = [
  'Month-end reporting deadline',
  'Client escalation coverage',
  'System migration support',
  'Peak season order fulfillment',
  'Inventory count',
  'Backlog clearance',
]

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function typeForSeed(seed: number): OvertimeType {
  const roll = seed % 10
  if (roll < 5) return 'regular'
  if (roll < 8) return 'night_diff'
  return 'rest_day_holiday'
}

function multiplierFor(type: OvertimeType, seed: number): number {
  if (type === 'regular') return 1.25
  if (type === 'night_diff') return 1.1
  // Rest Day / Holiday OT ranges 130%-200%
  return [1.3, 1.5, 2.0][seed % 3]
}

function hoursFor(seed: number): number {
  return [2, 2.5, 3, 3.5, 4, 1.5][seed % 6]
}

function statusFor(seed: number) {
  const roll = seed % 5
  if (roll === 0) return 'rejected' as const
  if (roll <= 2) return 'pending' as const
  return 'approved' as const
}

function shiftFor(type: OvertimeType, seed: number): { startTime: string; endTime: string } {
  if (type === 'night_diff') {
    return [
      { startTime: '22:00', endTime: '02:00' },
      { startTime: '23:00', endTime: '03:00' },
      { startTime: '22:00', endTime: '01:00' },
    ][seed % 3]
  }
  return [
    { startTime: '18:00', endTime: '21:00' },
    { startTime: '18:00', endTime: '21:30' },
    { startTime: '17:30', endTime: '20:00' },
    { startTime: '13:00', endTime: '17:00' },
  ][seed % 4]
}

/** Generates 0-3 overtime/night-differential records per active employee across the last `days`, so the module renders fully out of the box. */
export function generateOvertimeRecords(employees: Employee[], days = 14): OvertimeRecord[] {
  const records: OvertimeRecord[] = []
  const today = new Date()

  for (const employee of employees) {
    if (employee.employment.status !== 'active') continue

    const recordCount = (employee.employeeNumber.charCodeAt(employee.employeeNumber.length - 1) % 4) as 0 | 1 | 2 | 3
    for (let i = 0; i < recordCount; i++) {
      const seed = employee.id.length * 31 + i * 17 + employee.employeeNumber.charCodeAt(0)
      const dayOffset = (seed * 7 + i * 3) % days
      const date = new Date(today)
      date.setDate(today.getDate() - dayOffset)

      const type = typeForSeed(seed)
      const hours = hoursFor(seed)
      const multiplier = multiplierFor(type, seed)
      const status = statusFor(seed + i)
      const { startTime, endTime } = shiftFor(type, seed)

      records.push({
        id: `${employee.id}_ot_${i + 1}`,
        companyId: employee.companyId,
        employeeId: employee.id,
        date: toDateKey(date),
        startTime,
        endTime,
        hours,
        type,
        multiplier,
        status,
        reason: REASONS[seed % REASONS.length],
        requestedAt: toDateKey(date) + 'T17:00:00.000Z',
        ...(status !== 'pending'
          ? { decidedBy: 'Andrea Villareal', decidedAt: toDateKey(date) + 'T20:00:00.000Z' }
          : {}),
      })
    }
  }

  return records
}
