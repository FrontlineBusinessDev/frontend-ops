import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { fullName } from '@/features/branches/branchUtils'
import { cn } from '@/lib/utils/cn'
import type { Branch, Employee } from '@/types/domain'

type Filter = 'all' | 'unassigned' | 'transfer'

/**
 * Multi-select employee list with search, "Unassigned / Transfer" filters and select-all — used to bulk
 * assign employees when creating a branch, and to assign/transfer employees into an existing branch.
 * Employees whose branch no longer exists count as unassigned; the rest are transfers from their branch.
 */
export function EmployeeMultiPicker({
  employees,
  branches,
  value,
  onChange,
  maxHeightClass = 'max-h-64',
}: {
  /** Candidates (the caller excludes employees already in the target branch). */
  employees: Employee[]
  branches: Branch[]
  value: string[]
  onChange: (ids: string[]) => void
  maxHeightClass?: string
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const branchById = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches])
  const isUnassigned = (e: Employee) => !branchById.has(e.branchId)

  const q = query.trim().toLowerCase()
  const visible = employees
    .filter((e) => (filter === 'unassigned' ? isUnassigned(e) : filter === 'transfer' ? !isUnassigned(e) : true))
    .filter((e) => !q || `${fullName(e)} ${e.employeeNumber} ${e.employment.department} ${e.employment.position}`.toLowerCase().includes(q))
    .sort((a, b) => Number(isUnassigned(b)) - Number(isUnassigned(a)) || a.personal.lastName.localeCompare(b.personal.lastName))

  const selected = new Set(value)
  const visibleSelected = visible.filter((e) => selected.has(e.id)).length
  const allVisibleChecked = visible.length > 0 && visibleSelected === visible.length
  const unassignedCount = employees.filter(isUnassigned).length

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    onChange([...next])
  }

  function toggleAllVisible(checked: boolean) {
    const next = new Set(selected)
    for (const e of visible) {
      if (checked) next.add(e.id)
      else next.delete(e.id)
    }
    onChange([...next])
  }

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: `All (${employees.length})` },
    { value: 'unassigned', label: `Unassigned (${unassignedCount})` },
    { value: 'transfer', label: `Transfer (${employees.length - unassignedCount})` },
  ]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, department…" className="pl-9" />
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs font-medium">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn('rounded-md px-2.5 py-1.5 transition-colors', filter === f.value ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <label className="flex items-center gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <Checkbox
            aria-label="Select all listed employees"
            checked={allVisibleChecked ? true : visibleSelected > 0 ? 'indeterminate' : false}
            disabled={visible.length === 0}
            onCheckedChange={(v) => toggleAllVisible(v === true)}
          />
          <span className="flex-1">Select all listed</span>
          <span className="text-foreground">{value.length} selected</span>
        </label>
        <div className={cn('divide-y divide-border overflow-y-auto', maxHeightClass)}>
          {visible.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{employees.length === 0 ? 'No employees available to assign.' : 'No employees match your search.'}</p>
          ) : (
            visible.map((e) => {
              const current = branchById.get(e.branchId)
              return (
                <label key={e.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40">
                  <Checkbox checked={selected.has(e.id)} onCheckedChange={(v) => toggle(e.id, v === true)} aria-label={`Select ${fullName(e)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{fullName(e)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.employeeNumber} · {e.employment.position} · {e.employment.department}
                    </p>
                  </div>
                  {current ? (
                    <Badge tone="neutral" className="max-w-[45%] shrink-0 truncate" title={`Currently at ${current.name}`}>
                      From {current.name}
                    </Badge>
                  ) : (
                    <Badge tone="warning" className="shrink-0">
                      Unassigned
                    </Badge>
                  )}
                </label>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
