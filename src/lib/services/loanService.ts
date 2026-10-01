import { getEmployees } from '@/lib/services/employeeService'
import { db } from '@/mock-data'
import type { LoanRecord, LoanStatus, LoanType, SessionUser } from '@/types/domain'

export async function getLoans(session: SessionUser): Promise<LoanRecord[]> {
  const employees = await getEmployees(session)
  const employeeIds = new Set(employees.map((e) => e.id))
  return db.loans.filter((l) => l.companyId === session.companyId && employeeIds.has(l.employeeId))
}

export interface CreateLoanInput {
  employeeId: string
  type: LoanType
  label: string
  principal: number
  monthlyDeduction: number
  startDate: string
}

export async function createLoan(session: SessionUser, input: CreateLoanInput): Promise<LoanRecord> {
  const loan: LoanRecord = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    balance: input.principal,
    status: 'active',
    repaymentHistory: [],
    ...input,
  }
  db.loans.unshift(loan)
  return loan
}

/** Edits the terms of a loan. The principal and balance are not editable once a loan exists. */
export async function updateLoan(session: SessionUser, id: string, updates: Partial<Pick<LoanRecord, 'type' | 'label' | 'monthlyDeduction' | 'startDate'>>): Promise<void> {
  const loan = db.loans.find((l) => l.id === id && l.companyId === session.companyId)
  if (loan) Object.assign(loan, updates)
}

/** Pause ('suspended'), resume ('active') or cancel a loan. Payroll only deducts active loans. */
export async function setLoanStatus(session: SessionUser, id: string, status: LoanStatus): Promise<void> {
  const loan = db.loans.find((l) => l.id === id && l.companyId === session.companyId)
  if (loan) loan.status = status
}
