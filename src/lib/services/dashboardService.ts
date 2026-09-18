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
    payrollStatusLabel: string
    payrollCutoffLabel: string
  }
  payrollChart: { month: string; grossPay: number; netPay: number }[]
  payrollCalendar: { id: string; dateLabel: string; title: string; description: string }[]
  recentEmployees: { id: string; name: string; department: string; status: 'active' | 'on_leave' | 'inactive' }[]
  announcements: { id: string; title: string; dateLabel: string }[]
}

/**
 * Company Admin's home dashboard. Numbers are illustrative mock data (not
 * derived from the live employee roster) so the widget set — payroll trend,
 * upcoming payroll calendar, recent hires, announcements — renders fully
 * out of the box regardless of how much seed data a demo company has.
 */
export async function getAdminDashboardOverview(session: SessionUser): Promise<AdminDashboardOverview> {
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
      overtimeToday: 14,
      overtimeEmployees: 11,
      payrollStatusLabel: 'Ready for Processing',
      payrollCutoffLabel: 'Cut-off: Sep 15, 2026',
    },
    payrollChart: [
      { month: 'Apr', grossPay: 4850000, netPay: 4120000 },
      { month: 'May', grossPay: 4920000, netPay: 4180000 },
      { month: 'Jun', grossPay: 5100000, netPay: 4340000 },
      { month: 'Jul', grossPay: 5260000, netPay: 4460000 },
      { month: 'Aug', grossPay: 5480000, netPay: 4650000 },
      { month: 'Sep', grossPay: 5720000, netPay: 4860000 },
    ],
    payrollCalendar: [
      {
        id: 'cutoff',
        dateLabel: 'SEP 15',
        title: 'Cut-off Date',
        description: 'Time and attendance, leaves, OT, and loans finalization.',
      },
      {
        id: 'processing',
        dateLabel: 'SEP 18',
        title: 'Payroll Processing',
        description: 'Generate and review payroll.',
      },
      {
        id: 'release',
        dateLabel: 'SEP 20',
        title: 'Payroll Release',
        description: 'Salaries credited to accounts.',
      },
    ],
    recentEmployees: [
      { id: 'e1', name: 'Maria Santos', department: 'Human Resources', status: 'active' },
      { id: 'e2', name: 'Juan Dela Cruz', department: 'Sales', status: 'active' },
      { id: 'e3', name: 'Ana Reyes', department: 'Finance', status: 'on_leave' },
      { id: 'e4', name: 'Carlos Mendoza', department: 'Warehouse', status: 'active' },
      { id: 'e5', name: 'Lea Garcia', department: 'Customer Support', status: 'active' },
    ],
    announcements: [
      { id: 'ann1', title: 'Payroll Cut-off Reminder', dateLabel: 'Sep 10, 2026' },
      { id: 'ann2', title: 'PhilHealth Contribution Update', dateLabel: 'Sep 5, 2026' },
      { id: 'ann3', title: 'BIR Form 2316 Reminder', dateLabel: 'Aug 28, 2026' },
    ],
  }
}
