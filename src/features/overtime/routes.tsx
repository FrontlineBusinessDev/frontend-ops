import { Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterField, FiltersPopover, SortControl, type SortDirection } from '@/components/ui/FiltersPopover'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { NewOvertimeRequestDialog } from '@/features/overtime/components/NewOvertimeRequestDialog'
import { OvertimeDetailsDialog } from '@/features/overtime/components/OvertimeDetailsDialog'
import { useOvertimeRecords, useOvertimeSummary } from '@/features/overtime/hooks/useOvertime'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { decideOvertimeRecord, exportOvertimeSummaryCsv } from '@/lib/services/overtimeService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { OvertimeRecord, OvertimeType } from '@/types/domain'

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'regular', label: 'Regular Overtime (125%)' },
  { value: 'rest_day_holiday', label: 'Rest Day / Holiday OT (130%-200%)' },
  { value: 'night_diff', label: 'Night Differential (110%)' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const PERIOD_OPTIONS = [
  { value: 'current', label: 'Current Period (last 15 days)' },
  { value: 'previous', label: 'Previous Period' },
  { value: 'all', label: 'All Time' },
]

const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'hours', label: 'Hours Logged' },
  { value: 'name', label: 'Employee Name' },
]

const TYPE_LABEL: Record<OvertimeType, string> = {
  regular: 'Regular OT',
  rest_day_holiday: 'Rest Day OT',
  night_diff: 'Night Diff',
}

const TYPE_TONE: Record<OvertimeType, 'brand' | 'warning' | 'neutral'> = {
  regular: 'brand',
  rest_day_holiday: 'warning',
  night_diff: 'neutral',
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  )
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function OvertimePage() {
  const { user } = useSession()
  const { notify } = useToast()
  const { employees } = useEmployees()
  const { records, isLoading, refetch } = useOvertimeRecords()
  const [refreshKey, setRefreshKey] = useState(0)
  const { summary, isLoading: summaryLoading } = useOvertimeSummary(refreshKey)
  const canApprove = usePermission('overtime.approve')

  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [period, setPeriod] = useState('current')
  const [sortBy, setSortBy] = useState('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null)

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  function refetchAll() {
    refetch()
    setRefreshKey((k) => k + 1)
  }

  const filtered = records
    .filter((record) => {
      if (type !== 'all' && record.type !== type) return false
      if (status !== 'all' && record.status !== status) return false

      if (period === 'current' && new Date(record.date) < daysAgo(15)) return false
      if (period === 'previous') {
        const date = new Date(record.date)
        if (date < daysAgo(30) || date > daysAgo(16)) return false
      }

      const query = search.trim().toLowerCase()
      if (query) {
        const employee = employeeById.get(record.employeeId)
        const haystack = employee
          ? `${employee.personal.firstName} ${employee.personal.lastName} ${employee.employeeNumber} ${employee.employment.department}`.toLowerCase()
          : ''
        if (!haystack.includes(query)) return false
      }

      return true
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      let result = 0
      if (sortBy === 'hours') result = a.hours - b.hours
      else if (sortBy === 'name') {
        const employeeA = employeeById.get(a.employeeId)
        const employeeB = employeeById.get(b.employeeId)
        result = `${employeeA?.personal.firstName} ${employeeA?.personal.lastName}`.localeCompare(
          `${employeeB?.personal.firstName} ${employeeB?.personal.lastName}`,
        )
      } else {
        result = a.date.localeCompare(b.date)
      }
      return sortDirection === 'asc' ? result : -result
    })

  async function handleDecide(record: OvertimeRecord, decision: 'approved' | 'rejected') {
    await decideOvertimeRecord(user, record.id, decision)
    notify({ title: `Request ${decision}`, tone: 'success' })
    setSelectedRecord(null)
    refetchAll()
  }

  async function handleExport() {
    const csv = await exportOvertimeSummaryCsv(user)
    downloadCsv('overtime-summary.csv', csv)
    notify({ title: 'Overtime summary exported', tone: 'success' })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overtime & Night Differential"
        description="Manage, track, and approve employee overtime and night shift differential requests."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={<Download className="size-4" />} onClick={handleExport}>
              Export Summary
            </Button>
            <NewOvertimeRequestDialog employees={employees} onCreated={refetchAll} />
          </div>
        }
      />

      {summaryLoading || !summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Pending Approvals"
            value={`${summary.pendingCount} Requests`}
            hint={`${summary.pendingOvertimeCount} Overtime | ${summary.pendingNightDiffCount} Night Diff`}
          />
          <MetricCard
            label="Total OT Hours (Current Period)"
            value={`${summary.totalOvertimeHours} hrs`}
            hint={
              summary.overtimeHoursChangePct === null
                ? 'No prior period data'
                : `${summary.overtimeHoursChangePct > 0 ? '+' : ''}${summary.overtimeHoursChangePct}% from last pay period`
            }
          />
          <MetricCard
            label="Night Diff Hours"
            value={`${summary.nightDiffHours} hrs`}
            hint={`${summary.activeNightShiftWorkers} active night shift workers`}
          />
          <MetricCard
            label="Estimated OT Cost"
            value={formatCurrency(summary.estimatedCost)}
            hint="Ready for payroll integration"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, ID, department…"
            className="pl-9"
          />
        </div>
        <FiltersPopover activeCount={[type !== 'all', status !== 'all', period !== 'current'].filter(Boolean).length}>
          <FilterField label="Type">
            <Select value={type} onValueChange={setType} options={TYPE_OPTIONS} />
          </FilterField>
          <FilterField label="Status">
            <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />
          </FilterField>
          <FilterField label="Period">
            <Select value={period} onValueChange={setPeriod} options={PERIOD_OPTIONS} />
          </FilterField>
          <SortControl
            value={sortBy}
            onValueChange={setSortBy}
            options={SORT_OPTIONS}
            direction={sortDirection}
            onDirectionChange={setSortDirection}
          />
        </FiltersPopover>
        <p className="ml-auto self-center text-sm text-muted-foreground">
          {filtered.length} of {records.length} records
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No overtime records match these filters" description="Try clearing a filter or log a new request." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department / Position</TableHead>
              <TableHead>Date & Schedule</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Hours Logged</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((record) => {
              const employee = employeeById.get(record.employeeId)
              return (
                <TableRow key={record.id} className="cursor-pointer" onClick={() => setSelectedRecord(record)}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : '?'} size="sm" />
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown'}
                        </p>
                        <p className="text-xs leading-tight text-muted-foreground">{employee?.employeeNumber}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee?.employment.department} / {employee?.employment.position}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <p>{formatDate(record.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.startTime} – {record.endTime}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge tone={TYPE_TONE[record.type]}>{TYPE_LABEL[record.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{record.hours} hrs</TableCell>
                  <TableCell className="text-sm">{Math.round(record.multiplier * 100)}%</TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {canApprove && record.status === 'pending' ? (
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => handleDecide(record, 'rejected')}>
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleDecide(record, 'approved')}>
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setSelectedRecord(record)}>
                        View Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <OvertimeDetailsDialog
        record={selectedRecord}
        employee={selectedRecord ? employeeById.get(selectedRecord.employeeId) : undefined}
        canApprove={canApprove}
        onClose={() => setSelectedRecord(null)}
        onDecide={(decision) => selectedRecord && handleDecide(selectedRecord, decision)}
      />
    </div>
  )
}
