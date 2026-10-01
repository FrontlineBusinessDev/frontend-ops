import {
  CalendarClock,
  CheckCircle2,
  CalendarDays,
  CalendarPlus,
  Clock3,
  FileBarChart2,
  BellRing,
  Plane,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useAdminDashboardOverview } from '@/features/dashboard/hooks/useDashboardData'
import { PendingRequestsCard } from '@/features/dashboard/components/PendingRequestsCard'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/format'

function timeOfDayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const RECENT_EMPLOYEE_STATUS_LABEL: Record<string, string> = {
  active: 'active',
  on_leave: 'pending',
  inactive: 'inactive',
}

const QUICK_ACTIONS = [
  { label: 'Add Employee', icon: UserPlus, to: '/employees' },
  { label: 'Process Payroll', icon: Wallet, to: '/payroll' },
  { label: 'Record Attendance', icon: Clock3, to: '/attendance' },
  { label: 'File Leave', icon: CalendarPlus, to: '/leave' },
  { label: 'Add Overtime', icon: Clock3, to: '/overtime' },
  { label: 'Generate Report', icon: FileBarChart2, to: '/reports' },
]

/** "Due today", "Tomorrow", "In 5 days", "Overdue by 2 days" — plus a badge tone that gets louder as the date nears. */
function dueStatus(daysLeft: number, remindDaysBefore: number): { text: string; tone: 'danger' | 'warning' | 'neutral' } {
  if (daysLeft < 0) return { text: `Overdue by ${-daysLeft} day${daysLeft === -1 ? '' : 's'}`, tone: 'danger' }
  if (daysLeft === 0) return { text: 'Due today', tone: 'danger' }
  if (daysLeft === 1) return { text: 'Tomorrow', tone: 'danger' }
  return { text: `In ${daysLeft} days`, tone: daysLeft <= remindDaysBefore ? 'warning' : 'neutral' }
}

/** "₱4.86M" */
function compactPeso(value: number) {
  return `₱${(value / 1_000_000).toFixed(2)}M`
}

function ViewAllLink({ to }: { to: string }) {
  return (
    <Link to={to} className="text-xs font-medium text-primary hover:underline">
      View all
    </Link>
  )
}

export function AdminDashboard() {
  const { overview, isLoading } = useAdminDashboardOverview()

  if (isLoading || !overview) {
    return (
      <div className="dashboard-elevated grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    )
  }

  const { metrics, payrollChart, payrollCalendar, recentEmployees, reminders } = overview
  const today = new Date()
  const latest = payrollChart[payrollChart.length - 1]
  const previous = payrollChart[payrollChart.length - 2]
  const deductionRate = latest ? Math.round(((latest.grossPay - latest.netPay) / latest.grossPay) * 1000) / 10 : 0
  const grossChange = latest && previous ? Math.round(((latest.grossPay - previous.grossPay) / previous.grossPay) * 1000) / 10 : 0
  const sixMonthNet = payrollChart.reduce((sum, m) => sum + m.netPay, 0)

  return (
    <div className="dashboard-elevated space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {timeOfDayGreeting()}, {overview.greetingName}!
          </h1>
        </div>
        <p className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
          {today.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} |{' '}
          {today.toLocaleDateString('en-PH', { weekday: 'long' })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Total Employees"
          value={String(metrics.totalEmployees)}
          hint={`Active: ${metrics.activeEmployees} | Inactive: ${metrics.inactiveEmployees}`}
          icon={Users}
          tone="primary"
          footer={{ label: 'View Employees', to: '/employees' }}
        />
        <MetricCard
          label="Present Today"
          value={String(metrics.presentToday)}
          hint={`${metrics.attendanceRate}% attendance rate`}
          icon={CalendarClock}
          tone="success"
          footer={{ label: 'View Attendance', to: '/attendance' }}
        />
        <MetricCard
          label="On Leave Today"
          value={String(metrics.onLeaveToday)}
          hint={`${metrics.leaveApproved} approved | ${metrics.leavePending} pending`}
          icon={Plane}
          tone="warning"
          footer={{ label: 'View Leave', to: '/leave' }}
        />
        <MetricCard
          label="With Overtime Today"
          value={`${metrics.overtimeHours} hrs`}
          hint={`${metrics.overtimeEmployees} employees with approved OT`}
          icon={Clock3}
          tone="accent"
          footer={{ label: 'View Overtime', to: '/overtime' }}
        />
        <MetricCard
          label="Payroll Status"
          value={metrics.payrollStatusLabel}
          hint={`Next cut-off: ${metrics.nextCutoffLabel}`}
          icon={Wallet}
          tone="primary"
          footer={{ label: 'View Payroll', to: '/payroll' }}
        />
      </div>

      <PendingRequestsCard />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card data-tint="lavender" watermark={Wallet} className="relative overflow-hidden lg:col-span-2">
          <Card.Header className="relative items-center">
            <div>
              <Card.Title>Payroll Summary</Card.Title>
              <Card.Description>Gross pay vs. net pay, last 6 months</Card.Description>
            </div>
            <ViewAllLink to="/payroll" />
          </Card.Header>
          <div className="relative grid grid-cols-2 gap-3 px-5 pt-1 sm:grid-cols-4">
            {[
              { label: `${latest?.month} Gross Pay`, value: formatCurrency(latest?.grossPay ?? 0), sub: `${grossChange >= 0 ? '+' : ''}${grossChange}% vs ${previous?.month}` },
              { label: `${latest?.month} Net Pay`, value: formatCurrency(latest?.netPay ?? 0), sub: 'Credited to employees' },
              { label: 'Deductions', value: formatCurrency((latest?.grossPay ?? 0) - (latest?.netPay ?? 0)), sub: `${deductionRate}% of gross (statutory, tax, loans)` },
              { label: '6-Month Net Payout', value: compactPeso(sixMonthNet), sub: `${payrollChart[0]?.month} – ${latest?.month}` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-card/70 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <p className="font-display text-base font-semibold tabular-nums">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
              </div>
            ))}
          </div>
          <Card.Body className="relative h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollChart} margin={{ left: 4, right: 8, top: 8 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  tickFormatter={(v: number) => `₱${(v / 1_000_000).toFixed(1)}M`}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-card)',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="grossPay" name="Gross Pay" fill="var(--color-brand-400)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netPay" name="Net Pay" fill="var(--color-brand-700)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        <Card data-tint="sage" watermark={CalendarDays} className="relative overflow-hidden">
          <Card.Header className="relative">
            <Card.Title>Upcoming Payroll Calendar</Card.Title>
          </Card.Header>
          <Card.Body className="relative pt-2">
            <ol className="relative space-y-5 border-l border-border pl-5">
              {payrollCalendar.map((event) => (
                <li key={event.id} className={cn('relative', event.state === 'done' && 'opacity-70')}>
                  <span
                    className={cn(
                      'absolute -left-[27px] top-0.5 flex size-4 items-center justify-center rounded-full',
                      event.state === 'done' ? 'bg-success text-white' : event.state === 'current' ? 'bg-primary ring-4 ring-primary/25' : 'border-2 border-primary bg-card',
                    )}
                  >
                    {event.state === 'done' && <CheckCircle2 className="size-3" />}
                  </span>
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone={event.state === 'done' ? 'success' : 'brand'}>{event.dateLabel}</Badge>
                    {event.state === 'done' && <span className="text-[11px] font-medium text-success">Done</span>}
                    {event.state === 'current' && <span className="text-[11px] font-medium text-primary">Today</span>}
                  </div>
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </li>
              ))}
            </ol>
          </Card.Body>
        </Card>
      </div>

      <Card data-tint="peach" watermark={Sparkles} className="relative flex flex-col items-center gap-4 overflow-hidden p-6 sm:flex-row sm:justify-between">
        <div className="relative flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card/80 text-primary shadow-sm">
            <Sparkles className="size-6" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">Payroll Made Easier</p>
            <p className="text-sm text-muted-foreground">Everything you need to run payroll accurately, in one place.</p>
          </div>
        </div>
        <Button asChild className="relative">
          <Link to="/employees">View Employees</Link>
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card data-tint="sage" watermark={Users} className="relative overflow-hidden lg:col-span-1">
          <Card.Header className="relative items-center">
            <Card.Title>Recent Employees</Card.Title>
            <ViewAllLink to="/employees" />
          </Card.Header>
          <Card.Body className="relative pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={employee.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{employee.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {employee.position} · hired {employee.hiredLabel}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{employee.department}</TableCell>
                    <TableCell>
                      <StatusBadge status={RECENT_EMPLOYEE_STATUS_LABEL[employee.status] ?? employee.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card.Body>
        </Card>

        <Card data-tint="lavender" watermark={Zap} className="relative overflow-hidden lg:col-span-1">
          <Card.Header className="relative">
            <Card.Title>Quick Actions</Card.Title>
          </Card.Header>
          <Card.Body className="relative pt-2">
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map(({ label, icon: Icon, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 bg-card p-4 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-white/10"
                >
                  <Icon className="size-5 text-primary" />
                  <span className="text-xs font-medium leading-snug">{label}</span>
                </Link>
              ))}
            </div>
          </Card.Body>
        </Card>

        <Card data-tint="peach" watermark={BellRing} className="relative overflow-hidden lg:col-span-1">
          <Card.Header className="relative">
            <Card.Title>Reminders</Card.Title>
          </Card.Header>
          <Card.Body className="relative space-y-3 pt-2">
            {reminders.map((reminder) => {
              const status = dueStatus(reminder.daysLeft, reminder.remindDaysBefore)
              return (
                <Link
                  key={reminder.id}
                  to={reminder.to}
                  className="flex items-start gap-2.5 rounded-lg bg-card/70 p-3 transition-colors hover:bg-card"
                >
                  <BellRing className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium leading-snug">{reminder.title}</p>
                      <Badge tone="brand">{reminder.category}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{reminder.summary}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <span className="text-muted-foreground/80">Due {reminder.dueLabel}</span>
                      <Badge tone={status.tone}>{status.text}</Badge>
                    </div>
                  </div>
                </Link>
              )
            })}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
