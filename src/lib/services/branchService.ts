import { getPayrollLines, getPayrollPeriods } from '@/lib/services/payrollService'
import { scopeToCompany } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { Branch, Employee, SessionUser } from '@/types/domain'

export async function getBranches(session: SessionUser): Promise<Branch[]> {
  return scopeToCompany(db.branches, session.companyId)
}

export interface CreateBranchInput {
  name: string
  isHeadOffice: boolean
  code?: string
  address?: string
  city?: string
  contactNumber?: string
  email?: string
  managerEmployeeId?: string
  openedDate?: string
}

/** Creates a branch and, optionally, bulk-assigns (or transfers) employees to it in the same step. */
export async function createBranch(session: SessionUser, input: CreateBranchInput & { employeeIds?: string[] }): Promise<Branch> {
  const { employeeIds = [], ...details } = input
  const branch: Branch = { id: crypto.randomUUID(), companyId: session.companyId, ...details }
  db.branches.push(branch)
  await assignEmployeesToBranch(session, employeeIds, branch.id)
  return branch
}

export async function updateBranch(session: SessionUser, branchId: string, updates: Partial<CreateBranchInput>): Promise<void> {
  const branch = db.branches.find((b) => b.id === branchId && b.companyId === session.companyId)
  if (!branch) return
  Object.assign(branch, updates)
}

export async function reassignEmployeeBranch(session: SessionUser, employeeId: string, branchId: string): Promise<void> {
  const employee = db.employees.find((e) => e.id === employeeId && e.companyId === session.companyId)
  const branch = db.branches.find((b) => b.id === branchId && b.companyId === session.companyId)
  if (!employee || !branch) return

  if (employee.branchId === branchId) return
  // An employee who leaves the branch they manage stops being its manager.
  const previous = db.branches.find((b) => b.id === employee.branchId && b.companyId === session.companyId)
  if (previous?.managerEmployeeId === employeeId) previous.managerEmployeeId = undefined

  employee.branchId = branchId
  employee.history.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor: session.name,
    action: `Reassigned to branch: ${branch.name}`,
  })
}

/** Bulk assign / transfer employees to a branch; returns how many actually moved. */
export async function assignEmployeesToBranch(session: SessionUser, employeeIds: string[], branchId: string): Promise<number> {
  let moved = 0
  for (const employeeId of employeeIds) {
    const employee = db.employees.find((e) => e.id === employeeId && e.companyId === session.companyId)
    if (!employee || employee.branchId === branchId) continue
    await reassignEmployeeBranch(session, employeeId, branchId)
    moved += 1
  }
  return moved
}

export interface BranchSummary {
  branch: Branch
  headcount: number
  activeCount: number
  grossPay: number
  netPay: number
}

/** Consolidated cross-branch report: headcount plus latest payroll period's totals, scoped per branch. */
export async function getBranchSummaries(session: SessionUser): Promise<BranchSummary[]> {
  const branches = scopeToCompany(db.branches, session.companyId)
  const employees = scopeToCompany(db.employees, session.companyId)
  const periods = await getPayrollPeriods(session)
  const latestPeriod = periods[0]
  const lines = latestPeriod ? await getPayrollLines(session, latestPeriod.id) : []
  const employeeById = new Map<string, Employee>(employees.map((e) => [e.id, e]))

  return branches.map((branch) => {
    const branchEmployees = employees.filter((e) => e.branchId === branch.id)
    const branchLines = lines.filter((line) => employeeById.get(line.employeeId)?.branchId === branch.id)
    return {
      branch,
      headcount: branchEmployees.length,
      activeCount: branchEmployees.filter((e) => e.employment.status === 'active').length,
      grossPay: branchLines.reduce((sum, l) => sum + l.grossPay, 0),
      netPay: branchLines.reduce((sum, l) => sum + l.netPay, 0),
    }
  })
}
