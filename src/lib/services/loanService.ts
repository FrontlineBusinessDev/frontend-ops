import { getEmployees } from '@/lib/services/employeeService'
import { db } from '@/mock-data'
import type { LoanRecord, LoanType, SessionUser } from '@/types/domain'

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
