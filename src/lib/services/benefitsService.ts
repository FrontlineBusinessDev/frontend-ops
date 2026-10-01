import { getEmployees } from '@/lib/services/employeeService'
import { db } from '@/mock-data'
import type { EmployeeBenefit, EmployeeDeduction, SessionUser } from '@/types/domain'

/** Benefits for the employees the session can see. */
export async function getEmployeeBenefits(session: SessionUser): Promise<EmployeeBenefit[]> {
  const employeeIds = new Set((await getEmployees(session)).map((e) => e.id))
  return db.employeeBenefits.filter((b) => b.companyId === session.companyId && employeeIds.has(b.employeeId))
}

export type EmployeeBenefitInput = Omit<EmployeeBenefit, 'id' | 'companyId' | 'status'>

export async function createEmployeeBenefit(session: SessionUser, input: EmployeeBenefitInput): Promise<EmployeeBenefit> {
  const record: EmployeeBenefit = { id: crypto.randomUUID(), companyId: session.companyId, status: 'active', ...input }
  db.employeeBenefits.unshift(record)
  return record
}

export async function updateEmployeeBenefit(session: SessionUser, id: string, updates: Partial<Omit<EmployeeBenefit, 'id' | 'companyId'>>): Promise<void> {
  const record = db.employeeBenefits.find((b) => b.id === id && b.companyId === session.companyId)
  if (record) Object.assign(record, updates)
}

/** Deductions (non-loan, non-statutory) for the employees the session can see. */
export async function getEmployeeDeductions(session: SessionUser): Promise<EmployeeDeduction[]> {
  const employeeIds = new Set((await getEmployees(session)).map((e) => e.id))
  return db.employeeDeductions.filter((d) => d.companyId === session.companyId && employeeIds.has(d.employeeId))
}

export type EmployeeDeductionInput = Omit<EmployeeDeduction, 'id' | 'companyId' | 'status' | 'appliedPeriodId'>

export async function createEmployeeDeduction(session: SessionUser, input: EmployeeDeductionInput): Promise<EmployeeDeduction> {
  const record: EmployeeDeduction = { id: crypto.randomUUID(), companyId: session.companyId, status: 'active', ...input }
  db.employeeDeductions.unshift(record)
  return record
}

export async function updateEmployeeDeduction(session: SessionUser, id: string, updates: Partial<Omit<EmployeeDeduction, 'id' | 'companyId'>>): Promise<void> {
  const record = db.employeeDeductions.find((d) => d.id === id && d.companyId === session.companyId)
  if (record) Object.assign(record, updates)
}
