import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ value, defaultValue, onValueChange, options, placeholder = 'Select…', className, disabled, ...props }, ref) => {
    // Radix's SelectValue only resolves a label once the matching Item has
    // rendered at least once (i.e. the dropdown was opened) — which breaks
    // showing a pre-selected value (e.g. from RHF's `reset()`) before the
    // user ever opens it. Resolve the label ourselves instead of relying on
    // Radix's automatic children-matching.
    const selectedLabel = options.find((o) => o.value === value)?.label

    // Radix's Root decides controlled-vs-uncontrolled from whether `value` is
    // `undefined` on its *first* render. A field whose value arrives later
    // (e.g. react-hook-form's `reset()` firing after an async fetch) starts
    // undefined and would get stuck uncontrolled forever. Coercing to '' keeps
    // it controlled from the first render so later updates are picked up.
    const controlledValue = value === undefined && defaultValue === undefined ? '' : value

    return (
      <SelectPrimitive.Root value={controlledValue} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        >
          <SelectPrimitive.Value placeholder={placeholder}>{selectedLabel}</SelectPrimitive.Value>
          <SelectPrimitive.Icon>
            <ChevronDown className="size-4 text-muted-foreground" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-50 overflow-hidden rounded-lg border border-border bg-card shadow-soft-lg"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-7 pr-3 text-sm',
                    'outline-none data-[highlighted]:bg-muted',
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <Check className="size-3.5" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    )
  },
)
Select.displayName = 'Select'
