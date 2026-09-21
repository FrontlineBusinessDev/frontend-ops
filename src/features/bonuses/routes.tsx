import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterField, FiltersPopover, SortControl, type SortDirection } from '@/components/ui/FiltersPopover'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { AddBonusDialog } from '@/features/bonuses/components/AddBonusDialog'
import { BonusDetailsDialog } from '@/features/bonuses/components/BonusDetailsDialog'
import { useBonuses } from '@/features/bonuses/hooks/useBonuses'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { usePermission } from '@/hooks/usePermission'
import { resolveBonusRecipients } from '@/lib/payroll/bonusMatching'
import { formatCurrency } from '@/lib/utils/format'
import type { BonusIncentive } from '@/types/domain'

const BONUS_TYPE_LABEL: Record<BonusIncentive['bonusType'], string> = {
  fixed_amount: 'Fixed Amount',
  percentage: 'Percentage',
  performance_based: 'Performance-Based',
  output_based: 'Output-Based',
}

const TYPE_OPTIONS = [{ value: 'all', label: 'All Types' }, ...Object.entries(BONUS_TYPE_LABEL).map(([value, label]) => ({ value, label }))]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'name', label: 'Bonus Name' },
  { value: 'amount', label: 'Amount' },
]

export function BonusesPage() {
  const { bonuses, isLoading, refetch } = useBonuses()
  const { employees } = useEmployees()
  const canManage = usePermission('bonuses.manage')
  const departments = useMemo(() => [...new Set(employees.map((e) => e.employment.department))].sort(), [employees])
  const [selectedBonus, setSelectedBonus] = useState<BonusIncentive | null>(null)

  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const activeFilterCount = [type !== 'all', status !== 'all'].filter(Boolean).length
  const hasActiveFilters = search.trim() !== '' || activeFilterCount > 0

  function clearFilters() {
    setSearch('')
    setType('all')
    setStatus('all')
  }

  const filteredBonuses = bonuses
    .filter((bonus) => {
      if (type !== 'all' && bonus.bonusType !== type) return false
      if (status !== 'all' && bonus.status !== status) return false
      const query = search.trim().toLowerCase()
      if (query && !`${bonus.name} ${bonus.periodLabel}`.toLowerCase().includes(query)) return false
      return true
    })
    .sort((a, b) => {
      let result = 0
      if (sortBy === 'amount') result = a.amount - b.amount
      else if (sortBy === 'name') result = a.name.localeCompare(b.name)
      else result = a.createdAt.localeCompare(b.createdAt)
      return sortDirection === 'asc' ? result : -result
    })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bonuses & Incentives"
        description="Configure, manage, and approve non-regular earnings before they flow into a payroll run."
        actions={canManage && <AddBonusDialog employees={employees} departments={departments} onCreated={refetch} />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bonus name or period…" className="pl-9" />
        </div>
        <FiltersPopover
          activeCount={activeFilterCount}
          footer={
            hasActiveFilters && (
              <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={clearFilters}>
                Clear Filters
              </Button>
            )
          }
        >
          <FilterField label="Bonus Type">
            <Select value={type} onValueChange={setType} options={TYPE_OPTIONS} />
          </FilterField>
          <FilterField label="Approval Status">
            <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />
          </FilterField>
          <SortControl value={sortBy} onValueChange={setSortBy} options={SORT_OPTIONS} direction={sortDirection} onDirectionChange={setSortDirection} />
        </FiltersPopover>
        <p className="ml-auto self-center text-sm text-muted-foreground">
          {filteredBonuses.length} of {bonuses.length} records
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : filteredBonuses.length === 0 ? (
        <EmptyState title="No bonus/incentive entries match these filters" description="Try clearing a filter or create a new bonus/incentive." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBonuses.map((bonus) => {
            const recipients = resolveBonusRecipients(bonus, employees)
            return (
              <Card key={bonus.id} className="cursor-pointer p-5 transition-shadow hover:shadow-soft-lg" onClick={() => setSelectedBonus(bonus)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{bonus.name}</p>
                    <p className="text-xs text-muted-foreground">{BONUS_TYPE_LABEL[bonus.bonusType]}</p>
                  </div>
                  <StatusBadge status={bonus.status} />
                </div>
                <p className="mt-3 font-display text-lg font-semibold">
                  {bonus.bonusType === 'percentage' ? `${bonus.amount}%` : formatCurrency(bonus.amount)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">each</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {bonus.targetType === 'employee'
                    ? recipients[0]
                      ? `${recipients[0].personal.firstName} ${recipients[0].personal.lastName}`
                      : 'Unassigned employee'
                    : `${recipients.length} employee${recipients.length === 1 ? '' : 's'}`}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Payroll Period: {bonus.periodLabel}</p>
              </Card>
            )
          })}
        </div>
      )}

      <BonusDetailsDialog bonus={selectedBonus} employees={employees} canManage={canManage} onClose={() => setSelectedBonus(null)} onChanged={refetch} />
    </div>
  )
}
