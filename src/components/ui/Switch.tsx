import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'value'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block size-3.5 rounded-full bg-white shadow-soft transition-transform duration-150',
          checked ? 'translate-x-[19px]' : 'translate-x-1',
        )}
      />
    </button>
  ),
)
Switch.displayName = 'Switch'
