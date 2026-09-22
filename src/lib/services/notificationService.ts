import { buildSampleLoans, buildSamplePayslips } from '@/features/ess/sampleData'
import { getAttendanceAdjustments } from '@/lib/services/attendanceService'
import { getLeaveRequests } from '@/lib/services/leaveService'
import { getPayrollPeriods } from '@/lib/services/payrollService'
import { roleHasCapability } from '@/lib/rbac/permissions'
import { formatCurrency } from '@/lib/utils/format'
import { db } from '@/mock-data'
import type { SessionUser } from '@/types/domain'

export interface AppNotification {
  id: string
  message: string
  tone: 'default' | 'success' | 'warning' | 'danger'
  timestamp: string
  link?: string
  /** Record id to scroll to and briefly highlight on the destination page, if the notification refers to one specific row. */
  highlightId?: string
  /** Tab to switch to on the destination page before highlighting, for pages where the target lives on a non-default tab. */
  tab?: string
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
        highlightId: pendingLeave[0].id,
      })
    }
    if (pendingAdjustments.length > 0) {
      notifications.push({
        id: 'pending-adjustments',
        message: `${pendingAdjustments.length} attendance adjustment${pendingAdjustments.length === 1 ? '' : 's'} awaiting your approval`,
        tone: 'warning',
        timestamp: new Date().toISOString(),
        link: '/attendance',
        highlightId: pendingAdjustments[0].id,
        tab: 'adjustments',
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
      const line = db.payrollLines.find((l) => l.periodId === p.id && l.employeeId === session.employeeId)
      notifications.push({
        id: `payslip-ready-${p.id}`,
        message: `Your payslip for "${p.label}" is now available`,
        tone: 'success',
        timestamp: new Date().toISOString(),
        link: '/ess/payslips',
        highlightId: line?.id,
      })
    })

    const employee = db.employees.find((e) => e.id === session.employeeId)
    if (employee) {
      // Payroll hasn't been run yet this session (payroll periods/lines reset on every full
      // reload) — surface the same illustrative payslip shown on `/ess/payslips` so the
      // notification's highlight always lands on a visible row.
      if (finalizedPeriods.length === 0) {
        const latestSample = buildSamplePayslips(employee, employee.companyId).at(-1)!
        notifications.push({
          id: `payslip-ready-${latestSample.line.id}`,
          message: `Your payslip for "${latestSample.period.label}" is now available`,
          tone: 'success',
          timestamp: new Date().toISOString(),
          link: '/ess/payslips',
          highlightId: latestSample.line.id,
        })
      }

      // Loan payment confirmation — from real repayment history if this employee has one,
      // else the same illustrative sample loan shown on `/ess/loans` when there's no real
      // loan yet.
      const loanWithHistory = db.loans.find((l) => l.employeeId === employee.id && l.repaymentHistory && l.repaymentHistory.length > 0)
      if (loanWithHistory) {
        const lastPayment = loanWithHistory.repaymentHistory!.at(-1)!
        notifications.push({
          id: `loan-payment-${loanWithHistory.id}`,
          message: `Loan payment of ${formatCurrency(lastPayment.amount)} processed for "${loanWithHistory.label}"`,
          tone: 'success',
          timestamp: lastPayment.date,
          link: '/ess/loans',
          highlightId: loanWithHistory.id,
        })
      } else {
        const sampleLoan = buildSampleLoans(employee.id, employee.companyId)[0]
        notifications.push({
          id: `loan-payment-${sampleLoan.id}`,
          message: `Loan payment of ${formatCurrency(sampleLoan.monthlyDeduction)} processed for "${sampleLoan.label}"`,
          tone: 'success',
          timestamp: new Date().toISOString(),
          link: '/ess/loans',
          highlightId: sampleLoan.id,
        })
      }
    }
  }

  return notifications.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
