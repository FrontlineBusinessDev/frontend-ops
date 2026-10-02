import type { ShiftTone } from '@/types/domain'

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Monday-first order used by the roster grid. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** Roster chip colors per template tone (brand tokens, so they follow light/dark mode). */
export const TONE_CLASS: Record<ShiftTone, string> = {
  accent: 'border border-primary/25 bg-primary/[0.06] text-primary',
  warning: 'border border-warning/30 bg-warning/[0.07] text-warning',
  purple: 'border border-chart-violet/30 bg-chart-violet/[0.07] text-chart-violet',
  success: 'border border-success/25 bg-success/[0.06] text-success',
}

export const TONE_OPTIONS: { value: ShiftTone; label: string }[] = [
  { value: 'accent', label: 'Teal' },
  { value: 'warning', label: 'Amber' },
  { value: 'purple', label: 'Violet' },
  { value: 'success', label: 'Green' },
]

export const REST_CLASS = 'border border-dashed border-border bg-muted/40 text-muted-foreground'
export const LEAVE_CLASS = 'border border-danger/30 bg-danger/[0.07] text-danger'
