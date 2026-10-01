import type { ReactNode } from 'react'
import { StatusBadge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'

export interface DetailField {
  label: string
  value: ReactNode
  /** Spans the full width of the grid. */
  wide?: boolean
}

/** Read-only details for a benefit or deduction — the same layout the loan details dialog uses. */
export function RecordDetailsDialog({
  open,
  onClose,
  title,
  subtitle,
  status,
  fields,
  notes,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  status: string
  fields: DetailField[]
  notes?: string
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <div className="flex items-start justify-between gap-3 pr-9">
          <div>
            <DialogTitle>{title}</DialogTitle>
            {subtitle && <DialogDescription className="mt-0.5">{subtitle}</DialogDescription>}
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/40 p-4">
          {fields.map((field) => (
            <div key={field.label} className={field.wide ? 'col-span-2' : undefined}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>
              <div className="mt-1 text-sm font-medium">{field.value}</div>
            </div>
          ))}
        </div>

        {notes && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="text-sm text-muted-foreground">{notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
