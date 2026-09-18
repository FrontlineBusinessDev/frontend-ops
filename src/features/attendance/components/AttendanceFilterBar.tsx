import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
  hasActiveFilters,
  onClear,
}: AttendanceFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search employee name or ID…"
          className="pl-9"
        />
      </div>
      <div className="w-44">
        <Select value={branchId} onValueChange={onBranchChange} options={branchOptions} />
      </div>
      <div className="w-44">
        <Select value={group} onValueChange={onGroupChange} options={groupOptions} />
      </div>
      <div className="w-44">
        <Select value={department} onValueChange={onDepartmentChange} options={departmentOptions} />
      </div>
      <div className="w-48">
        <Select value={status} onValueChange={onStatusChange} options={statusOptions} />
      </div>
      {hasActiveFilters && (
        <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}
