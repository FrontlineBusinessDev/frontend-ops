import { Mails, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import type { PayslipEmailStatus } from '@/types/domain'

export function SelectAllCheckbox({ state, onChange, disabled }: { state: boolean | 'indeterminate'; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <Checkbox aria-label="Select all payslips" checked={state} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
}

export function RowCheckbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <Checkbox aria-label={`Select ${label}`} checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
}

export interface BulkEmailCandidate {
  employeeId: string
  employeeName: string
  hasEmail: boolean
  status: PayslipEmailStatus
}

/**
 * Toolbar above a payslip table: live dispatch counts, "Bulk Email Payslips" for the selected rows (or
 * everyone when nothing is selected), and "Retry Failed". Bulk sends go through a confirmation step.
 */
export function BulkEmailToolbar({
  candidates,
  selectedIds,
  canSend,
  disabledReason,
  isSending,
  onSend,
  onSent,
}: {
  candidates: BulkEmailCandidate[]
  selectedIds: Set<string>
  canSend: boolean
  disabledReason?: string
  isSending: boolean
  onSend: (employeeIds: string[]) => Promise<void>
  /** Called after a confirmed bulk send completes (e.g. to clear the selection). */
  onSent?: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [skipSent, setSkipSent] = useState(true)

  const counts = candidates.reduce(
    (acc, c) => {
      acc[c.status] += 1
      return acc
    },
    { unsent: 0, sending: 0, sent: 0, failed: 0 } as Record<PayslipEmailStatus, number>,
  )
  const scope = selectedIds.size > 0 ? candidates.filter((c) => selectedIds.has(c.employeeId)) : candidates
  const alreadySent = scope.filter((c) => c.status === 'sent').length
  const targets = scope.filter((c) => c.status !== 'sending' && !(skipSent && c.status === 'sent'))
  const missingEmail = targets.filter((c) => !c.hasEmail).length
  const failed = candidates.filter((c) => c.status === 'failed')

  async function confirmSend() {
    setConfirmOpen(false)
    await onSend(targets.map((t) => t.employeeId))
    onSent?.()
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Email Payslips</p>
        <p>
          <span className="text-success">{counts.sent} sent</span> · {counts.unsent} unsent
          {counts.failed > 0 && <span className="text-danger"> · {counts.failed} failed</span>}
          {counts.sending > 0 && <span className="text-primary"> · {counts.sending} sending…</span>}
          {selectedIds.size > 0 && <span className="text-foreground"> · {selectedIds.size} selected</span>}
        </p>
        {!canSend && disabledReason && <p className="mt-0.5">{disabledReason}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {failed.length > 0 && (
          <Button size="sm" variant="secondary" icon={<RotateCcw className="size-3.5" />} disabled={!canSend || isSending} onClick={() => onSend(failed.map((f) => f.employeeId))}>
            Retry Failed ({failed.length})
          </Button>
        )}
        <Button size="sm" icon={<Mails className="size-4" />} isLoading={isSending} disabled={!canSend || isSending || candidates.length === 0} onClick={() => setConfirmOpen(true)}>
          Bulk Email Payslips {selectedIds.size > 0 ? `(${selectedIds.size} selected)` : `(all ${candidates.length})`}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogTitle>
            Email {targets.length} payslip{targets.length === 1 ? '' : 's'}?
          </DialogTitle>
          <DialogDescription>
            {selectedIds.size > 0 ? `Sending to the ${scope.length} selected employee(s).` : `Sending to all ${scope.length} employees in this list.`} Each employee receives only their own
            payslip, attached as a PDF.
          </DialogDescription>
          <div className="mt-4 space-y-2 text-sm">
            {alreadySent > 0 && (
              <label className="flex items-center gap-2">
                <Checkbox checked={skipSent} onCheckedChange={(v) => setSkipSent(v === true)} />
                Skip {alreadySent} employee(s) already sent
              </label>
            )}
            {missingEmail > 0 && (
              <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                {missingEmail} employee(s) have no email address on file — their payslips will be marked Failed.
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button icon={<Mails className="size-4" />} disabled={targets.length === 0} onClick={confirmSend}>
              Send {targets.length} Email{targets.length === 1 ? '' : 's'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
