import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FilterField, FiltersPopover, SortControl, type SortDirection } from '@/components/ui/FiltersPopover'
import { Input } from '@/components/ui/Input'
import { Select, type SelectOption } from '@/components/ui/Select'

export interface AttendanceFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  branchId: string
  onBranchChange: (value: string) => void
  branchOptions: SelectOption[]
  group: string
  onGroupChange: (value: string) => void
  groupOptions: SelectOption[]
  department: string
  onDepartmentChange: (value: string) => void
  departmentOptions: SelectOption[]
  status: string
  onStatusChange: (value: string) => void
  statusOptions: SelectOption[]
  sortBy: string
  onSortByChange: (value: string) => void
  sortOptions: SelectOption[]
  sortDirection: SortDirection
  onSortDirectionChange: (direction: SortDirection) => void
  hasActiveFilters: boolean
  onClear: () => void
}

export function AttendanceFilterBar({
  search,
  onSearchChange,
  branchId,
  onBranchChange,
  branchOptions,
  group,
  onGroupChange,
  groupOptions,
  department,
  onDepartmentChange,
  departmentOptions,
  status,
  onStatusChange,
  statusOptions,
  sortBy,
  onSortByChange,
  sortOptions,
  sortDirection,
  onSortDirectionChange,
  hasActiveFilters,
  onClear,
}: AttendanceFilterBarProps) {
  const activeFilterCount = [branchId !== 'all', group !== 'all', department !== 'all', status !== 'all'].filter(Boolean).length

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search employee name or ID…"
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
        <FilterField label="Branch">
          <Select value={branchId} onValueChange={onBranchChange} options={branchOptions} />
        </FilterField>
        <FilterField label="Group">
          <Select value={group} onValueChange={onGroupChange} options={groupOptions} />
        </FilterField>
        <FilterField label="Department">
          <Select value={department} onValueChange={onDepartmentChange} options={departmentOptions} />
        </FilterField>
        <FilterField label="Status">
          <Select value={status} onValueChange={onStatusChange} options={statusOptions} />
        </FilterField>
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
