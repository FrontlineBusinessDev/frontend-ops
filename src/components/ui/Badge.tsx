import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

const TONE_CLASSES = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
} as const

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof TONE_CLASSES
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, tone = 'neutral', ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight',
      TONE_CLASSES[tone],
      className,
    )}
    {...props}
  />
))
Badge.displayName = 'Badge'

const STATUS_TONE: Record<string, keyof typeof TONE_CLASSES> = {
  active: 'success',
  approved: 'success',
  finalized: 'success',
  paid: 'success',
  inactive: 'neutral',
  archived: 'neutral',
  pending: 'warning',
  review: 'warning',
  open: 'brand',
  rejected: 'danger',
  late: 'warning',
  absent: 'danger',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status.toLowerCase()] ?? 'neutral'
  return (
    <Badge tone={tone} className="capitalize">
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}
