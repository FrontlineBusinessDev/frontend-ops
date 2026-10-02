import type { ShiftTemplate } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

/**
 * Shift templates per company. The Standard Day Shift keeps the `${companyId}_sched_default` id so attendance
 * records (which carry a `scheduleId`) keep resolving; it stays first because it is the company default.
 * Who follows which template is filled in at seed time (see `generators/schedules.ts`).
 */
export const shiftTemplates: ShiftTemplate[] = companies.flatMap((company) => [
  {
    id: `${company.id}_sched_default`,
    companyId: company.id,
    name: 'Standard Day Shift',
    startTime: '09:00',
    endTime: '18:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    breakMinutes: 60,
    shiftType: 'day',
    gracePeriodMinutes: 10,
    tone: 'accent',
    assignedEmployeeIds: [],
  },
  {
    id: `${company.id}_shift_mid`,
    companyId: company.id,
    name: 'Mid Shift',
    startTime: '12:00',
    endTime: '21:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    breakMinutes: 60,
    shiftType: 'day',
    gracePeriodMinutes: 10,
    tone: 'warning',
    assignedEmployeeIds: [],
  },
  {
    id: `${company.id}_shift_night`,
    companyId: company.id,
    name: 'Night Shift',
    startTime: '22:00',
    endTime: '06:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    breakMinutes: 60,
    shiftType: 'night',
    gracePeriodMinutes: 10,
    tone: 'purple',
    assignedEmployeeIds: [],
  },
  {
    id: `${company.id}_shift_flex`,
    companyId: company.id,
    name: 'Flexible Hours',
    startTime: '08:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    breakMinutes: 60,
    shiftType: 'flexible',
    gracePeriodMinutes: 60,
    tone: 'success',
    assignedEmployeeIds: [],
  },
])
