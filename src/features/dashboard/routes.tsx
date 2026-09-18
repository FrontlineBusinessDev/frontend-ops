import { AlertTriangle, CalendarCheck, ListChecks, Users, Wallet } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard'
import { StatCard } from '@/features/dashboard/components/StatCard'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useSession } from '@/hooks/useSession'
import { formatDate } from '@/lib/utils/format'

export function DashboardPage() {
  const { user } = useSession()

  // Company Admin gets the enriched operational dashboard; every other role
  // (HR/Payroll Admin, Manager, Super Admin) keeps the existing dashboard below untouched.
  if (user.role === 'company_admin') {
    return <AdminDashboard />
  }

  return <DefaultDashboard />
}

function DefaultDashboard() {
  const { stats, trend, isLoading } = useDashboardData()

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A quick read on payroll status, workforce health, and what needs your attention."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Employee Count" value={String(stats.headcount)} icon={Users} tone="brand" hint={`${stats.activeHeadcount} active`} />
        <StatCard
          label="Next Payroll Date"
          value={formatDate(stats.nextPayrollDate, { month: 'short', day: 'numeric' })}
          icon={Wallet}
          hint={stats.payrollPeriodLabel}
        />
        <StatCard label="Pending Approvals" value={String(stats.pendingApprovals)} icon={ListChecks} hint="Awaiting your action" />
        <StatCard label="On Leave Today" value={String(stats.onLeaveToday)} icon={CalendarCheck} hint={`${stats.attendanceRate}% attendance rate`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header>
            <div>
              <Card.Title>Headcount Trend</Card.Title>
              <Card.Description>Last 6 months, current company</Card.Description>
            </div>
            <Badge tone="brand" className="capitalize">
              {stats.payrollStatus}
            </Badge>
          </Card.Header>
          <Card.Body className="h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="headcountFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-card)',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="headcount"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#headcountFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Payroll Alerts</Card.Title>
          </Card.Header>
          <Card.Body className="space-y-3 pt-2">
            {stats.alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-2.5 rounded-lg bg-muted/60 p-3">
                <AlertTriangle
                  className={alert.tone === 'danger' ? 'mt-0.5 size-4 shrink-0 text-danger' : 'mt-0.5 size-4 shrink-0 text-warning'}
                />
                <p className="text-sm leading-snug text-foreground">{alert.message}</p>
              </div>
            ))}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
