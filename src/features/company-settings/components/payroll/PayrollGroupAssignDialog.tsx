import { ArrowRight, Search, Sparkles, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { categoryLabel, findEmployeePayrollGroup, isSuggestedForGroup, referenceProfile } from '@/lib/payroll/groupAssignment'
import { formatBaseRateShort } from '@/lib/payroll/payRate'
import { updatePayrollGroupMembership } from '@/lib/services/payrollSettingsService'
import type { CompensationType, Employee, EmployeeCategory, PayrollGroup } from '@/types/domain'

type QuickChip = 'suggested' | 'unassigned' | 'assigned' | 'samePosition' | 'sameDepartment' | 'sameBranch'

const CATEGORY_OPTIONS: { value: EmployeeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'regular', label: 'Regular Employee' },
  { value: 'admin_staff', label: 'Admin Staff' },
  { value: 'production_worker', label: 'Production Worker' },
  { value: 'field_worker', label: 'Field Worker' },
  { value: 'contractor', label: 'Contractor' },
]

const PAY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Compensation Types' },
  { value: 'monthly', label: 'Monthly Rate' },
  { value: 'daily', label: 'Daily Rate' },
  { value: 'hourly', label: 'Hourly Rate' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

function compensationLabel(employee: Employee, groups: PayrollGroup[], compensationTypes: CompensationType[]) {
  const currentGroup = findEmployeePayrollGroup(groups, employee.id)
  if (currentGroup) {
    const compType = compensationTypes.find((c) => c.id === currentGroup.compensationTypeId)
    if (compType) return compType.name
  }
  return formatBaseRateShort(employee.compensation.payType, employee.compensation.basicPay, employee.compensation.outputUnit)
}

/** Payroll-Group-specific Assign Employees flow: search/filter/suggest, bulk-select, and a confirmation summary before committing — used only from Payroll Groups. */
export function PayrollGroupAssignDialog({
  group,
  groups,
  employees,
  compensationTypes,
  onSaved,
  trigger,
}: {
  group: PayrollGroup
  groups: PayrollGroup[]
  employees: Employee[]
  compensationTypes: CompensationType[]
  onSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'select' | 'confirm'>('select')
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState<EmployeeCategory | 'all'>('all')
  const [payTypeFilter, setPayTypeFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeChip, setActiveChip] = useState<QuickChip | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set(group.employeeIds))
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useSession()
  const { branches } = useTenant()
  const { notify } = useToast()

  useEffect(() => {
    if (open) {
      setSelected(new Set(group.employeeIds))
      setStep('select')
      setSearch('')
      setBranchFilter('all')
      setCategoryFilter('all')
      setPayTypeFilter('all')
      setGroupFilter('all')
      setStatusFilter('all')
      setActiveChip(null)
    }
  }, [open, group.employeeIds])

  const reference = useMemo(() => referenceProfile(group, employees), [group, employees])

  const branchOptions = [{ value: 'all', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]
  const groupOptions = [
    { value: 'all', label: 'All Payroll Groups' },
    { value: 'unassigned', label: 'Unassigned' },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ]

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employees.filter((employee) => {
      const currentGroup = findEmployeePayrollGroup(groups, employee.id)
      const fullName = `${employee.personal.firstName} ${employee.personal.lastName}`.toLowerCase()

      if (term) {
        const haystack = `${fullName} ${employee.employeeNumber} ${employee.employment.position} ${employee.employment.department}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      if (branchFilter !== 'all' && employee.branchId !== branchFilter) return false
      if (categoryFilter !== 'all' && employee.employment.category !== categoryFilter) return false
      if (payTypeFilter !== 'all' && employee.compensation.payType !== payTypeFilter) return false
      if (statusFilter !== 'all' && employee.employment.status !== statusFilter) return false
      if (groupFilter === 'unassigned' && currentGroup) return false
      if (groupFilter !== 'all' && groupFilter !== 'unassigned' && currentGroup?.id !== groupFilter) return false

      if (activeChip === 'suggested' && !isSuggestedForGroup(employee, group)) return false
      if (activeChip === 'unassigned' && currentGroup) return false
      if (activeChip === 'assigned' && currentGroup?.id !== group.id) return false
      if (activeChip === 'samePosition' && employee.employment.position !== reference.position) return false
      if (activeChip === 'sameDepartment' && employee.employment.department !== reference.department) return false
      if (activeChip === 'sameBranch' && employee.branchId !== reference.branchId) return false

      return true
    })
  }, [employees, groups, search, branchFilter, categoryFilter, payTypeFilter, groupFilter, statusFilter, activeChip, group, reference])

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const e of filtered) next.delete(e.id)
      } else {
        for (const e of filtered) next.add(e.id)
      }
      return next
    })
  }

  const originalIds = new Set(group.employeeIds)
  const selectedIds = Array.from(selected)
  const newlyAdded = selectedIds.filter((id) => !originalIds.has(id))
  const removed = group.employeeIds.filter((id) => !selected.has(id))
  const reassignments = newlyAdded
    .map((id) => ({ employee: employees.find((e) => e.id === id), fromGroup: findEmployeePayrollGroup(groups, id) }))
    .filter((r) => r.employee && r.fromGroup && r.fromGroup.id !== group.id) as { employee: Employee; fromGroup: PayrollGroup }[]
  const freshAssignments = newlyAdded.length - reassignments.length

  async function handleConfirm() {
    setIsSaving(true)
    await updatePayrollGroupMembership(user, group.id, selectedIds)
    setIsSaving(false)
    notify({ title: 'Payroll group assignments updated', tone: 'success' })
    setOpen(false)
    onSaved()
  }

  const chips: { key: QuickChip; label: string; disabled?: boolean }[] = [
    { key: 'suggested', label: 'Suggested for this Group' },
    { key: 'unassigned', label: 'Unassigned Employees' },
    { key: 'assigned', label: 'Currently Assigned' },
    { key: 'samePosition', label: 'Same Position', disabled: !reference.position },
    { key: 'sameDepartment', label: 'Same Department', disabled: !reference.department },
    { key: 'sameBranch', label: 'Same Branch', disabled: !reference.branchId },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary" icon={<Users className="size-4" />}>
            Assign Employees
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogTitle>Assign Employees – {group.name}</DialogTitle>
        <DialogDescription>
          {step === 'select'
            ? 'Position and category are suggestions only — you always have final control over assignment.'
            : 'Review this bulk assignment before saving.'}
        </DialogDescription>

        {step === 'select' ? (
          <>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, employee ID, position, or department..."
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:grid-cols-4">
                <Select value={branchFilter} onValueChange={setBranchFilter} options={branchOptions} aria-label="Branch" />
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as EmployeeCategory | 'all')} options={CATEGORY_OPTIONS} aria-label="Category" />
                <Select value={payTypeFilter} onValueChange={setPayTypeFilter} options={PAY_TYPE_OPTIONS} aria-label="Compensation Type" />
                <Select value={groupFilter} onValueChange={setGroupFilter} options={groupOptions} aria-label="Payroll Group" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter} options={STATUS_OPTIONS} className="w-40" aria-label="Status" />

              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    disabled={chip.disabled}
                    onClick={() => setActiveChip((prev) => (prev === chip.key ? null : chip.key))}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      activeChip === chip.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAllFiltered} />
                Select All ({filtered.length} shown)
              </label>
            </div>

            <div className="mt-3 max-h-96 scroll-smooth space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No employees match these filters.</p>
              ) : (
                filtered.map((employee) => {
                  const currentGroup = findEmployeePayrollGroup(groups, employee.id)
                  const branch = branches.find((b) => b.id === employee.branchId)
                  const suggested = isSuggestedForGroup(employee, group)
                  return (
                    <label
                      key={employee.id}
                      className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors hover:bg-muted"
                    >
                      <Checkbox checked={selected.has(employee.id)} onCheckedChange={() => toggle(employee.id)} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {employee.personal.firstName} {employee.personal.lastName}
                          </p>
                          <span className="text-xs text-muted-foreground">{employee.employeeNumber}</span>
                          {suggested && (
                            <Badge tone="brand" className="gap-1">
                              <Sparkles className="size-3" />
                              Suggested
                            </Badge>
                          )}
                          <StatusBadge status={employee.employment.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {employee.employment.position} · {employee.employment.department} · {branch?.name ?? '—'} ·{' '}
                          {categoryLabel(employee.employment.category)} · {compensationLabel(employee, groups, compensationTypes)}
                        </p>
                        <p className="mt-0.5 text-xs">
                          {currentGroup ? (
                            <span className={currentGroup.id === group.id ? 'text-primary' : 'text-warning'}>
                              Currently assigned to: {currentGroup.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Currently assigned to: Unassigned</span>
                          )}
                        </p>
                      </div>
                    </label>
                  )
                })
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm font-medium">{selected.size} employees selected</p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => setStep('confirm')}>
                  Review Assignment
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-semibold">{selected.size} employees selected for {group.name}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {freshAssignments > 0 && <Badge tone="success">{freshAssignments} new assignment{freshAssignments === 1 ? '' : 's'}</Badge>}
                  {reassignments.length > 0 && <Badge tone="warning">{reassignments.length} reassigned</Badge>}
                  {removed.length > 0 && <Badge tone="danger">{removed.length} removed</Badge>}
                  {freshAssignments === 0 && reassignments.length === 0 && removed.length === 0 && (
                    <Badge tone="neutral">No changes</Badge>
                  )}
                </div>
              </div>

              {reassignments.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reassignments</p>
                  <div className="space-y-1.5">
                    {reassignments.map(({ employee, fromGroup }) => (
                      <div key={employee.id} className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
                        <span className="font-medium">
                          {employee.personal.firstName} {employee.personal.lastName}
                        </span>
                        <span className="text-muted-foreground">{fromGroup.name}</span>
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{group.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {removed.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Removed from this group</p>
                  <div className="flex flex-wrap gap-1.5">
                    {removed.map((id) => {
                      const employee = employees.find((e) => e.id === id)
                      return employee ? (
                        <Badge key={id} tone="neutral">
                          {employee.personal.firstName} {employee.personal.lastName}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button type="button" isLoading={isSaving} onClick={handleConfirm}>
                Assign {selected.size} Employee{selected.size === 1 ? '' : 's'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
