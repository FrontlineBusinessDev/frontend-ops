import { getEmployees } from '@/lib/services/employeeService'
import { scopeToCompany } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { ApprovalStatus, LeaveRequest, SessionUser } from '@/types/domain'

async function scopedEmployeeIds(session: SessionUser): Promise<Set<string>> {
  const employees = await getEmployees(session)
  return new Set(employees.map((e) => e.id))
}

export async function getLeaveTypes(session: SessionUser) {
  return scopeToCompany(db.leaveTypes, session.companyId)
}

export async function getLeaveRequests(session: SessionUser): Promise<LeaveRequest[]> {
  const employeeIds = await scopedEmployeeIds(session)
  return db.leaveRequests
    .filter((r) => r.companyId === session.companyId && employeeIds.has(r.employeeId))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
}

export function getLeaveBalance(employeeId: string, leaveTypeId: string): { credits: number; used: number; remaining: number } {
  const employee = db.employees.find((e) => e.id === employeeId)
  const leaveType = db.leaveTypes.find((lt) => lt.id === leaveTypeId)
  const credits = (employee && leaveType && employee.benefits.leaveCreditsByType[leaveType.name]) ?? 0

  const used = db.leaveRequests
    .filter((r) => r.employeeId === employeeId && r.leaveTypeId === leaveTypeId && r.status === 'approved')
    .reduce((total, r) => {
      const days = (new Date(r.dateTo).getTime() - new Date(r.dateFrom).getTime()) / 86_400_000 + 1
      return total + days
    }, 0)

  return { credits, used, remaining: Math.max(0, credits - used) }
}

export interface SubmitLeaveInput {
  employeeId: string
  leaveTypeId: string
  dateFrom: string
  dateTo: string
  reason?: string
}

export async function submitLeaveRequest(session: SessionUser, input: SubmitLeaveInput): Promise<LeaveRequest> {
  const request: LeaveRequest = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    employeeId: input.employeeId,
    leaveTypeId: input.leaveTypeId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    reason: input.reason,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  }
  db.leaveRequests.unshift(request)
  return request
}

export async function decideLeaveRequest(
  session: SessionUser,
  requestId: string,
  decision: Extract<ApprovalStatus, 'approved' | 'rejected'>,
): Promise<void> {
  const request = db.leaveRequests.find((r) => r.id === requestId)
  if (!request) return
  request.status = decision
  request.decidedBy = session.name
  request.decidedAt = new Date().toISOString()
}
