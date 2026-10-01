import { Ban, Eye, Pause, Play } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils/cn'

export interface RecordCardProps {
  /** Usually the employee's name. */
  title: string
  /** What the record is, e.g. the benefit, deduction or loan type. */
  subtitle: ReactNode
  status: string
  /** The big figure, e.g. a balance or monthly amount. */
  headline: string
  headlineHint?: string
  /** 0–100; draws the progress bar (loans). */
  progress?: number
  /** Small muted lines under the headline. */
  lines?: ReactNode[]
  /** The highlighted schedule/status box at the bottom of the card. */
  note?: ReactNode
  noteIcon?: ReactNode
  onView: () => void
  /** The Edit control — usually a dialog with its own trigger button, so the card doesn't need to know how editing works. */
  edit?: ReactNode
  /** Pause when active / resume when paused. Omit to disable. */
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
  /** Shown when an action is unavailable (e.g. a finished record), or the whole record is managed elsewhere. */
  lockedReason?: string
  /** Name used in the cancel confirmation. */
  cancelName: string
  /** What cancelling means for this kind of record. */
  cancelConsequence: string
  canManage: boolean
  dimmed?: boolean
}

const PAUSABLE = new Set(['active', 'paused', 'suspended'])
const RESUMABLE = new Set(['paused', 'suspended'])
const CANCELLABLE = new Set(['active', 'paused', 'suspended'])

/**
 * The card used for every Benefits, Loans and Deductions record, so they all look and behave the same:
 * the same header and figures, and the same View / Edit / Pause / Cancel actions along the bottom.
 */
export function RecordCard(props: RecordCardProps) {
  const { title, subtitle, status, headline, headlineHint, progress, lines, note, noteIcon, onView, edit, onPause, onResume, onCancel, lockedReason, cancelName, cancelConsequence, canManage, dimmed } = props
  const [confirming, setConfirming] = useState(false)

  const resumable = RESUMABLE.has(status)
  const canPause = canManage && PAUSABLE.has(status) && !lockedReason && (resumable ? !!onResume : !!onPause)
  const canCancel = canManage && CANCELLABLE.has(status) && !lockedReason && !!onCancel
  const finished = !PAUSABLE.has(status)
  const reason = lockedReason ?? (finished ? `This record is ${status}.` : undefined)

  return (
    <>
      <Card className={cn('flex cursor-pointer flex-col p-5 transition-shadow hover:shadow-soft-lg', dimmed && 'opacity-70')} onClick={onView}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <StatusBadge status={status === 'suspended' ? 'paused' : status} />
        </div>

        <p className="mt-3 font-display text-lg font-semibold">{headline}</p>
        {headlineHint && <p className="text-xs text-muted-foreground">{headlineHint}</p>}

        {progress !== undefined && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        )}

        {lines && lines.length > 0 && (
          <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
            {lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        {note && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs">
            {noteIcon}
            <div className="min-w-0">{note}</div>
          </div>
        )}

        <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
          <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
            <Button size="sm" variant="ghost" icon={<Eye className="size-3.5" />} onClick={onView}>
              View
            </Button>
            {edit}
            {resumable ? (
              <Button size="sm" variant="ghost" icon={<Play className="size-3.5" />} disabled={!canPause} title={reason} onClick={onResume}>
                Resume
              </Button>
            ) : (
              <Button size="sm" variant="ghost" icon={<Pause className="size-3.5" />} disabled={!canPause} title={reason} onClick={onPause}>
                Pause
              </Button>
            )}
            <Button size="sm" variant="ghost" icon={<Ban className="size-3.5" />} disabled={!canCancel} title={reason} onClick={() => setConfirming(true)}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogTitle>Cancel {cancelName}?</DialogTitle>
          <DialogDescription>{cancelConsequence} This can’t be undone — to stop it only for a while, use Pause instead.</DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirming(false)
                onCancel?.()
              }}
            >
              Cancel {cancelName.length > 24 ? 'record' : 'it'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
