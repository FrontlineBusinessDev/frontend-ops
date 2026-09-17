import { db } from '@/mock-data'
import type { Company, Holiday, Schedule, SessionUser } from '@/types/domain'

export async function getCompany(session: SessionUser): Promise<Company | undefined> {
  return db.companies.find((c) => c.id === session.companyId)
}

export interface UpdateCompanyInput {
  name: string
  timezone: string
  payrollFrequency: Company['payrollFrequency']
}

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
}

export async function createSchedule(session: SessionUser, input: CreateScheduleInput): Promise<Schedule> {
  const schedule: Schedule = { id: crypto.randomUUID(), companyId: session.companyId, ...input }
  db.schedules.push(schedule)
  return schedule
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
