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
