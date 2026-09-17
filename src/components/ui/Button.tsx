import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

const VARIANT_CLASSES = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90 shadow-soft',
  secondary: 'bg-card text-foreground border border-border hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  destructive: 'bg-danger text-danger-foreground hover:opacity-90 shadow-soft',
} as const

const SIZE_CLASSES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-sm gap-2',
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_CLASSES
  size?: keyof typeof SIZE_CLASSES
  asChild?: boolean
  isLoading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', asChild, isLoading, icon, disabled, children, ...props },
    ref,
  ) => {
    const sharedClassName = cn(
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ease-[var(--ease-editorial)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:pointer-events-none disabled:opacity-50',
      'active:scale-[0.98]',
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      className,
    )

    // Slot (asChild) requires exactly one child element to clone props onto,
    // so the icon/loading decoration can only be rendered in native button mode.
    if (asChild) {
      return (
        <Slot ref={ref} className={sharedClassName} {...props}>
          {children}
        </Slot>
      )
    }

    return (
      <button ref={ref} className={sharedClassName} disabled={disabled || isLoading} {...props}>
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : icon}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
