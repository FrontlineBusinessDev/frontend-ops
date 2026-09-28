import { workLogsForPeriod } from '@/lib/payroll/rateBasis'
import { getEmployees } from '@/lib/services/employeeService'
import { db } from '@/mock-data'
import type { ApprovalStatus, CompensationApproval, PayrollPeriod, SessionUser } from '@/types/domain'

export interface WorkLogTotals {
  records: number
  quantity: number
  amount: number
}

export interface WorkLogSummary {
  hourly: WorkLogTotals
  output: WorkLogTotals
  pendingCount: number
  rejectedCount: number
  /** Approved entries in range this period does not pay: already paid by another run, or (after a run) approved too late for it. */
  excludedApprovedCount: number
}

type PeriodScope = Pick<PayrollPeriod, 'id' | 'status' | 'startDate' | 'endDate' | 'payrollGroupId'>

/** Active hourly/output employees a payroll run over `period` covers (its Payroll Group, when it has one). */
function workLogEmployeesFor(session: SessionUser, period: PeriodScope) {
  const group = period.payrollGroupId ? db.payrollGroups.find((g) => g.id === period.payrollGroupId) : undefined
  return db.employees.filter(
    (e) =>
      e.companyId === session.companyId &&
      e.employment.status === 'active' &&
      (e.compensation.payType === 'hourly' || e.compensation.payType === 'output_based') &&
      (!group || group.employeeIds.includes(e.id)),
  )
}

/**
 * The pending entries a payroll period's "won't be paid unless approved" warning counts — same
 * employee scope and date range — so Approvals can pre-select exactly those.
 */
export async function getPendingWorkLogsForPeriod(
  session: SessionUser,
  periodId: string,
): Promise<{ period: PayrollPeriod; employeeIds: string[]; pendingIds: string[] } | undefined> {
  const period = db.payrollPeriods.find((p) => p.id === periodId && p.companyId === session.companyId)
  if (!period) return undefined
  const employees = workLogEmployeesFor(session, period)
  const pendingIds = employees.flatMap((employee) =>
    workLogsForPeriod(employee.id, period, db.compensationApprovals)
      .inRange.filter((a) => a.status === 'pending')
      .map((a) => a.id),
  )
  return { period, employeeIds: employees.map((e) => e.id), pendingIds }
}

/**
 * Approved hourly/output work logs a payroll period pays (or, for a draft, would pay if run now) —
 * uses the engine's own selection rule, scoped to the period's Payroll Group when it has one.
 */
export async function getWorkLogSummaryForPeriod(session: SessionUser, period: PeriodScope): Promise<WorkLogSummary> {
  const employees = workLogEmployeesFor(session, period)

  const summary: WorkLogSummary = {
    hourly: { records: 0, quantity: 0, amount: 0 },
    output: { records: 0, quantity: 0, amount: 0 },
    pendingCount: 0,
    rejectedCount: 0,
    excludedApprovedCount: 0,
  }
  for (const employee of employees) {
    const logs = workLogsForPeriod(employee.id, period, db.compensationApprovals)
    const bucket = employee.compensation.payType === 'hourly' ? summary.hourly : summary.output
    const quantity = logs.payable.reduce((sum, a) => sum + a.quantity, 0)
    bucket.records += logs.payable.length
    bucket.quantity += quantity
    bucket.amount += Math.round(quantity * employee.compensation.basicPay * 100) / 100
    summary.pendingCount += logs.pendingCount
    summary.rejectedCount += logs.rejectedCount
    summary.excludedApprovedCount += logs.inRange.filter((a) => a.status === 'approved' && !logs.payable.includes(a)).length
  }
  return summary
}

export async function getCompensationApprovals(session: SessionUser): Promise<CompensationApproval[]> {
  const employees = await getEmployees(session)
  const employeeIds = new Set(employees.map((e) => e.id))
  return db.compensationApprovals
    .filter((a) => a.companyId === session.companyId && employeeIds.has(a.employeeId))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

/** Decides one or many pending entries at once — backs both the per-row actions and Bulk Approve/Reject. */
export async function decideCompensationApprovals(
  session: SessionUser,
  ids: string[],
  decision: Extract<ApprovalStatus, 'approved' | 'rejected'>,
): Promise<number> {
  const idSet = new Set(ids)
  const decidedAt = new Date().toISOString()
  let count = 0
  for (const approval of db.compensationApprovals) {
    if (!idSet.has(approval.id) || approval.companyId !== session.companyId || approval.status !== 'pending') continue
    approval.status = decision
    approval.decidedBy = session.name
    approval.decidedAt = decidedAt
    count++
  }
  return count
}
