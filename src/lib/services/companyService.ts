import { db } from '@/mock-data'
import type { Company, Holiday, Schedule, SessionUser } from '@/types/domain'

export async function getCompany(session: SessionUser): Promise<Company | undefined> {
  return db.companies.find((c) => c.id === session.companyId)
}

export type UpdateCompanyInput = Partial<Omit<Company, 'id' | 'planTier' | 'createdAt'>>

export async function updateCompany(session: SessionUser, updates: UpdateCompanyInput): Promise<void> {
  const company = db.companies.find((c) => c.id === session.companyId)
  if (!company) return
  Object.assign(company, updates)
}

export async function getSchedules(session: SessionUser): Promise<Schedule[]> {
  return db.schedules.filter((s) => s.companyId === session.companyId)
}

export interface CreateScheduleInput {
  name: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  breakMinutes?: number
  shiftType?: Schedule['shiftType']
  gracePeriodMinutes?: number
  restDays?: number[]
}

export async function createSchedule(session: SessionUser, input: CreateScheduleInput): Promise<Schedule> {
  const schedule: Schedule = { id: crypto.randomUUID(), companyId: session.companyId, assignedEmployeeIds: [], ...input }
  db.schedules.push(schedule)
  return schedule
}

export type UpdateScheduleInput = Partial<CreateScheduleInput>

export async function updateSchedule(session: SessionUser, scheduleId: string, updates: UpdateScheduleInput): Promise<void> {
  const schedule = db.schedules.find((s) => s.id === scheduleId && s.companyId === session.companyId)
  if (!schedule) return
  Object.assign(schedule, updates)
}

export async function setScheduleAssignedEmployees(
  session: SessionUser,
  scheduleId: string,
  employeeIds: string[],
): Promise<void> {
  const schedule = db.schedules.find((s) => s.id === scheduleId && s.companyId === session.companyId)
  if (!schedule) return
  schedule.assignedEmployeeIds = employeeIds
}

export async function getHolidays(session: SessionUser): Promise<Holiday[]> {
  return db.holidays.filter((h) => h.companyId === session.companyId).sort((a, b) => a.date.localeCompare(b.date))
}

export interface CreateHolidayInput {
  name: string
  date: string
  type: Holiday['type']
}

export async function createHoliday(session: SessionUser, input: CreateHolidayInput): Promise<Holiday> {
  const holiday: Holiday = { id: crypto.randomUUID(), companyId: session.companyId, ...input }
  db.holidays.push(holiday)
  return holiday
}
