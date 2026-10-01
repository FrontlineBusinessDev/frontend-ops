import { getAttendanceAdjustments } from '@/lib/services/attendanceService'
import { getCompensationApprovals } from '@/lib/services/compensationApprovalService'
import { getLeaveRequests } from '@/lib/services/leaveService'
import { getOvertimeRecords } from '@/lib/services/overtimeService'
import { scopeForSession } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { SessionUser } from '@/types/domain'

export interface DashboardStats {
  headcount: number
  activeHeadcount: number
  nextPayrollDate: string
  payrollPeriodLabel: string
  payrollStatus: 'open' | 'review' | 'approved' | 'finalized'
  pendingApprovals: number
  attendanceRate: number
  onLeaveToday: number
  alerts: { id: string; message: string; tone: 'warning' | 'danger' }[]
}

export async function getDashboardStats(session: SessionUser): Promise<DashboardStats> {
  const employees = scopeForSession(db.employees, session)
  const active = employees.filter((e) => e.employment.status === 'active')

  return {
    headcount: employees.length,
    activeHeadcount: active.length,
    nextPayrollDate: '2026-09-30',
    payrollPeriodLabel: 'Sep 16 – Sep 30, 2026',
    payrollStatus: 'open',
    pendingApprovals: Math.max(2, Math.round(active.length * 0.12)),
    attendanceRate: 96.4,
    onLeaveToday: Math.max(0, Math.round(active.length * 0.05)),
    alerts: [
      { id: 'a1', message: 'Statutory contribution rate table for 2026 needs review before the next payroll run.', tone: 'warning' },
      { id: 'a2', message: `${Math.max(1, Math.round(active.length * 0.08))} employees have incomplete government ID numbers.`, tone: 'danger' },
    ],
  }
}

export function getHeadcountTrend(session: SessionUser) {
  const employees = scopeForSession(db.employees, session)
  const base = Math.max(4, employees.length - 10)
  return Array.from({ length: 6 }).map((_, i) => ({
    month: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][i],
    headcount: base + i * 2,
  }))
}

export interface AdminDashboardOverview {
  greetingName: string
  metrics: {
    totalEmployees: number
    activeEmployees: number
    inactiveEmployees: number
    presentToday: number
    attendanceRate: number
    onLeaveToday: number
    leaveApproved: number
    leavePending: number
    overtimeToday: number
    overtimeEmployees: number
    /** Approved overtime hours logged today. */
    overtimeHours: number
    payrollStatusLabel: string
    payrollCutoffLabel: string
    /** The pay period currently in the payroll cycle, e.g. "Sep 16 – 30, 2026". */
    payrollPeriodLabel: string
    nextCutoffLabel: string
  }
  payrollChart: { month: string; grossPay: number; netPay: number }[]
  payrollCalendar: { id: string; dateLabel: string; fullDate: string; title: string; description: string; state: 'done' | 'current' | 'upcoming' }[]
  recentEmployees: { id: string; name: string; department: string; position: string; hiredLabel: string; status: 'active' | 'on_leave' | 'inactive' }[]
  announcements: { id: string; title: string; summary: string; category: 'Reminder' | 'Notice' | 'Policy' | 'Event'; dateLabel: string }[]
}

export interface PendingRequestsSummary {
  leavePending: number
  overtimePending: number
  nightDiffPending: number
  attendanceAdjustmentsPending: number
  compensationApprovalsPending: number
}

/** Real, live counts of everything awaiting admin review — powers the Dashboard's "Pending Requests" widget. */
export async function getPendingRequestsSummary(session: SessionUser): Promise<PendingRequestsSummary> {
  const [leaveRequests, overtimeRecords, adjustments, compensationApprovals] = await Promise.all([
    getLeaveRequests(session),
    getOvertimeRecords(session),
    getAttendanceAdjustments(session),
    getCompensationApprovals(session),
  ])

  return {
    leavePending: leaveRequests.filter((r) => r.status === 'pending').length,
    overtimePending: overtimeRecords.filter((r) => r.status === 'pending' && r.type !== 'night_diff').length,
    nightDiffPending: overtimeRecords.filter((r) => r.status === 'pending' && r.type === 'night_diff').length,
    attendanceAdjustmentsPending: adjustments.filter((a) => a.status === 'pending').length,
    compensationApprovalsPending: compensationApprovals.filter((a) => a.status === 'pending').length,
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const fmtShort = (d: Date) => `${MONTHS[d.getMonth()].toUpperCase()} ${d.getDate()}`
const fmtLong = (d: Date) => d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

/** Semi-monthly cut-offs (15th and month-end) around `today`, each with its processing (+3 days) and release (+5 days) dates. */
function payrollCycles(today: Date) {
  const cycles: { periodStart: Date; cutoff: Date; processing: Date; release: Date }[] = []
  for (let m = -1; m <= 1; m++) {
    const year = today.getFullYear()
    const month = today.getMonth() + m
    const mid = new Date(year, month, 15)
    const end = new Date(year, month + 1, 0)
    cycles.push({ periodStart: new Date(year, month, 1), cutoff: mid, processing: addDays(mid, 3), release: addDays(mid, 5) })
    cycles.push({ periodStart: new Date(year, month, 16), cutoff: end, processing: addDays(end, 3), release: addDays(end, 5) })
  }
  return cycles
}

/**
 * Company Admin's home dashboard. Numbers are illustrative mock data (not
 * derived from the live employee roster) so the widget set — payroll trend,
 * upcoming payroll calendar, recent hires, announcements — renders fully
 * out of the box regardless of how much seed data a demo company has.
 * Dates are relative to today so the payroll calendar is always "upcoming".
 */
export async function getAdminDashboardOverview(session: SessionUser): Promise<AdminDashboardOverview> {
  const today = startOfDay(new Date())

  // The cycle in progress: the first one whose release date hasn't passed yet.
  const cycles = payrollCycles(today)
  const current = cycles.find((c) => c.release >= today) ?? cycles[cycles.length - 1]
  const next = cycles[cycles.indexOf(current) + 1] ?? current
  const stateOf = (d: Date): 'done' | 'current' | 'upcoming' => (d < today ? 'done' : d.getTime() === today.getTime() ? 'current' : 'upcoming')
  const status =
    today < current.cutoff
      ? 'Open for Cut-off'
      : today < current.processing
        ? 'Ready for Processing'
        : today < current.release
          ? 'Processing'
          : 'Releasing Today'
  const periodLabel = `${MONTHS[current.periodStart.getMonth()]} ${current.periodStart.getDate()} – ${current.cutoff.getDate()}, ${current.cutoff.getFullYear()}`

  // Last six completed months for the payroll trend (e.g. Apr–Sep when viewed in October).
  const PAYROLL_TREND = [
    { grossPay: 4850000, netPay: 4120000 },
    { grossPay: 4920000, netPay: 4180000 },
    { grossPay: 5100000, netPay: 4340000 },
    { grossPay: 5260000, netPay: 4460000 },
    { grossPay: 5480000, netPay: 4650000 },
    { grossPay: 5720000, netPay: 4860000 },
  ]
  const payrollChart = PAYROLL_TREND.map((values, i) => ({ month: MONTHS[(today.getMonth() - 6 + i + 12) % 12], ...values }))
  const daysAgo = (n: number) => fmtLong(addDays(today, -n))

  return {
    greetingName: session.name.split(' ')[0],
    metrics: {
      totalEmployees: 128,
      activeEmployees: 120,
      inactiveEmployees: 8,
      presentToday: 112,
      attendanceRate: 87.5,
      onLeaveToday: 8,
      leaveApproved: 6,
      leavePending: 2,
      overtimeToday: 11,
      overtimeEmployees: 11,
      overtimeHours: 26.5,
      payrollStatusLabel: status,
      payrollCutoffLabel: `Cut-off: ${fmtLong(current.cutoff)}`,
      payrollPeriodLabel: periodLabel,
      nextCutoffLabel: fmtLong(today <= current.cutoff ? current.cutoff : next.cutoff),
    },
    payrollChart,
    payrollCalendar: [
      {
        id: 'cutoff',
        dateLabel: fmtShort(current.cutoff),
        fullDate: fmtLong(current.cutoff),
        title: 'Cut-off Date',
        description: `Time and attendance, leaves, OT, and loans finalization for ${periodLabel}.`,
        state: stateOf(current.cutoff),
      },
      {
        id: 'processing',
        dateLabel: fmtShort(current.processing),
        fullDate: fmtLong(current.processing),
        title: 'Payroll Processing',
        description: 'Generate, review, and approve the payroll run.',
        state: stateOf(current.processing),
      },
      {
        id: 'release',
        dateLabel: fmtShort(current.release),
        fullDate: fmtLong(current.release),
        title: 'Payroll Release',
        description: 'Salaries credited to employee bank accounts; payslips emailed.',
        state: stateOf(current.release),
      },
      {
        id: 'next-cutoff',
        dateLabel: fmtShort(next.cutoff),
        fullDate: fmtLong(next.cutoff),
        title: 'Next Cut-off',
        description: 'Following pay period closes.',
        state: stateOf(next.cutoff),
      },
    ],
    recentEmployees: [
      { id: 'e1', name: 'Maria Santos', department: 'Human Resources', position: 'HR Associate', hiredLabel: daysAgo(3), status: 'active' },
      { id: 'e2', name: 'Juan Dela Cruz', department: 'Sales', position: 'Account Executive', hiredLabel: daysAgo(8), status: 'active' },
      { id: 'e3', name: 'Ana Reyes', department: 'Finance', position: 'Payroll Analyst', hiredLabel: daysAgo(12), status: 'on_leave' },
      { id: 'e4', name: 'Carlos Mendoza', department: 'Warehouse', position: 'Inventory Clerk', hiredLabel: daysAgo(17), status: 'active' },
      { id: 'e5', name: 'Lea Garcia', department: 'Customer Support', position: 'Support Specialist', hiredLabel: daysAgo(23), status: 'active' },
    ],
    announcements: [
      {
        id: 'ann1',
        title: 'Payroll Cut-off Reminder',
        summary: `Submit attendance adjustments, overtime, and leave requests before the ${fmtLong(today <= current.cutoff ? current.cutoff : next.cutoff)} cut-off.`,
        category: 'Reminder',
        dateLabel: daysAgo(1),
      },
      {
        id: 'ann2',
        title: 'PhilHealth Contribution Update',
        summary: 'Premium rate remains at 5% (shared 50/50) with the ₱10,000 floor and ₱100,000 ceiling for 2026.',
        category: 'Policy',
        dateLabel: daysAgo(6),
      },
      {
        id: 'ann3',
        title: 'Company Town Hall',
        summary: 'Quarterly town hall at the Makati head office, 3:00 PM — branches can join via video call.',
        category: 'Event',
        dateLabel: daysAgo(9),
      },
      {
        id: 'ann4',
        title: 'BIR Form 2316 Reminder',
        summary: 'Employees with changes in civil status or dependents should update HR before year-end.',
        category: 'Notice',
        dateLabel: daysAgo(14),
      },
    ],
  }
}
