import { Boxes, CalendarRange, CheckCheck, Clock, Hourglass, Search, Wallet, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterField, FiltersPopover } from '@/components/ui/FiltersPopover'
import { Input } from '@/components/ui/Input'
import { MetricCard } from '@/components/ui/MetricCard'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useSession } from '@/hooks/useSession'
import { decideCompensationApprovals, getCompensationApprovals, getPendingWorkLogsForPeriod } from '@/lib/services/compensationApprovalService'
import { getPayrollPeriods } from '@/lib/services/payrollService'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { CompensationApproval, PayrollPeriod } from '@/types/domain'

/** How long arriving rows stay highlighted before fading, and how long the fade takes. */
const HIGHLIGHT_HOLD_MS = 2000
const HIGHLIGHT_FADE_MS = 1000

interface PeriodContext {
  period: PayrollPeriod
  employeeIds: Set<string>
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'output', label: 'Output / Piece-Rate' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

/** "Per Task" -> "task", "hrs" -> "hr". */
function unitNoun(approval: CompensationApproval): string {
  return approval.type === 'hourly' ? 'hr' : approval.unitLabel.replace(/^Per /i, '').toLowerCase()
}

function formatQuantity(approval: CompensationApproval): string {
  const noun = unitNoun(approval)
  return `${approval.quantity} ${noun}${approval.quantity === 1 ? '' : 's'}`
}

function useCompensationApprovals() {
  const { user } = useSession()
  const [approvals, setApprovals] = useState<CompensationApproval[] | null>(null)

  const refetch = useCallback(() => {
    getCompensationApprovals(user).then(setApprovals)
  }, [user])

  useEffect(() => {
    getCompensationApprovals(user).then(setApprovals)
  }, [user])

  return { approvals: approvals ?? [], isLoading: approvals === null, refetch }
}

export function CompensationApprovalsPage() {
  const { user } = useSession()
  const { notify } = useToast()
  const { employees } = useEmployees()
  const { approvals, isLoading, refetch } = useCompensationApprovals()

  const [searchParams, setSearchParams] = useSearchParams()
  const periodId = searchParams.get('periodId')
  const statusParam = searchParams.get('status')

  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState(STATUS_OPTIONS.some((o) => o.value === statusParam) ? statusParam! : 'pending')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [periodLabelById, setPeriodLabelById] = useState<Map<string, string>>(new Map())
  const [periodContext, setPeriodContext] = useState<PeriodContext | null>(null)
  const [highlight, setHighlight] = useState<{ ids: Set<string>; phase: 'on' | 'fading' } | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getPayrollPeriods(user).then((periods) => setPeriodLabelById(new Map(periods.map((p) => [p.id, p.label]))))
  }, [user])

  // Arriving from a payroll period's "Open Approvals" link: scope the list to that period, pre-select
  // its pending entries for bulk action, and briefly highlight them.
  useEffect(() => {
    if (!periodId) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    getPendingWorkLogsForPeriod(user, periodId).then((result) => {
      if (cancelled || !result) return
      const ids = new Set(result.pendingIds)
      setPeriodContext({ period: result.period, employeeIds: new Set(result.employeeIds) })
      setSelectedIds(ids)
      if (ids.size === 0) return
      setHighlight({ ids, phase: 'on' })
      timers.push(setTimeout(() => setHighlight({ ids, phase: 'fading' }), HIGHLIGHT_HOLD_MS))
      timers.push(setTimeout(() => setHighlight(null), HIGHLIGHT_HOLD_MS + HIGHLIGHT_FADE_MS))
    })
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [user, periodId])

  const hasHighlight = highlight !== null && !isLoading
  useEffect(() => {
    if (!hasHighlight) return
    tableRef.current?.querySelector('[data-highlighted]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [hasHighlight])

  function clearPeriodContext() {
    setPeriodContext(null)
    setHighlight(null)
    setSearchParams((params) => {
      params.delete('periodId')
      return params
    })
  }

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  const filtered = approvals
    .filter((a) => {
      if (periodContext) {
        const { period, employeeIds } = periodContext
        if (a.workDate < period.startDate || a.workDate > period.endDate || !employeeIds.has(a.employeeId)) return false
      }
      if (type !== 'all' && a.type !== type) return false
      if (status !== 'all' && a.status !== status) return false
      const query = search.trim().toLowerCase()
      if (query) {
        const e = employeeById.get(a.employeeId)
        const haystack = e ? `${e.personal.firstName} ${e.personal.lastName} ${e.employeeNumber} ${e.employment.department}`.toLowerCase() : ''
        if (!haystack.includes(query) && !a.description.toLowerCase().includes(query)) return false
      }
      return true
    })
    .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.submittedAt.localeCompare(a.submittedAt))

  const pending = approvals.filter((a) => a.status === 'pending')
  const pendingHourly = pending.filter((a) => a.type === 'hourly')
  const pendingOutput = pending.filter((a) => a.type === 'output')
  const selectablePending = filtered.filter((a) => a.status === 'pending')
  const selected = approvals.filter((a) => selectedIds.has(a.id) && a.status === 'pending')
  const allVisibleSelected = selectablePending.length > 0 && selectablePending.every((a) => selectedIds.has(a.id))

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const a of selectablePending) {
        if (checked) next.add(a.id)
        else next.delete(a.id)
      }
      return next
    })
  }

  async function decide(ids: string[], decision: 'approved' | 'rejected') {
    const count = await decideCompensationApprovals(user, ids, decision)
    notify({
      title: `${count} ${count === 1 ? 'entry' : 'entries'} ${decision}`,
      description: decision === 'approved' ? 'Approved amounts are now ready for the next payroll run.' : undefined,
      tone: 'success',
    })
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    refetch()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hourly & Output Approvals"
        description="Review timecard hours and piece-rate output submitted for employees paid by the hour or by output before they reach payroll."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Pending Approvals"
            value={`${pending.length} ${pending.length === 1 ? 'Entry' : 'Entries'}`}
            hint={`${pendingHourly.length} Hourly | ${pendingOutput.length} Output`}
            icon={Hourglass}
            tone="warning"
          />
          <MetricCard
            label="Pending Hours"
            value={`${pendingHourly.reduce((sum, a) => sum + a.quantity, 0)} hrs`}
            hint="Hourly timecard entries"
            icon={Clock}
            tone="primary"
          />
          <MetricCard
            label="Pending Output"
            value={`${pendingOutput.reduce((sum, a) => sum + a.quantity, 0)} units`}
            hint="Piece-rate / task submissions"
            icon={Boxes}
            tone="accent"
          />
          <MetricCard
            label="Pending Amount"
            value={formatCurrency(pending.reduce((sum, a) => sum + a.amount, 0))}
            hint="Payable once approved"
            icon={Wallet}
            tone="success"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, ID, entry…" className="pl-9" />
        </div>
        <FiltersPopover activeCount={[type !== 'all', status !== 'pending'].filter(Boolean).length}>
          <FilterField label="Type">
            <Select value={type} onValueChange={setType} options={TYPE_OPTIONS} />
          </FilterField>
          <FilterField label="Status">
            <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />
          </FilterField>
        </FiltersPopover>
        {periodContext && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground">
            <CalendarRange className="size-3.5 text-primary" />
            Payroll period: {periodContext.period.label}
            <span className="font-normal text-muted-foreground">
              ({formatDate(periodContext.period.startDate)} – {formatDate(periodContext.period.endDate)})
            </span>
            <button
              type="button"
              onClick={clearPeriodContext}
              className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear payroll period filter"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}
        <p className="ml-auto self-center text-sm text-muted-foreground">
          {filtered.length} of {approvals.length} entries
        </p>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm font-medium">
            {selected.length} selected
            <span className="ml-2 font-normal text-muted-foreground">{formatCurrency(selected.reduce((sum, a) => sum + a.amount, 0))} total</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Button size="sm" variant="secondary" icon={<X className="size-3.5" />} onClick={() => decide(selected.map((a) => a.id), 'rejected')}>
              Reject Selected
            </Button>
            <Button size="sm" icon={<CheckCheck className="size-3.5" />} onClick={() => decide(selected.map((a) => a.id), 'approved')}>
              Bulk Approve
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : filtered.length === 0 ? (
        periodContext && status === 'pending' ? (
          <EmptyState
            title="Nothing pending for this payroll period"
            description={`Every hourly and output entry in ${periodContext.period.label} has been decided.`}
          />
        ) : (
          <EmptyState title="No entries match these filters" description="Try clearing a filter or search term." />
        )
      ) : (
        <div ref={tableRef}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(c) => toggleAllVisible(c === true)}
                  disabled={selectablePending.length === 0}
                  aria-label="Select all pending entries"
                />
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Entry / Work Date</TableHead>
              <TableHead>Logged Hours / Units</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => {
              const employee = employeeById.get(a.employeeId)
              const name = employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown'
              const isHighlighted = highlight?.ids.has(a.id) ?? false
              return (
                <TableRow
                  key={a.id}
                  data-highlighted={isHighlighted && highlight?.phase === 'on' ? '' : undefined}
                  className={cn(
                    isHighlighted && 'transition-[background-color,box-shadow] duration-1000 ease-out',
                    isHighlighted && highlight?.phase === 'on' && 'bg-warning/15 shadow-[inset_3px_0_0_var(--color-warning)] hover:bg-warning/20',
                  )}
                >
                  <TableCell>
                    {a.status === 'pending' && (
                      <Checkbox checked={selectedIds.has(a.id)} onCheckedChange={(c) => toggle(a.id, c === true)} aria-label={`Select ${name}`} />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={name} size="sm" />
                      <div>
                        <p className="text-sm font-medium leading-tight">{name}</p>
                        <p className="text-xs leading-tight text-muted-foreground">
                          {employee?.employeeNumber} · {employee?.employment.department}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge tone={a.type === 'hourly' ? 'brand' : 'neutral'}>{a.type === 'hourly' ? 'Hourly' : 'Output'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{a.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(a.workDate)}</p>
                  </TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">{formatQuantity(a)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">
                    {formatCurrency(a.rate)} / {unitNoun(a)}
                  </TableCell>
                  <TableCell className="text-sm font-semibold tabular-nums">{formatCurrency(a.amount)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(a.submittedAt.slice(0, 10))}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell>
                    {a.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => decide([a.id], 'rejected')}>
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => decide([a.id], 'approved')}>
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-muted-foreground">
                        <p>by {a.decidedBy}</p>
                        {a.payrollPeriodId && (
                          <p className="font-medium text-success">Paid in {periodLabelById.get(a.payrollPeriodId) ?? 'payroll run'}</p>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  )
}
