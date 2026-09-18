import {
  CalendarClock,
  CalendarPlus,
  Clock3,
  FileBarChart2,
  Megaphone,
  Plane,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useAdminDashboardOverview } from '@/features/dashboard/hooks/useDashboardData'
import { PendingRequestsCard } from '@/features/dashboard/components/PendingRequestsCard'
import { formatCurrency } from '@/lib/utils/format'

function timeOfDayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function AdminMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  hint: string
  icon: typeof Users
  tone: 'brand' | 'success' | 'warning' | 'accent' | 'default'
}) {
  const toneClasses: Record<typeof tone, string> = {
    brand: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
    default: 'bg-muted text-muted-foreground',
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={`flex size-8 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="font-display text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Card>
  )
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
  { label: 'Add Overtime', icon: Clock3, to: '/attendance' },
  { label: 'Generate Report', icon: FileBarChart2, to: '/reports' },
]

export function AdminDashboard() {
  const { overview, isLoading } = useAdminDashboardOverview()

  if (isLoading || !overview) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  const { metrics, payrollChart, payrollCalendar, recentEmployees, announcements } = overview
  const today = new Date()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {timeOfDayGreeting()}, {overview.greetingName}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your payroll today.</p>
        </div>
        <p className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
          {today.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })} |{' '}
          {today.toLocaleDateString('en-PH', { weekday: 'long' })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AdminMetricCard
          label="Total Employees"
          value={String(metrics.totalEmployees)}
          hint={`Active: ${metrics.activeEmployees} | Inactive: ${metrics.inactiveEmployees}`}
          icon={Users}
          tone="brand"
        />
        <AdminMetricCard
          label="Present Today"
          value={String(metrics.presentToday)}
          hint={`${metrics.attendanceRate}% attendance rate`}
          icon={CalendarClock}
          tone="success"
        />
        <AdminMetricCard
          label="On Leave Today"
          value={String(metrics.onLeaveToday)}
          hint={`${metrics.leaveApproved} approved | ${metrics.leavePending} pending`}
          icon={Plane}
          tone="warning"
        />
        <AdminMetricCard
          label="With Overtime Today"
          value={String(metrics.overtimeToday)}
          hint={`${metrics.overtimeEmployees} employees`}
          icon={Clock3}
          tone="accent"
        />
        <AdminMetricCard
          label="Payroll Status"
          value={metrics.payrollStatusLabel}
          hint={metrics.payrollCutoffLabel}
          icon={Wallet}
          tone="brand"
        />
      </div>

      <PendingRequestsCard />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header>
            <div>
              <Card.Title>Payroll Summary</Card.Title>
              <Card.Description>Gross pay vs. net pay, last 6 months</Card.Description>
            </div>
          </Card.Header>
          <Card.Body className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollChart} margin={{ left: 4, right: 8, top: 8 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  tickFormatter={(v: number) => `₱${(v / 1_000_000).toFixed(0)}M`}
                  width={40}
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

        <Card>
          <Card.Header>
            <Card.Title>Upcoming Payroll Calendar</Card.Title>
          </Card.Header>
          <Card.Body className="pt-2">
            <ol className="relative space-y-5 border-l border-border pl-5">
              {payrollCalendar.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[27px] top-0.5 flex size-4 items-center justify-center rounded-full bg-primary" />
                  <Badge tone="brand" className="mb-1">
                    {event.dateLabel}
                  </Badge>
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                </li>
              ))}
            </ol>
          </Card.Body>
        </Card>
      </div>

      <Card className="flex flex-col items-center gap-4 overflow-hidden p-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">Payroll Made Easier</p>
            <p className="text-sm text-muted-foreground">Everything you need to run payroll accurately, in one place.</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/employees">View Employees</Link>
        </Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title>Recent Employees</Card.Title>
          </Card.Header>
          <Card.Body className="pt-2">
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
                        <span className="text-sm font-medium">{employee.name}</span>
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

        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title>Quick Actions</Card.Title>
          </Card.Header>
          <Card.Body className="pt-2">
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map(({ label, icon: Icon, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Icon className="size-5 text-primary" />
                  <span className="text-xs font-medium leading-snug">{label}</span>
                </Link>
              ))}
            </div>
          </Card.Body>
        </Card>

        <Card className="lg:col-span-1">
          <Card.Header>
            <Card.Title>Latest Announcements</Card.Title>
          </Card.Header>
          <Card.Body className="space-y-3 pt-2">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="flex items-start gap-2.5 rounded-lg bg-muted/60 p-3">
                <Megaphone className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium leading-snug">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground">{announcement.dateLabel}</p>
                </div>
              </div>
            ))}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
