import { getAttendanceAdjustments } from '@/lib/services/attendanceService'
import { getLeaveRequests } from '@/lib/services/leaveService'
import { getPayrollPeriods } from '@/lib/services/payrollService'
import { roleHasCapability } from '@/lib/rbac/permissions'
import { db } from '@/mock-data'
import type { SessionUser } from '@/types/domain'

export interface AppNotification {
  id: string
  message: string
  tone: 'default' | 'success' | 'warning' | 'danger'
  timestamp: string
  link?: string
}

export async function getNotifications(session: SessionUser): Promise<AppNotification[]> {
  const notifications: AppNotification[] = []

  if (roleHasCapability(session.role, 'approvals.view')) {
    const [adjustments, leaveRequests] = await Promise.all([getAttendanceAdjustments(session), getLeaveRequests(session)])
    const pendingAdjustments = adjustments.filter((a) => a.status === 'pending')
    const pendingLeave = leaveRequests.filter((r) => r.status === 'pending')

    if (pendingLeave.length > 0) {
      notifications.push({
        id: 'pending-leave',
        message: `${pendingLeave.length} leave request${pendingLeave.length === 1 ? '' : 's'} awaiting your approval`,
        tone: 'warning',
        timestamp: new Date().toISOString(),
        link: '/leave',
      })
    }
    if (pendingAdjustments.length > 0) {
      notifications.push({
        id: 'pending-adjustments',
        message: `${pendingAdjustments.length} attendance adjustment${pendingAdjustments.length === 1 ? '' : 's'} awaiting your approval`,
        tone: 'warning',
        timestamp: new Date().toISOString(),
        link: '/attendance',
      })
    }
  }

  if (roleHasCapability(session.role, 'payroll.run')) {
    const periods = await getPayrollPeriods(session)
    const draftPeriods = periods.filter((p) => p.status === 'draft' || p.status === 'review')
    draftPeriods.forEach((period) => {
      notifications.push({
        id: `payroll-reminder-${period.id}`,
        message: `Payroll for "${period.label}" is ${period.status === 'draft' ? 'waiting to be run' : 'awaiting approval'} — pay date ${period.payDate}`,
        tone: 'default',
        timestamp: new Date().toISOString(),
        link: `/payroll/${period.id}`,
      })
    })
  }

  if (session.employeeId) {
    const decidedLeave = db.leaveRequests.filter((r) => r.employeeId === session.employeeId && r.status !== 'pending' && r.decidedAt)
    decidedLeave.slice(0, 5).forEach((r) => {
      notifications.push({
        id: `leave-decision-${r.id}`,
        message: `Your leave request (${r.dateFrom} – ${r.dateTo}) was ${r.status}`,
        tone: r.status === 'approved' ? 'success' : 'danger',
        timestamp: r.decidedAt!,
        link: '/ess/leave',
      })
    })

    const decidedAdjustments = db.attendanceAdjustments.filter(
      (a) => a.employeeId === session.employeeId && a.status !== 'pending' && a.decidedAt,
    )
    decidedAdjustments.slice(0, 5).forEach((a) => {
      notifications.push({
        id: `adjustment-decision-${a.id}`,
        message: `Your attendance adjustment request was ${a.status}`,
        tone: a.status === 'approved' ? 'success' : 'danger',
        timestamp: a.decidedAt!,
        link: '/ess/attendance',
      })
    })

    const finalizedPeriods = db.payrollPeriods.filter(
      (p) => p.status === 'finalized' && db.payrollLines.some((l) => l.periodId === p.id && l.employeeId === session.employeeId),
    )
    finalizedPeriods.forEach((p) => {
      notifications.push({
        id: `payslip-ready-${p.id}`,
        message: `Your payslip for "${p.label}" is now available`,
        tone: 'success',
        timestamp: new Date().toISOString(),
        link: '/ess/payslips',
      })
    })
  }

  return notifications.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
