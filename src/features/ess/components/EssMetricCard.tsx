import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils/cn'

export type EssAccent = 'teal' | 'emerald' | 'amber' | 'indigo'

/** Soft pastel gradient + watermark/link colors per card, all built from existing brand/chart CSS vars — no new hex values. */
export const ESS_ACCENTS: Record<EssAccent, { gradient: string; watermark: string; linkText: string }> = {
  teal: {
    gradient:
      'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 7%, transparent) 0%, color-mix(in srgb, var(--color-chart-blue) 11%, transparent) 100%)',
    watermark: 'text-primary/10',
    linkText: 'text-primary',
  },
  emerald: {
    gradient:
      'linear-gradient(135deg, color-mix(in srgb, var(--color-success) 8%, transparent) 0%, color-mix(in srgb, var(--color-brand-300) 11%, transparent) 100%)',
    watermark: 'text-success/10',
    linkText: 'text-success',
  },
  amber: {
    gradient:
      'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, transparent) 0%, color-mix(in srgb, var(--color-chart-violet) 11%, transparent) 100%)',
    watermark: 'text-accent/10',
    linkText: 'text-accent',
  },
  indigo: {
    gradient:
      'linear-gradient(135deg, color-mix(in srgb, var(--color-chart-indigo) 8%, transparent) 0%, color-mix(in srgb, var(--color-chart-blue) 11%, transparent) 100%)',
    watermark: 'text-chart-indigo/10',
    linkText: 'text-chart-indigo',
  },
}

/** Large, low-opacity watermark of the card's own icon — matches the content, sits behind it in the top-right corner. */
export function EssCardWatermark({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon aria-hidden="true" className={cn('pointer-events-none absolute -right-3 -top-3 size-20', className)} />
}

export function EssMetricCard({
  to,
  label,
  value,
  hint,
  icon: Icon,
  accent,
  linkLabel,
}: {
  to: string
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  accent: EssAccent
  linkLabel: string
}) {
  const a = ESS_ACCENTS[accent]
  return (
    <Link to={to} className="block h-full">
      <div
        className="relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-card p-5 shadow-sm transition-shadow hover:shadow-soft-lg dark:border-white/10"
        style={{ backgroundImage: a.gradient }}
      >
        <EssCardWatermark icon={Icon} className={a.watermark} />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-lg font-semibold">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <p className={cn('relative mt-auto flex items-center gap-1 text-xs font-medium', a.linkText)}>
          {linkLabel} <ArrowRight className="size-3" />
        </p>
      </div>
    </Link>
  )
}
