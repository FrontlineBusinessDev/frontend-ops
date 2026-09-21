import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { usePayrollGroups } from '@/features/company-settings/hooks/usePayrollGroups'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useOvertimeRecords } from '@/features/overtime/hooks/useOvertime'
import { ChartPane, downloadCsv, ReportViewShell, StatTile, TablePane, toCsv, ViewModeToggle } from '@/features/reports/components/shared'
import type { ReportViewMode } from '@/features/reports/components/shared'
import { useAllPayrollLines, useAttendanceSummary, useLeaveSummary } from '@/features/reports/hooks/useReports'
import { useTenant } from '@/hooks/useTenant'
import { findEmployeePayrollGroup } from '@/lib/payroll/groupAssignment'
import { PAY_RATE_TYPE_LABEL } from '@/lib/payroll/payRate'
import { formatCurrency } from '@/lib/utils/format'

function fullName(personal: { firstName: string; lastName: string }) {
  return `${personal.firstName} ${personal.lastName}`
}

// All chart color values below are drawn exclusively from the design system's CSS variables
// (src/styles/globals.css) — no ad-hoc hex/rgb values — so charts stay in sync with the app's
// palette (including dark mode) automatically.
const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid var(--color-border)',
  background: 'var(--color-card)',
  color: 'var(--color-card-foreground)',
  fontSize: 12,
}
const CHART_TOOLTIP_LABEL_STYLE = { color: 'var(--color-card-foreground)', fontWeight: 600, marginBottom: 4 }
const CHART_TOOLTIP_ITEM_STYLE = { color: 'var(--color-card-foreground)' }
const CHART_LEGEND_STYLE = { fontSize: 12, color: 'var(--color-foreground)' }

/** Shared categorical palette for charts with no inherent status meaning (leave types, cost dimensions, etc.). */
const CATEGORY_COLORS = [
  'var(--color-brand-500)',
  'var(--color-accent)',
  'var(--color-brand-300)',
  'var(--color-warning)',
  'var(--color-brand-700)',
  'var(--color-danger)',
]

/**
 * Hand-rolled SVG donut (percentage ring built from stroke-dasharray arcs) with a hover-driven
 * center label. Recharts' <Pie> renders blank in this app's React 19 + recharts 3.10 combination
 * (its sectors compute but never paint), so proportional breakdowns use this instead of PieChart.
 */
function DonutChart({ data, total, unit }: { data: [string, number][]; total: number; unit: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const r = 38
  const circumference = 2 * Math.PI * r

  const active = hovered != null ? data[hovered] : undefined

  const arcs = data.reduce<{ cumulative: number; items: { name: string; value: number; pct: number; dash: number; offset: number }[] }>(
    (acc, [name, value]) => {
      const pct = total > 0 ? value / total : 0
      const dash = pct * circumference
      acc.items.push({ name, value, pct, dash, offset: -acc.cumulative })
      acc.cumulative += dash
      return acc
    },
    { cumulative: 0, items: [] },
  ).items

  return (
    <div className="relative flex h-64 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full max-w-64">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth={16} />
        <g transform="rotate(-90 50 50)">
          {arcs.map(({ name, value, pct, dash, offset }, idx) => (
            <circle
              key={name}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
              strokeWidth={hovered === idx ? 18 : 16}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            >
              <title>{`${name}: ${value} ${unit} (${(pct * 100).toFixed(1)}%)`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-display text-xl font-semibold tracking-tight">{active ? active[1] : total}</p>
        <p className="max-w-24 truncate text-[11px] text-muted-foreground">{active ? active[0] : `Total ${unit}`}</p>
      </div>
    </div>
  )
}

// ---------- Workforce Analytics ----------

export function HeadcountAnalysisReport() {
  const { employees, isLoading } = useEmployees()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const byDepartment = useMemo(() => {
    const map = new Map<string, { active: number; inactive: number }>()
    for (const e of employees) {
      const bucket = map.get(e.employment.department) ?? { active: 0, inactive: 0 }
      if (e.employment.status === 'active') bucket.active += 1
      else bucket.inactive += 1
      map.set(e.employment.department, bucket)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [employees])

  const active = employees.filter((e) => e.employment.status === 'active').length

  return (
    <ReportViewShell title="Headcount Analysis" description="Active vs. inactive headcount by department.">
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : employees.length === 0 ? (
        <EmptyState title="No employees yet" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Total Employees" value={String(employees.length)} />
            <StatTile label="Active" value={String(active)} />
            <StatTile label="Inactive" value={String(employees.length - active)} />
          </div>

          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDepartment.map(([dept, c]) => ({ dept, ...c }))} margin={{ left: 4, right: 8, top: 8 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="dept" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" width={32} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar dataKey="active" name="Active" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inactive" name="Inactive" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Inactive</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDepartment.map(([dept, counts]) => (
                  <TableRow key={dept}>
                    <TableCell className="font-medium">{dept}</TableCell>
                    <TableCell>{counts.active}</TableCell>
                    <TableCell>{counts.inactive}</TableCell>
                    <TableCell>{counts.active + counts.inactive}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

export function CompensationAnalysisReport() {
  const { employees, isLoading } = useEmployees()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const byPayType = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    for (const e of employees) {
      const bucket = map.get(e.compensation.payType) ?? { count: 0, total: 0 }
      bucket.count += 1
      bucket.total += e.compensation.basicPay
      map.set(e.compensation.payType, bucket)
    }
    return [...map.entries()]
  }, [employees])

  const chartData = byPayType.map(([payType, bucket]) => ({
    payType: PAY_RATE_TYPE_LABEL[payType as keyof typeof PAY_RATE_TYPE_LABEL],
    avgRate: Math.round(bucket.total / bucket.count),
    totalCost: bucket.total,
  }))

  return (
    <ReportViewShell title="Compensation Analysis" description="Employee count and average base rate by Pay Rate Type.">
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : employees.length === 0 ? (
        <EmptyState title="No employees yet" />
      ) : (
        <div className="space-y-4">
          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 4, right: 8, top: 8 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="payType" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis
                  yAxisId="rate"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  width={70}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <YAxis
                  yAxisId="cost"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  width={70}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar yAxisId="rate" dataKey="avgRate" name="Average Base Rate" fill="var(--color-brand-400)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="cost" dataKey="totalCost" name="Total Base Pay Cost" fill="var(--color-brand-700)" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay Rate Type</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Average Base Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPayType.map(([payType, bucket]) => (
                  <TableRow key={payType}>
                    <TableCell className="font-medium">{PAY_RATE_TYPE_LABEL[payType as keyof typeof PAY_RATE_TYPE_LABEL]}</TableCell>
                    <TableCell>{bucket.count}</TableCell>
                    <TableCell>{formatCurrency(Math.round(bucket.total / bucket.count))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

/** Re-homed from Basic Reports — attendance/absenteeism is a workforce analytic, not a basic report. */
export function AttendanceAbsenteeismReport() {
  const { rows, isLoading } = useAttendanceSummary()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const chartData = useMemo(
    () =>
      rows.map((row) => {
        const total = row.present + row.late + row.undertime + row.absent
        const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)
        return {
          name: fullName(row.employee.personal),
          Present: pct(row.present),
          Late: pct(row.late),
          Undertime: pct(row.undertime),
          Absent: pct(row.absent),
        }
      }),
    [rows],
  )

  return (
    <ReportViewShell title="Attendance / Absenteeism Analysis" description="Present, late, undertime, and absence counts per employee.">
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState title="No attendance data yet" />
      ) : (
        <div className="space-y-4">
          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} style={{ height: Math.max(240, chartData.length * 32) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={110} stroke="var(--color-muted-foreground)" />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar dataKey="Present" stackId="a" fill="var(--color-success)" />
                <Bar dataKey="Late" stackId="a" fill="var(--color-warning)" />
                <Bar dataKey="Undertime" stackId="a" fill="var(--color-accent)" />
                <Bar dataKey="Absent" stackId="a" fill="var(--color-danger)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Undertime</TableHead>
                  <TableHead>Absent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.employee.id}>
                    <TableCell className="font-medium">{fullName(row.employee.personal)}</TableCell>
                    <TableCell>{row.present}</TableCell>
                    <TableCell>{row.late}</TableCell>
                    <TableCell>{row.undertime}</TableCell>
                    <TableCell>{row.absent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

/** Re-homed from Basic Reports — leave utilization is a workforce analytic, not a basic report. */
export function LeaveUtilizationReport() {
  const { rows, isLoading } = useLeaveSummary()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const byLeaveType = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.leaveTypeName, (map.get(r.leaveTypeName) ?? 0) + r.daysTaken)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])
  const totalDays = byLeaveType.reduce((s, [, d]) => s + d, 0)

  return (
    <ReportViewShell title="Leave Utilization Analysis" description="Approved leave days taken per employee, by leave type.">
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState title="No approved leave yet" description="Approved leave requests will be summarized here by type." />
      ) : (
        <div className="space-y-4">
          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} className="grid gap-4 sm:grid-cols-2">
            <DonutChart data={byLeaveType} total={totalDays} unit="days" />
            <div className="flex flex-col justify-center gap-2">
              {byLeaveType.map(([name, days], idx) => (
                <div key={name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                    {name}
                  </span>
                  <span className="font-medium tabular-nums">
                    {days} days · {totalDays > 0 ? ((days / totalDays) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
              ))}
            </div>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Days Taken</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={`${row.employee.id}-${row.leaveTypeName}-${idx}`}>
                    <TableCell className="font-medium">{fullName(row.employee.personal)}</TableCell>
                    <TableCell>{row.leaveTypeName}</TableCell>
                    <TableCell>{row.daysTaken}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

function estimateHourlyRate(basicPay: number): number {
  return basicPay / (22 * 8)
}
const OT_MULTIPLIER: Record<string, number> = { regular: 1.25, night_diff: 1.1, rest_day_holiday: 1.3 }

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function OvertimeCostAnalysisReport() {
  const { records, isLoading: recordsLoading } = useOvertimeRecords()
  const { employees, isLoading: employeesLoading } = useEmployees()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const byMonth = useMemo(() => {
    const employeeById = new Map(employees.map((e) => [e.id, e]))
    const map = new Map<string, { hours: number; cost: number }>()
    for (const r of records) {
      if (r.status === 'rejected') continue
      const employee = employeeById.get(r.employeeId)
      if (!employee) continue
      const monthKey = r.date.slice(0, 7)
      const bucket = map.get(monthKey) ?? { hours: 0, cost: 0 }
      bucket.hours += r.hours
      bucket.cost += r.hours * estimateHourlyRate(employee.compensation.basicPay) * (OT_MULTIPLIER[r.type] ?? 1)
      map.set(monthKey, bucket)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [records, employees])

  return (
    <ReportViewShell title="Overtime Cost Analysis" description="Overtime hours and estimated cost expenditure trend, month over month.">
      {recordsLoading || employeesLoading ? (
        <Skeleton className="h-64" />
      ) : byMonth.length === 0 ? (
        <EmptyState title="No overtime recorded yet" />
      ) : (
        <div className="space-y-4">
          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={byMonth.map(([monthKey, b]) => ({ month: monthLabel(monthKey), cost: Math.round(b.cost), hours: Math.round(b.hours * 10) / 10 }))}
                margin={{ left: 4, right: 8, top: 8 }}
              >
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis
                  yAxisId="cost"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  width={70}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <YAxis yAxisId="hours" orientation="right" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" width={48} />
                <Tooltip formatter={(v, name) => (name === 'Estimated OT Cost' ? formatCurrency(Number(v)) : `${v} hrs`)} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Line yAxisId="cost" type="monotone" dataKey="cost" name="Estimated OT Cost" stroke="var(--color-brand-500)" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="hours" type="monotone" dataKey="hours" name="OT Hours" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>OT Hours</TableHead>
                  <TableHead>Estimated Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byMonth.map(([monthKey, b]) => (
                  <TableRow key={monthKey}>
                    <TableCell className="font-medium">{monthLabel(monthKey)}</TableCell>
                    <TableCell>{b.hours.toFixed(1)}</TableCell>
                    <TableCell>{formatCurrency(Math.round(b.cost))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

// ---------- Payroll Analytics ----------

export function PayrollTrendReport() {
  const { rows, isLoading } = useAllPayrollLines()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const byPeriod = useMemo(() => {
    const map = new Map<string, { period: (typeof rows)[number]['period']; gross: number; net: number }>()
    for (const { period, line } of rows) {
      const bucket = map.get(period.id) ?? { period, gross: 0, net: 0 }
      bucket.gross += line.grossPay
      bucket.net += line.netPay
      map.set(period.id, bucket)
    }
    return [...map.values()].sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))
  }, [rows])

  const chartData = useMemo(
    () =>
      byPeriod.map((p, idx) => {
        const prev = idx > 0 ? byPeriod[idx - 1].gross : undefined
        const variancePct = prev && prev !== 0 ? Math.round(((p.gross - prev) / prev) * 1000) / 10 : 0
        return { label: p.period.label, gross: p.gross, net: p.net, variancePct }
      }),
    [byPeriod],
  )

  const variance =
    byPeriod.length >= 2 ? byPeriod[byPeriod.length - 1].gross - byPeriod[byPeriod.length - 2].gross : 0

  return (
    <ReportViewShell title="Payroll Trend & Variance" description="Gross vs. net pay across every payroll period, with period-over-period variance.">
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : byPeriod.length === 0 ? (
        <EmptyState title="No payroll history yet" />
      ) : (
        <div className="space-y-4">
          {byPeriod.length >= 2 && (
            <StatTile
              label="Latest vs. Previous Period (Gross Pay)"
              value={`${variance >= 0 ? '+' : ''}${formatCurrency(variance)}`}
            />
          )}

          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis
                  yAxisId="amount"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                  width={70}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <YAxis yAxisId="variance" orientation="right" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" width={48} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(v, name) => (name === 'Variance %' ? `${v}%` : formatCurrency(Number(v)))} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Line yAxisId="amount" dataKey="gross" name="Gross Pay" stroke="var(--color-brand-400)" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="amount" dataKey="net" name="Net Pay" stroke="var(--color-brand-700)" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="variance" dataKey="variancePct" name="Variance %" stroke="var(--color-warning)" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Variance % (Gross)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((p) => (
                  <TableRow key={p.label}>
                    <TableCell className="font-medium">{p.label}</TableCell>
                    <TableCell>{formatCurrency(p.gross)}</TableCell>
                    <TableCell>{formatCurrency(p.net)}</TableCell>
                    <TableCell>{p.variancePct >= 0 ? '+' : ''}{p.variancePct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

type CostDimension = 'department' | 'branch' | 'group'

export function PayrollCostByDimensionReport({ dimension }: { dimension: CostDimension }) {
  const { rows, isLoading } = useAllPayrollLines()
  const { branches } = useTenant()
  const { groups } = usePayrollGroups()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const label = dimension === 'department' ? 'Department' : dimension === 'branch' ? 'Branch' : 'Payroll Group'

  const byDimension = useMemo(() => {
    const branchById = new Map(branches.map((b) => [b.id, b.name]))
    const map = new Map<string, { employees: Set<string>; gross: number; net: number }>()
    for (const { employee, line } of rows) {
      const key =
        dimension === 'department'
          ? employee.employment.department
          : dimension === 'branch'
            ? branchById.get(employee.branchId) ?? 'Unassigned'
            : findEmployeePayrollGroup(groups, employee.id)?.name ?? 'Unassigned'
      const bucket = map.get(key) ?? { employees: new Set<string>(), gross: 0, net: 0 }
      bucket.employees.add(employee.id)
      bucket.gross += line.grossPay
      bucket.net += line.netPay
      map.set(key, bucket)
    }
    return [...map.entries()].sort((a, b) => b[1].gross - a[1].gross)
  }, [rows, branches, groups, dimension])

  return (
    <ReportViewShell title={`Payroll Cost by ${label}`} description={`Total payroll cost across all periods, grouped by ${label.toLowerCase()}.`}>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : byDimension.length === 0 ? (
        <EmptyState title="No payroll history yet" />
      ) : (
        <div className="space-y-4">
          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} style={{ height: Math.max(220, byDimension.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byDimension.map(([key, bucket]) => ({ key, gross: bucket.gross }))}
                layout="vertical"
                margin={{ left: 8, right: 8, top: 8 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" tickFormatter={(v: number) => formatCurrency(v)} />
                <YAxis type="category" dataKey="key" tickLine={false} axisLine={false} fontSize={11} width={120} stroke="var(--color-muted-foreground)" />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                <Bar dataKey="gross" name="Gross Pay" fill="var(--color-brand-500)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{label}</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDimension.map(([key, bucket]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{key}</TableCell>
                    <TableCell>{bucket.employees.size}</TableCell>
                    <TableCell>{formatCurrency(bucket.gross)}</TableCell>
                    <TableCell>{formatCurrency(bucket.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

export function PayrollCostAnalysisReport() {
  const { rows, isLoading } = useAllPayrollLines()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const totals = rows.reduce(
    (acc, { line }) => ({
      gross: acc.gross + line.grossPay,
      employerContributions: acc.employerContributions + line.sssEmployerShare + line.philhealthEmployerShare + line.pagibigEmployerShare,
      net: acc.net + line.netPay,
    }),
    { gross: 0, employerContributions: 0, net: 0 },
  )

  const byPeriod = useMemo(() => {
    const map = new Map<string, { period: (typeof rows)[number]['period']; gross: number; employerContributions: number; net: number }>()
    for (const { period, line } of rows) {
      const bucket = map.get(period.id) ?? { period, gross: 0, employerContributions: 0, net: 0 }
      bucket.gross += line.grossPay
      bucket.employerContributions += line.sssEmployerShare + line.philhealthEmployerShare + line.pagibigEmployerShare
      bucket.net += line.netPay
      map.set(period.id, bucket)
    }
    return [...map.values()].sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))
  }, [rows])

  return (
    <ReportViewShell title="Payroll Cost Analysis" description="Trend of Gross Pay, Employer Contributions, and Net Pay across every payroll period.">
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState title="No payroll history yet" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Total Gross Pay" value={formatCurrency(totals.gross)} />
            <StatTile label="Employer Contributions" value={formatCurrency(totals.employerContributions)} />
            <StatTile label="Total Cost to Company" value={formatCurrency(totals.gross + totals.employerContributions)} />
          </div>

          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byPeriod.map((p) => ({ label: p.period.label, gross: p.gross, employerContributions: p.employerContributions, net: p.net }))} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" width={70} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Line type="monotone" dataKey="gross" name="Gross Pay" stroke="var(--color-brand-400)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="employerContributions" name="Employer Contributions" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="net" name="Net Pay" stroke="var(--color-brand-700)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Employer Contributions</TableHead>
                  <TableHead>Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPeriod.map((p) => (
                  <TableRow key={p.period.id}>
                    <TableCell className="font-medium">{p.period.label}</TableCell>
                    <TableCell>{formatCurrency(p.gross)}</TableCell>
                    <TableCell>{formatCurrency(p.employerContributions)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(p.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

// ---------- Financial / Management ----------

export function LaborCostAnalysisReport() {
  const { rows, isLoading } = useAllPayrollLines()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const byPeriod = useMemo(() => {
    const map = new Map<string, { period: (typeof rows)[number]['period']; grossPay: number; employerContributions: number }>()
    for (const { period, line } of rows) {
      const bucket = map.get(period.id) ?? { period, grossPay: 0, employerContributions: 0 }
      bucket.grossPay += line.grossPay
      bucket.employerContributions += line.sssEmployerShare + line.philhealthEmployerShare + line.pagibigEmployerShare
      map.set(period.id, bucket)
    }
    return [...map.values()].sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))
  }, [rows])

  function onExport() {
    const header = ['Period', 'Gross Pay', 'Employer Contributions', 'Total Labor Cost']
    const dataRows = byPeriod.map((p) => [p.period.label, String(p.grossPay), String(p.employerContributions), String(p.grossPay + p.employerContributions)])
    downloadCsv('labor-cost-analysis.csv', toCsv([header, ...dataRows]))
  }

  return (
    <ReportViewShell title="Labor Cost Analysis" description="Total labor cost per period — gross pay plus employer-side statutory contributions." onExportCsv={byPeriod.length > 0 ? onExport : undefined}>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : byPeriod.length === 0 ? (
        <EmptyState title="No payroll history yet" />
      ) : (
        <div className="space-y-4">
          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byPeriod.map((p) => ({ label: p.period.label, grossPay: p.grossPay, employerContributions: p.employerContributions }))} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" width={70} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Area type="monotone" dataKey="grossPay" name="Gross Pay" stackId="labor" stroke="var(--color-brand-400)" fill="var(--color-brand-400)" fillOpacity={0.35} />
                <Area type="monotone" dataKey="employerContributions" name="Employer Contributions" stackId="labor" stroke="var(--color-warning)" fill="var(--color-warning)" fillOpacity={0.35} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Employer Contributions</TableHead>
                  <TableHead>Total Labor Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPeriod.map((p) => (
                  <TableRow key={p.period.id}>
                    <TableCell className="font-medium">{p.period.label}</TableCell>
                    <TableCell>{formatCurrency(p.grossPay)}</TableCell>
                    <TableCell>{formatCurrency(p.employerContributions)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(p.grossPay + p.employerContributions)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

export function EarningsVsDeductionsReport() {
  const { rows, isLoading } = useAllPayrollLines()
  const [mode, setMode] = useState<ReportViewMode>('split')

  const byPeriod = useMemo(() => {
    const map = new Map<string, { period: (typeof rows)[number]['period']; earnings: number; deductions: number }>()
    for (const { period, line } of rows) {
      const bucket = map.get(period.id) ?? { period, earnings: 0, deductions: 0 }
      bucket.earnings += line.grossPay
      bucket.deductions += line.totalDeductions
      map.set(period.id, bucket)
    }
    return [...map.values()].sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))
  }, [rows])

  return (
    <ReportViewShell title="Earnings vs. Deductions Analysis" description="Total earnings against total deductions per period, and the resulting deduction rate.">
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : byPeriod.length === 0 ? (
        <EmptyState title="No payroll history yet" />
      ) : (
        <div className="space-y-4">
          <ViewModeToggle value={mode} onChange={setMode} />

          <ChartPane mode={mode} className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPeriod.map((p) => ({ label: p.period.label, earnings: p.earnings, deductions: p.deductions }))} margin={{ left: 4, right: 8, top: 8 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" width={70} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar dataKey="earnings" name="Earnings" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deductions" name="Deductions" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPane>

          <TablePane mode={mode}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Deduction Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPeriod.map((p) => (
                  <TableRow key={p.period.id}>
                    <TableCell className="font-medium">{p.period.label}</TableCell>
                    <TableCell>{formatCurrency(p.earnings)}</TableCell>
                    <TableCell>{formatCurrency(p.deductions)}</TableCell>
                    <TableCell>{p.earnings > 0 ? `${((p.deductions / p.earnings) * 100).toFixed(1)}%` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TablePane>
        </div>
      )}
    </ReportViewShell>
  )
}

export function EmployerContributionAnalysisReport() {
  const { rows, isLoading } = useAllPayrollLines()

  const byPeriod = useMemo(() => {
    const map = new Map<string, { period: (typeof rows)[number]['period']; sss: number; philhealth: number; pagibig: number }>()
    for (const { period, line } of rows) {
      const bucket = map.get(period.id) ?? { period, sss: 0, philhealth: 0, pagibig: 0 }
      bucket.sss += line.sssEmployerShare
      bucket.philhealth += line.philhealthEmployerShare
      bucket.pagibig += line.pagibigEmployerShare
      map.set(period.id, bucket)
    }
    return [...map.values()].sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))
  }, [rows])

  return (
    <ReportViewShell title="Employer Contribution Analysis" description="Employer-side SSS, PhilHealth, and Pag-IBIG counterpart contributions per period.">
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : byPeriod.length === 0 ? (
        <EmptyState title="No payroll history yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>SSS Employer Share</TableHead>
              <TableHead>PhilHealth Employer Share</TableHead>
              <TableHead>Pag-IBIG Employer Share</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byPeriod.map((p) => (
              <TableRow key={p.period.id}>
                <TableCell className="font-medium">{p.period.label}</TableCell>
                <TableCell>{formatCurrency(p.sss)}</TableCell>
                <TableCell>{formatCurrency(p.philhealth)}</TableCell>
                <TableCell>{formatCurrency(p.pagibig)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(p.sss + p.philhealth + p.pagibig)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ReportViewShell>
  )
}

export function PayrollExpenseByAccountReport() {
  const { rows, isLoading } = useAllPayrollLines()

  const periods = useMemo(() => {
    const seen = new Map<string, (typeof rows)[number]['period']>()
    for (const r of rows) seen.set(r.period.id, r.period)
    return [...seen.values()].sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [rows])

  const accountsByPeriod = useMemo(() => {
    return periods.map((period) => {
      const lines = rows.filter((r) => r.period.id === period.id).map((r) => r.line)
      const salaries = lines.reduce((s, l) => s + l.grossPay, 0)
      const sss = lines.reduce((s, l) => s + l.sssEmployerShare, 0)
      const philhealth = lines.reduce((s, l) => s + l.philhealthEmployerShare, 0)
      const pagibig = lines.reduce((s, l) => s + l.pagibigEmployerShare, 0)
      return { period, salaries, sss, philhealth, pagibig, total: salaries + sss + philhealth + pagibig }
    })
  }, [periods, rows])

  return (
    <ReportViewShell title="Payroll Expense by Account & Cost Comparison" description="Salaries & Wages and statutory expense accounts, compared period over period.">
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : accountsByPeriod.length === 0 ? (
        <EmptyState title="No payroll history yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Salaries & Wages Expense</TableHead>
              <TableHead>SSS Expense</TableHead>
              <TableHead>PhilHealth Expense</TableHead>
              <TableHead>Pag-IBIG Expense</TableHead>
              <TableHead>Total Expense</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountsByPeriod.map((p) => (
              <TableRow key={p.period.id}>
                <TableCell className="font-medium">{p.period.label}</TableCell>
                <TableCell>{formatCurrency(p.salaries)}</TableCell>
                <TableCell>{formatCurrency(p.sss)}</TableCell>
                <TableCell>{formatCurrency(p.philhealth)}</TableCell>
                <TableCell>{formatCurrency(p.pagibig)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(p.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ReportViewShell>
  )
}
