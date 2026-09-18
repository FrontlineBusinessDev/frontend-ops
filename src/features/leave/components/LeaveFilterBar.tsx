import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
  hasActiveFilters,
  onClear,
}: LeaveFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search employee, ID, or leave type…"
          className="pl-9"
        />
      </div>
      <div className="w-52">
        <Select value={leaveTypeId} onValueChange={onLeaveTypeChange} options={leaveTypeOptions} />
      </div>
      <div className="w-40">
        <Select value={status} onValueChange={onStatusChange} options={STATUS_OPTIONS} />
      </div>
      <div className="w-56">
        <Select value={hierarchy} onValueChange={onHierarchyChange} options={hierarchyOptions} />
      </div>
      <div className="flex items-end gap-1.5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-tight text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="w-36" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold tracking-tight text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="w-36" />
        </div>
      </div>
      {hasActiveFilters && (
        <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}
