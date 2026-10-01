import { scopeToCompany } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { LoanTypeConfig, SessionUser } from '@/types/domain'

export async function getLoanTypes(session: SessionUser): Promise<LoanTypeConfig[]> {
  return scopeToCompany(db.loanTypes, session.companyId)
}

export type LoanTypeInput = Omit<LoanTypeConfig, 'id' | 'companyId' | 'key' | 'isActive' | 'builtIn'>

/** Adds a company-defined loan type. Its key is derived from the label and made unique. */
export async function createLoanType(session: SessionUser, input: LoanTypeInput): Promise<LoanTypeConfig> {
  const slug = input.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'loan'
  const existing = new Set(db.loanTypes.filter((t) => t.companyId === session.companyId).map((t) => t.key))
  let key = `custom_${slug}`
  for (let i = 2; existing.has(key); i++) key = `custom_${slug}_${i}`
  const record: LoanTypeConfig = { id: crypto.randomUUID(), companyId: session.companyId, key, isActive: true, ...input }
  db.loanTypes.push(record)
  return record
}

export async function updateLoanType(session: SessionUser, id: string, updates: Partial<LoanTypeInput & Pick<LoanTypeConfig, 'isActive'>>): Promise<void> {
  const record = db.loanTypes.find((t) => t.id === id && t.companyId === session.companyId)
  if (record) Object.assign(record, updates)
}

/** How many loans (any status) use this type. */
export function loansUsingType(session: SessionUser, key: string): number {
  return db.loans.filter((l) => l.companyId === session.companyId && l.type === key).length
}

/** Deletes a company-defined type that no loan uses. Returns false when it's built-in or still in use (deactivate it instead). */
export async function deleteLoanType(session: SessionUser, id: string): Promise<boolean> {
  const index = db.loanTypes.findIndex((t) => t.id === id && t.companyId === session.companyId)
  const record = db.loanTypes[index]
  if (!record || record.builtIn || loansUsingType(session, record.key) > 0) return false
  db.loanTypes.splice(index, 1)
  return true
}
