import * as PopoverPrimitive from '@radix-ui/react-popover'
import { ArrowDown, ArrowUp, ListFilter } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select, type SelectOption } from '@/components/ui/Select'
import { cn } from '@/lib/utils/cn'

export interface FiltersPopoverProps {
  children: ReactNode
  activeCount?: number
  footer?: ReactNode
  align?: 'start' | 'end'
  className?: string
}

/** Standardized "Filters" popover trigger + panel, used app-wide wherever a table/list needs filter controls. */
export function FiltersPopover({ children, activeCount = 0, footer, align = 'start', className }: FiltersPopoverProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="secondary"
          icon={<ListFilter className="size-4" />}
          className={cn(activeCount > 0 && 'border-primary/40 text-primary')}
        >
          Filters
          {activeCount > 0 && (
            <Badge tone="brand" className="ml-0.5">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={8}
          className={cn(
            'z-50 w-80 rounded-2xl border border-border bg-card p-4 shadow-soft-lg',
            'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
            className,
          )}
        >
          <p className="mb-3 font-display text-sm font-semibold tracking-tight">Filters</p>
          <div className="space-y-3">{children}</div>
          {footer && <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">{footer}</div>}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold tracking-tight text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

export type SortDirection = 'asc' | 'desc'

export interface SortControlProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  direction: SortDirection
  onDirectionChange: (direction: SortDirection) => void
}

/** "Sort by" field paired with an inline ascending/descending toggle — the last item in every Filters panel. */
export function SortControl({ value, onValueChange, options, direction, onDirectionChange }: SortControlProps) {
  return (
    <FilterField label="Sort by">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select value={value} onValueChange={onValueChange} options={options} />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 px-2.5"
          icon={direction === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
          onClick={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')}
          aria-label={direction === 'asc' ? 'Sort ascending' : 'Sort descending'}
        />
      </div>
    </FilterField>
  )
}
