import {
  Bell,
  CalendarDays,
  CalendarPlus,
  Clock,
  Clock3,
  CreditCard,
  FileSearch,
  ReceiptText,
  UserCircle2,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ESS_ACCENTS, EssCardWatermark, EssMetricCard } from '@/features/ess/components/EssMetricCard'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { useLeaveRequests, useLeaveTypes } from '@/features/leave/hooks/useLeave'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import { useSession } from '@/hooks/useSession'
import { getAttendanceForEmployee } from '@/lib/services/attendanceService'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { db } from '@/mock-data'
import type { AttendanceRecord, AttendanceStatus } from '@/types/domain'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function monthKeyOf(dateKey: string) {
  return dateKey.slice(0, 7)
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  undertime: 'Undertime',
  absent: 'Absent',
}

const STATUS_DOT: Record<AttendanceStatus, string> = {
  present: 'bg-success',
  late: 'bg-warning',
  undertime: 'bg-accent',
  absent: 'bg-danger',
}

function timeOfDayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Read-only current-month attendance grid — dots color-coded by status, matching the calendar in the reference design. */
function AttendanceCalendar({ records }: { records: AttendanceRecord[] }) {
  const today = new Date()
  const recordByDate = new Map(records.map((r) => [r.date, r]))

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const leadingBlanks = firstOfMonth.getDay()
  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div>
      <p className="mb-2 text-center text-sm font-semibold">{today.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <p key={d} className="py-1 text-[11px] font-medium text-muted-foreground">
            {d}
          </p>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`blank-${idx}`} />
          const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const record = recordByDate.get(dateKey)
          const isToday = dateKey === todayKey()
          return (
            <div
              key={dateKey}
              className={cn(
                'relative flex size-8 items-center justify-center rounded-full text-xs',
                isToday ? 'bg-primary font-semibold text-primary-foreground' : 'text-foreground',
              )}
            >
              {day}
              {record && !isToday && (
                <span className={cn('absolute bottom-0.5 size-1.5 rounded-full', STATUS_DOT[record.status])} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function EssHomePage() {
  const { employee, isLoading } = useSelfEmployee()
  const { user } = useSession()
  const { requests, isLoading: isLoadingLeave } = useLeaveRequests()
  const { leaveTypes } = useLeaveTypes()
  const notifications = useNotifications()
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null)

  useEffect(() => {
    if (!employee) return
    getAttendanceForEmployee(user, employee.id).then(setRecords)
  }, [user, employee])

  if (isLoading || (employee && (records === null || isLoadingLeave))) return <Skeleton className="h-96" />
  if (!employee) {
    return <EmptyState title="No employee record linked to this account" description="Ask HR to link your user account to your employee profile." />
  }

  const allRecords = records ?? []
  const thisMonth = monthKeyOf(todayKey())
  const monthRecords = allRecords.filter((r) => monthKeyOf(r.date) === thisMonth)
  const monthStats = {
    total: monthRecords.length,
    present: monthRecords.filter((r) => r.status === 'present').length,
    late: monthRecords.filter((r) => r.status === 'late').length,
    undertime: monthRecords.filter((r) => r.status === 'undertime').length,
    absent: monthRecords.filter((r) => r.status === 'absent').length,
  }
  const todayRecord = allRecords.find((r) => r.date === todayKey())

  const leaveTypeById = new Map(leaveTypes.map((lt) => [lt.id, lt]))
  const myLeaveRequests = requests
    .filter((r) => r.employeeId === employee.id)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  const totalLeaveCredits = Object.values(employee.benefits.leaveCreditsByType).reduce((sum, days) => sum + days, 0)

  const activeLoans = db.loans.filter((l) => l.employeeId === employee.id && l.status === 'active')
  const totalMonthlyDeduction = activeLoans.reduce((sum, l) => sum + l.monthlyDeduction, 0)

  const finalizedLines = db.payrollLines
    .filter((l) => l.employeeId === employee.id)
    .filter((l) => db.payrollPeriods.find((p) => p.id === l.periodId)?.status === 'finalized')
  const latestFinalizedLine = finalizedLines.at(-1)
  const latestPeriod = latestFinalizedLine && db.payrollPeriods.find((p) => p.id === latestFinalizedLine.periodId)
  const payHistory = finalizedLines.slice(-6).map((line) => {
    const period = db.payrollPeriods.find((p) => p.id === line.periodId)
    return { label: period?.label ?? '', grossPay: line.grossPay, netPay: line.netPay }
  })

  const QUICK_ACTIONS = [
    { label: 'File Leave', icon: CalendarPlus, to: '/ess/leave' },
    { label: 'View Payslip', icon: ReceiptText, to: '/ess/payslips' },
    { label: 'View Attendance', icon: Clock3, to: '/ess/attendance' },
    { label: 'Update Profile', icon: UserCircle2, to: '/ess/profile' },
    { label: 'Loan Inquiry', icon: CreditCard, to: '/ess/loans' },
    { label: 'Notifications', icon: Bell, to: '/notifications' },
  ]

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <Card className="flex flex-col items-start gap-4 overflow-hidden p-6 sm:flex-row sm:items-center">
        <Avatar name={user.name} size="lg" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {timeOfDayGreeting()}, {user.name.split(' ')[0]}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your self-service summary for today.</p>
        </div>
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} &middot;{' '}
          {new Date().toLocaleDateString('en-PH', { weekday: 'long' })}
        </p>
      </Card>

      {/* Metric cards — one per Self-Service nav item that has a natural summary number */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <EssMetricCard
          to="/ess/attendance"
          accent="teal"
          icon={Clock}
          label="Attendance Today"
          value={todayRecord ? STATUS_LABEL[todayRecord.status] : 'No record'}
          linkLabel="View attendance"
        />
        <EssMetricCard
          to="/ess/leave"
          accent="emerald"
          icon={CalendarDays}
          label="Leave Credits"
          value={`${totalLeaveCredits} days`}
          linkLabel="View leave"
        />
        <EssMetricCard
          to="/ess/loans"
          accent="amber"
          icon={CreditCard}
          label="Loans & Deductions"
          value={formatCurrency(totalMonthlyDeduction)}
          linkLabel="View details"
        />
        <EssMetricCard
          to="/ess/payslips"
          accent="indigo"
          icon={ReceiptText}
          label="Last Payslip"
          value={latestFinalizedLine ? formatCurrency(latestFinalizedLine.netPay) : '—'}
          hint={latestPeriod ? formatDate(latestPeriod.payDate) : undefined}
          linkLabel="View payslip"
        />
      </div>

      {/* My Attendance + My Leave */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-slate-100 lg:col-span-2 dark:border-white/10" style={{ backgroundImage: ESS_ACCENTS.teal.gradient }}>
          <EssCardWatermark icon={Clock} className={ESS_ACCENTS.teal.watermark} />
          <Card.Header className="relative items-center">
            <Card.Title>My Attendance</Card.Title>
            <Link to="/ess/attendance" className="text-xs font-medium text-primary">
              View all
            </Link>
          </Card.Header>
          <Card.Body className="relative grid gap-6 pt-2 sm:grid-cols-2">
            <AttendanceCalendar records={monthRecords} />
            <div>
              {monthStats.late === 0 && monthStats.absent === 0 && monthStats.undertime === 0 && (
                <div className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
                  You&apos;re all set! No attendance issues this month.
                </div>
              )}
              <dl className="divide-y divide-border text-sm">
                {[
                  ['Total Days', monthStats.total],
                  ['Present', monthStats.present],
                  ['Late', monthStats.late],
                  ['Undertime', monthStats.undertime],
                  ['Absent', monthStats.absent],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between py-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card.Body>
        </Card>

        <Card className="relative overflow-hidden border-slate-100 dark:border-white/10" style={{ backgroundImage: ESS_ACCENTS.emerald.gradient }}>
          <EssCardWatermark icon={CalendarDays} className={ESS_ACCENTS.emerald.watermark} />
          <Card.Header className="relative items-center">
            <Card.Title>My Leave</Card.Title>
            <Link to="/ess/leave" className="text-xs font-medium text-primary">
              View all
            </Link>
          </Card.Header>
          <Card.Body className="relative space-y-3 pt-2">
            {myLeaveRequests.length === 0 ? (
              <EmptyState title="No leave requests yet" description="File one from the Quick Actions below." />
            ) : (
              myLeaveRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium leading-tight">{leaveTypeById.get(request.leaveTypeId)?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(request.dateFrom)} &ndash; {formatDate(request.dateTo)}
                      </p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                </div>
              ))
            )}
          </Card.Body>
        </Card>
      </div>

      {/* Quick Actions + Notifications + Payslip history */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-slate-100 dark:border-white/10" style={{ backgroundImage: ESS_ACCENTS.indigo.gradient }}>
          <EssCardWatermark icon={Zap} className={ESS_ACCENTS.indigo.watermark} />
          <Card.Header className="relative">
            <Card.Title>Quick Actions</Card.Title>
          </Card.Header>
          <Card.Body className="relative pt-2">
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map(({ label, icon: Icon, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 bg-card/80 p-4 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-white/10"
                >
                  <Icon className="size-5 text-primary" />
                  <span className="text-xs font-medium leading-snug">{label}</span>
                </Link>
              ))}
            </div>
          </Card.Body>
        </Card>

        <Card className="relative overflow-hidden border-slate-100 dark:border-white/10" style={{ backgroundImage: ESS_ACCENTS.amber.gradient }}>
          <EssCardWatermark icon={Bell} className={ESS_ACCENTS.amber.watermark} />
          <Card.Header className="relative items-center">
            <Card.Title>Recent Notifications</Card.Title>
            <Link to="/notifications" className="text-xs font-medium text-primary">
              View all
            </Link>
          </Card.Header>
          <Card.Body className="relative space-y-3 pt-2">
            {notifications.length === 0 ? (
              <EmptyState icon={FileSearch} title="No notifications yet" />
            ) : (
              notifications.slice(0, 3).map((n) => (
                <div key={n.id} className="flex items-start gap-2.5 rounded-lg bg-muted/60 p-3">
                  <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm leading-snug">{n.message}</p>
                    <Badge tone={n.tone === 'success' ? 'success' : n.tone === 'danger' ? 'danger' : n.tone === 'warning' ? 'warning' : 'neutral'} className="mt-1">
                      {formatDate(n.timestamp)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </Card.Body>
        </Card>

        <Card className="relative overflow-hidden border-slate-100 dark:border-white/10" style={{ backgroundImage: ESS_ACCENTS.indigo.gradient }}>
          <EssCardWatermark icon={ReceiptText} className={ESS_ACCENTS.indigo.watermark} />
          <Card.Header className="relative">
            <div>
              <Card.Title>Payslip History</Card.Title>
              <Card.Description>Gross vs. net pay, last {payHistory.length || 0} payslips</Card.Description>
            </div>
          </Card.Header>
          <Card.Body className="relative h-56 pt-2">
            {payHistory.length === 0 ? (
              <EmptyState title="No payslips yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payHistory} margin={{ left: -12, right: 8, top: 8 }} barGap={4}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" width={40} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-card)', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="grossPay" name="Gross Pay" fill="var(--color-brand-400)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netPay" name="Net Pay" fill="var(--color-brand-700)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
