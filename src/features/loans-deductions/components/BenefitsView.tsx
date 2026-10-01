import { CalendarClock, Pencil, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { BenefitDialog } from '@/features/loans-deductions/components/BenefitDialog'
import { RecordCard } from '@/features/loans-deductions/components/RecordCard'
import { RecordDetailsDialog } from '@/features/loans-deductions/components/RecordDetailsDialog'
import { useEmployeeBenefits } from '@/features/loans-deductions/hooks/useBenefitsDeductions'
import { BENEFIT_CATEGORY_META, fullName } from '@/features/loans-deductions/loanUtils'
import { StatTile } from '@/features/reports/components/shared'
import { useSession } from '@/hooks/useSession'
import { updateEmployeeBenefit } from '@/lib/services/benefitsService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { BenefitCategory, Employee, EmployeeBenefit } from '@/types/domain'

const DESCRIPTION: Record<BenefitCategory, string> = {
  hmo: 'Health coverage provided to employees. Employee shares (e.g. dependents) are deducted in payroll; the rest is paid by the company and shown on the payslip.',
  allowance: 'Cash allowances paid through payroll and added to earnings on the payslip.',
  insurance: 'Company-provided insurance. Shown on the payslip as an employer-paid benefit.',
  other: 'Other company-paid perks and programs. Shown on the payslip as employer-paid benefits.',
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_ORDER = { active: 0, paused: 1, cancelled: 2 } as const

interface Row {
  key: string
  employee: Employee
  name: string
  provider?: string
  coverage?: string
  monthlyValue: number
  employeeShare: number
  startDate?: string
  endDate?: string
  status: EmployeeBenefit['status']
  notes?: string
  /** The stored record; absent for allowances that come from the employee profile. */
  benefit?: EmployeeBenefit
}

const today = () => new Date().toISOString().slice(0, 10)

export function BenefitsView({ category, employees, canManage }: { category: BenefitCategory; employees: Employee[]; canManage: boolean }) {
  const { benefits, isLoading, refetch } = useEmployeeBenefits()
  const { user } = useSession()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewing, setViewing] = useState<Row | null>(null)
  const meta = BENEFIT_CATEGORY_META[category]
  const isAllowance = category === 'allowance'

  const rows = useMemo<Row[]>(() => {
    const employeeById = new Map(employees.map((e) => [e.id, e]))
    const managed: Row[] = benefits
      .filter((b) => b.category === category && employeeById.has(b.employeeId))
      .map((b) => ({
        key: b.id,
        employee: employeeById.get(b.employeeId)!,
        name: b.name,
        provider: b.provider,
        coverage: b.coverage,
        monthlyValue: b.monthlyValue,
        employeeShare: b.employeeShare,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status,
        notes: b.notes,
        benefit: b,
      }))
    // Allowances set on the employee profile are already paid by payroll — list them here (managed on the profile) so this tab shows every allowance.
    const fromProfile: Row[] = isAllowance
      ? employees
          .filter((e) => e.employment.status === 'active')
          .flatMap((e) =>
            e.compensation.allowances.map((a, i) => ({
              key: `${e.id}-profile-${i}`,
              employee: e,
              name: a.label,
              monthlyValue: a.amount,
              employeeShare: 0,
              status: 'active' as const,
              notes: 'Set on the employee profile. Edit it there.',
            })),
          )
      : []
    return [...managed, ...fromProfile].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || fullName(a.employee).localeCompare(fullName(b.employee)) || a.name.localeCompare(b.name),
    )
  }, [benefits, employees, category, isAllowance])

  const filtered = rows.filter((row) => {
    if (status !== 'all' && row.status !== status) return false
    const query = search.trim().toLowerCase()
    return !query || `${fullName(row.employee)} ${row.employee.employeeNumber} ${row.name} ${row.provider ?? ''} ${row.coverage ?? ''}`.toLowerCase().includes(query)
  })

  const active = rows.filter((r) => r.status === 'active')
  const enrolled = new Set(active.map((r) => r.employee.id)).size
  const employerCost = active.reduce((sum, r) => sum + r.monthlyValue, 0)
  const employeeContributions = active.reduce((sum, r) => sum + r.employeeShare, 0)

  async function change(row: Row, updates: Partial<EmployeeBenefit>, message: string) {
    if (!row.benefit) return
    await updateEmployeeBenefit(user, row.benefit.id, updates)
    notify({ title: `${row.name} ${message}`, tone: 'success' })
    refetch()
  }

  function noteFor(row: Row): string {
    if (row.status === 'paused') return 'Paused — left out of payroll until resumed.'
    if (row.status === 'cancelled') return `Cancelled${row.endDate ? ` on ${formatDate(row.endDate)}` : ''} — no longer included in payroll.`
    const parts = [isAllowance ? 'Added to earnings every pay run.' : 'Shown on the payslip as an employer-paid benefit.']
    if (row.employeeShare > 0) parts.push(`Employee share ${formatCurrency(row.employeeShare)}/month is deducted.`)
    return parts.join(' ')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{meta.title}</p>
          <p className="max-w-3xl text-xs text-muted-foreground">{DESCRIPTION[category]}</p>
        </div>
        {canManage && <BenefitDialog category={category} employees={employees} onSaved={refetch} />}
      </div>

      <div className={isAllowance ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-3'}>
        <StatTile label="Employees covered" value={String(enrolled)} />
        <StatTile label={isAllowance ? 'Paid monthly' : 'Company cost / month'} value={formatCurrency(employerCost)} />
        {!isAllowance && <StatTile label="Employee contributions / month" value={formatCurrency(employeeContributions)} />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee or benefit…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} className="w-40" />
        <p className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {rows.length} records
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : filtered.length === 0 ? (
        <EmptyState title={`No ${meta.title.toLowerCase()} found`} description={rows.length === 0 ? `Add ${meta.singular} records to include them in payroll and payslips.` : 'Try clearing the search or status filter.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => (
            <RecordCard
              key={row.key}
              title={fullName(row.employee)}
              subtitle={[row.name, row.provider].filter(Boolean).join(' · ')}
              status={row.benefit ? row.status : 'active'}
              headline={formatCurrency(row.monthlyValue)}
              headlineHint={isAllowance ? 'per month, added to earnings' : 'company-paid per month'}
              lines={[row.coverage, row.employeeShare > 0 ? `Employee share ${formatCurrency(row.employeeShare)}/month` : undefined, row.startDate ? `Since ${formatDate(row.startDate)}${row.endDate ? ` · until ${formatDate(row.endDate)}` : ''}` : 'Set on employee profile'].filter(Boolean)}
              note={<p className="text-muted-foreground">{noteFor(row)}</p>}
              noteIcon={<CalendarClock className="mt-0.5 size-3.5 shrink-0 text-primary" />}
              onView={() => setViewing(row)}
              edit={
                row.benefit ? (
                  <BenefitDialog
                    category={category}
                    employees={employees}
                    benefit={row.benefit}
                    onSaved={refetch}
                    trigger={
                      <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} disabled={!canManage || row.status === 'cancelled'} title={row.status === 'cancelled' ? 'This record is cancelled.' : undefined}>
                        Edit
                      </Button>
                    }
                  />
                ) : (
                  <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} disabled={!canManage} title="Set on the employee profile" onClick={() => navigate(`/employees/${row.employee.id}`)}>
                    Edit
                  </Button>
                )
              }
              onPause={() => change(row, { status: 'paused' }, 'paused — left out of payroll until resumed')}
              onResume={() => change(row, { status: 'active' }, 'resumed')}
              onCancel={() => change(row, { status: 'cancelled', endDate: row.endDate ?? today() }, 'cancelled')}
              lockedReason={row.benefit ? undefined : 'Managed on the employee profile'}
              cancelName={row.name}
              cancelConsequence={`${row.name} for ${fullName(row.employee)} will stop being included in payroll and on payslips.`}
              canManage={canManage}
              dimmed={row.status === 'cancelled'}
            />
          ))}
        </div>
      )}

      <RecordDetailsDialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? viewing.name : ''}
        subtitle={viewing ? `${fullName(viewing.employee)} · ${viewing.employee.employeeNumber} · ${viewing.employee.employment.department}` : undefined}
        status={viewing?.benefit ? viewing.status : 'active'}
        notes={viewing?.notes}
        fields={
          viewing
            ? [
                { label: 'Category', value: meta.title },
                { label: 'Provider', value: viewing.provider || '—' },
                ...(isAllowance ? [] : [{ label: 'Plan / coverage', value: viewing.coverage || '—', wide: true }]),
                { label: isAllowance ? 'Monthly amount' : 'Company-paid / month', value: formatCurrency(viewing.monthlyValue) },
                ...(isAllowance ? [] : [{ label: 'Employee share / month', value: viewing.employeeShare > 0 ? formatCurrency(viewing.employeeShare) : '—' }]),
                { label: 'Start date', value: viewing.startDate ? formatDate(viewing.startDate) : '—' },
                { label: 'End date', value: viewing.endDate ? formatDate(viewing.endDate) : 'Open-ended' },
              ]
            : []
        }
      />
    </div>
  )
}
