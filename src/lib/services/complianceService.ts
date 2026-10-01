import { scopeToCompany } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { ComplianceDeadline, SessionUser } from '@/types/domain'

export type ComplianceDeadlineInput = Omit<ComplianceDeadline, 'id' | 'companyId' | 'custom' | 'to'>

export async function getComplianceDeadlines(session: SessionUser): Promise<ComplianceDeadline[]> {
  return scopeToCompany(db.complianceDeadlines, session.companyId)
}

export async function createComplianceDeadline(session: SessionUser, input: ComplianceDeadlineInput): Promise<ComplianceDeadline> {
  const record: ComplianceDeadline = { id: crypto.randomUUID(), companyId: session.companyId, custom: true, ...input }
  db.complianceDeadlines.push(record)
  return record
}

export async function updateComplianceDeadline(session: SessionUser, id: string, updates: Partial<ComplianceDeadlineInput>): Promise<void> {
  const record = db.complianceDeadlines.find((d) => d.id === id && d.companyId === session.companyId)
  if (record) Object.assign(record, updates)
}

/** Only custom reminders can be removed; the built-in government deadlines can be switched off instead. */
export async function deleteComplianceDeadline(session: SessionUser, id: string): Promise<void> {
  const index = db.complianceDeadlines.findIndex((d) => d.id === id && d.companyId === session.companyId && d.custom)
  if (index >= 0) db.complianceDeadlines.splice(index, 1)
}
