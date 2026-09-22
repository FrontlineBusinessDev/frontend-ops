import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'

export interface EmployeeComboboxOption {
  id: string
  name: string
  employeeNumber: string
  department?: string
}

interface EmployeeComboboxBaseProps {
  employees: EmployeeComboboxOption[]
  placeholder?: string
  className?: string
}

export interface EmployeeComboboxSingleProps extends EmployeeComboboxBaseProps {
  multiple?: false
  value: string | undefined
  onChange: (id: string | undefined) => void
}

export interface EmployeeComboboxMultiProps extends EmployeeComboboxBaseProps {
  multiple: true
  value: string[]
  onChange: (ids: string[]) => void
}

export type EmployeeComboboxProps = EmployeeComboboxSingleProps | EmployeeComboboxMultiProps

/** Type-to-search employee picker (name or employee ID), with single- or multi-select and a quick-clear control. */
export function EmployeeCombobox(props: EmployeeComboboxProps) {
  const { employees, placeholder = 'Search employee by name or ID…', className } = props
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedIds = props.multiple ? props.value : props.value ? [props.value] : []
  const selectedEmployees = employees.filter((e) => selectedIds.includes(e.id))

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.employeeNumber.toLowerCase().includes(q) || (e.department ?? '').toLowerCase().includes(q),
    )
  }, [employees, query])

  function toggle(id: string) {
    if (props.multiple) {
      props.onChange(props.value.includes(id) ? props.value.filter((v) => v !== id) : [...props.value, id])
    } else {
      props.onChange(id === props.value ? undefined : id)
      setOpen(false)
      setQuery('')
    }
  }

  function clearAll(e: React.MouseEvent) {
    e.stopPropagation()
    if (props.multiple) props.onChange([])
    else props.onChange(undefined)
  }

  function removeOne(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (props.multiple) props.onChange(props.value.filter((v) => v !== id))
    else props.onChange(undefined)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          {selectedEmployees.length === 0 ? (
            <span className="flex-1 truncate text-left text-muted-foreground">{placeholder}</span>
          ) : props.multiple ? (
            <span className="flex flex-1 flex-wrap gap-1 truncate py-0.5">
              {selectedEmployees.map((emp) => (
                <span key={emp.id} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {emp.name}
                  <span role="button" tabIndex={-1} onClick={(e) => removeOne(e, emp.id)} className="rounded-full hover:bg-primary/20">
                    <X className="size-3" />
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span className="flex-1 truncate text-left">{selectedEmployees[0].name}</span>
          )}
          {selectedEmployees.length > 0 && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clearAll}
              aria-label="Clear selection"
              className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-soft-lg"
        >
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or employee ID…"
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="max-h-64 scroll-smooth overflow-y-auto p-1">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No matching employee records found.</p>
            ) : (
              results.map((emp) => {
                const isSelected = selectedIds.includes(emp.id)
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggle(emp.id)}
                    className={cn('flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted', isSelected && 'bg-primary/5')}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{emp.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {emp.employeeNumber}
                        {emp.department && ` | ${emp.department}`}
                      </span>
                    </span>
                    {isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
                  </button>
                )
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
