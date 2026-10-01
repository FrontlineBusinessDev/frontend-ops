import { CalendarClock, Pencil, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { DeductionDialog } from '@/features/loans-deductions/components/DeductionDialog'
import { RecordCard } from '@/features/loans-deductions/components/RecordCard'
import { RecordDetailsDialog } from '@/features/loans-deductions/components/RecordDetailsDialog'
import { useEmployeeDeductions } from '@/features/loans-deductions/hooks/useBenefitsDeductions'
import { fullName } from '@/features/loans-deductions/loanUtils'
import { StatTile } from '@/features/reports/components/shared'
import { useSession } from '@/hooks/useSession'
import { updateEmployeeDeduction } from '@/lib/services/benefitsService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Employee, EmployeeDeduction } from '@/types/domain'

export type DeductionsViewKind = 'all' | 'recurring' | 'one_time'

const COPY: Record<DeductionsViewKind, { title: string; description: string }> = {
  all: {
    title: 'Other Deductions',
    description: 'Every deduction taken from pay that isn’t a loan or a government contribution — recurring and one-time together.',
  },
  recurring: {
    title: 'Recurring Deductions',
    description: 'Monthly amounts (cooperative savings, union dues, meal plans…) split across the month’s pay runs until they end or are cancelled.',
  },
  one_time: {
    title: 'One-time Deductions',
    description: 'Single amounts (uniforms, replacement fees, damages…) taken in full in the pay run that covers the due date.',
  },
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Taken in payroll' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_ORDER = { active: 0, paused: 1, completed: 2, cancelled: 3 } as const

const today = () => new Date().toISOString().slice(0, 10)

function scheduleText(d: EmployeeDeduction): string {
  if (d.kind === 'one_time') return d.dueDate ? `Due ${formatDate(d.dueDate)}` : '—'
  return `From ${formatDate(d.startDate)}${d.endDate ? ` to ${formatDate(d.endDate)}` : ' · open-ended'}`
}

export function DeductionsView({ kind, employees, canManage }: { kind: DeductionsViewKind; employees: Employee[]; canManage: boolean }) {
  const { deductions, isLoading, refetch } = useEmployeeDeductions()
  const { user } = useSession()
  const { notify } = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewing, setViewing] = useState<EmployeeDeduction | null>(null)
  const copy = COPY[kind]
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  const scoped = useMemo(() => deductions.filter((d) => (kind === 'all' || d.kind === kind) && employeeById.has(d.employeeId)), [deductions, kind, employeeById])
  const filtered = scoped
    .filter((d) => {
      if (status !== 'all' && d.status !== status) return false
      const query = search.trim().toLowerCase()
      return !query || `${fullName(employeeById.get(d.employeeId))} ${employeeById.get(d.employeeId)?.employeeNumber ?? ''} ${d.name} ${d.reason ?? ''}`.toLowerCase().includes(query)
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || fullName(employeeById.get(a.employeeId)).localeCompare(fullName(employeeById.get(b.employeeId))))

  const activeRecurring = scoped.filter((d) => d.kind === 'recurring' && d.status === 'active')
  const pendingOneTime = scoped.filter((d) => d.kind === 'one_time' && d.status === 'active')

  async function change(d: EmployeeDeduction, updates: Partial<EmployeeDeduction>, message: string) {
    await updateEmployeeDeduction(user, d.id, updates)
    notify({ title: `${d.name} ${message}`, tone: 'success' })
    refetch()
  }

  function noteFor(d: EmployeeDeduction): string {
    if (d.status === 'paused') return 'Paused — left out of payroll until resumed.'
    if (d.status === 'cancelled') return 'Cancelled — no longer included in payroll.'
    if (d.status === 'completed') return 'Taken in payroll — nothing more to deduct.'
    return d.kind === 'one_time'
      ? `Taken in full in the pay run covering ${d.dueDate ? formatDate(d.dueDate) : 'its due date'}.`
      : 'Split across the month’s pay runs and taken in each payroll run.'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{copy.title}</p>
          <p className="max-w-3xl text-xs text-muted-foreground">{copy.description}</p>
        </div>
        {canManage && <DeductionDialog employees={employees} lockedKind={kind === 'all' ? undefined : kind} onSaved={refetch} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kind !== 'one_time' && <StatTile label="Recurring / month" value={formatCurrency(activeRecurring.reduce((s, d) => s + d.amount, 0))} />}
        {kind !== 'recurring' && <StatTile label="Scheduled one-time" value={formatCurrency(pendingOneTime.reduce((s, d) => s + d.amount, 0))} />}
        <StatTile label="Employees affected" value={String(new Set([...activeRecurring, ...pendingOneTime].map((d) => d.employeeId)).size)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee or deduction…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} className="w-44" />
        <p className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {scoped.length} records
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No deductions found" description={scoped.length === 0 ? 'Add a deduction to include it in the next payroll run.' : 'Try clearing the search or status filter.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const employee = employeeById.get(d.employeeId)
            return (
              <RecordCard
                key={d.id}
                title={fullName(employee)}
                subtitle={`${d.name} · ${d.kind === 'recurring' ? 'Recurring' : 'One-time'}`}
                status={d.status}
                headline={formatCurrency(d.amount)}
                headlineHint={d.kind === 'recurring' ? 'per month' : 'one-time'}
                lines={[scheduleText(d), d.reason]}
                note={<p className="text-muted-foreground">{noteFor(d)}</p>}
                noteIcon={<CalendarClock className="mt-0.5 size-3.5 shrink-0 text-primary" />}
                onView={() => setViewing(d)}
                edit={
                  <DeductionDialog
                    employees={employees}
                    deduction={d}
                    lockedKind={kind === 'all' ? undefined : kind}
                    onSaved={refetch}
                    trigger={
                      <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} disabled={!canManage || d.status === 'completed' || d.status === 'cancelled'} title={d.status === 'completed' || d.status === 'cancelled' ? `This record is ${d.status}.` : undefined}>
                        Edit
                      </Button>
                    }
                  />
                }
                onPause={() => change(d, { status: 'paused' }, 'paused — left out of payroll until resumed')}
                onResume={() => change(d, { status: 'active' }, 'resumed')}
                onCancel={() => change(d, { status: 'cancelled', endDate: d.kind === 'recurring' ? (d.endDate ?? today()) : d.endDate }, 'cancelled')}
                cancelName={d.name}
                cancelConsequence={`${d.name} for ${fullName(employee)} will no longer be deducted in future payroll runs.`}
                canManage={canManage}
                dimmed={d.status === 'cancelled' || d.status === 'completed'}
              />
            )
          })}
        </div>
      )}

      <RecordDetailsDialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        subtitle={viewing ? `${fullName(employeeById.get(viewing.employeeId))} · ${employeeById.get(viewing.employeeId)?.employeeNumber ?? ''} · ${employeeById.get(viewing.employeeId)?.employment.department ?? ''}` : undefined}
        status={viewing?.status ?? 'active'}
        notes={viewing?.reason}
        fields={
          viewing
            ? [
                { label: 'Type', value: viewing.kind === 'recurring' ? 'Recurring (monthly)' : 'One-time' },
                { label: viewing.kind === 'recurring' ? 'Amount / month' : 'Amount', value: formatCurrency(viewing.amount) },
                ...(viewing.kind === 'recurring'
                  ? [
                      { label: 'Start date', value: formatDate(viewing.startDate) },
                      { label: 'End date', value: viewing.endDate ? formatDate(viewing.endDate) : 'Open-ended' },
                    ]
                  : [{ label: 'Due date', value: viewing.dueDate ? formatDate(viewing.dueDate) : '—', wide: true }]),
              ]
            : []
        }
      />
    </div>
  )
}
