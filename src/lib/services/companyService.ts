import { db } from '@/mock-data'
import type { Company, Holiday, SessionUser } from '@/types/domain'

export async function getCompany(session: SessionUser): Promise<Company | undefined> {
  return db.companies.find((c) => c.id === session.companyId)
}

export type UpdateCompanyInput = Partial<Omit<Company, 'id' | 'planTier' | 'createdAt'>>

export async function updateCompany(session: SessionUser, updates: UpdateCompanyInput): Promise<void> {
  const company = db.companies.find((c) => c.id === session.companyId)
  if (!company) return
  Object.assign(company, updates)
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
