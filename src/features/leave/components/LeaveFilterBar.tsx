import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FilterField, FiltersPopover, SortControl, type SortDirection } from '@/components/ui/FiltersPopover'
import { Input } from '@/components/ui/Input'
import { Select, type SelectOption } from '@/components/ui/Select'

export interface LeaveFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  leaveTypeId: string
  onLeaveTypeChange: (value: string) => void
  leaveTypeOptions: SelectOption[]
  status: string
  onStatusChange: (value: string) => void
  hierarchy: string
  onHierarchyChange: (value: string) => void
  hierarchyOptions: SelectOption[]
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  sortOptions: SelectOption[]
  sortDirection: SortDirection
  onSortDirectionChange: (direction: SortDirection) => void
  hasActiveFilters: boolean
  onClear: () => void
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function LeaveFilterBar({
  search,
  onSearchChange,
  leaveTypeId,
  onLeaveTypeChange,
  leaveTypeOptions,
  status,
  onStatusChange,
  hierarchy,
  onHierarchyChange,
  hierarchyOptions,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sortBy,
  onSortByChange,
  sortOptions,
  sortDirection,
  onSortDirectionChange,
  hasActiveFilters,
  onClear,
}: LeaveFilterBarProps) {
  const activeFilterCount = [
    leaveTypeId !== 'all',
    status !== 'all',
    hierarchy !== 'all',
    dateFrom !== '',
    dateTo !== '',
  ].filter(Boolean).length

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search employee, ID, or leave type…"
          className="pl-9"
        />
      </div>
      <FiltersPopover
        activeCount={activeFilterCount}
        footer={
          hasActiveFilters && (
            <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={onClear}>
              Clear Filters
            </Button>
          )
        }
      >
        <FilterField label="Leave Type">
          <Select value={leaveTypeId} onValueChange={onLeaveTypeChange} options={leaveTypeOptions} />
        </FilterField>
        <FilterField label="Status">
          <Select value={status} onValueChange={onStatusChange} options={STATUS_OPTIONS} />
        </FilterField>
        <FilterField label="Hierarchy Level">
          <Select value={hierarchy} onValueChange={onHierarchyChange} options={hierarchyOptions} />
        </FilterField>
        <div className="flex items-end gap-1.5">
          <FilterField label="From">
            <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          </FilterField>
          <FilterField label="To">
            <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
          </FilterField>
        </div>
        <SortControl
          value={sortBy}
          onValueChange={onSortByChange}
          options={sortOptions}
          direction={sortDirection}
          onDirectionChange={onSortDirectionChange}
        />
      </FiltersPopover>
    </div>
  )
}
