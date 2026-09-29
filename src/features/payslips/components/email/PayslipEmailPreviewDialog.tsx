import { FileText, Mail, Paperclip, Send } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { EmailStatusBadge } from '@/features/payslips/components/email/EmailStatusBadge'
import { PayslipEmailMeta, PayslipEmailTemplate } from '@/features/payslips/components/email/PayslipEmailTemplate'
import type { PayslipEmailContent } from '@/lib/payroll/payslipEmail'
import { cn } from '@/lib/utils/cn'
import type { PayslipEmailRecord, PayslipEmailStatus } from '@/types/domain'

type PreviewMode = 'email' | 'pdf'

/**
 * Shows the exact email an employee will receive — the branded HTML notification (sender, recipient,
 * timestamp, greeting, View Payslip button, pay period/date) — plus the attached PDF payslip, rendered by
 * the same component the payslip page prints. Sending from here dispatches exactly what's previewed.
 */
export function PayslipEmailPreviewDialog({
  open,
  onOpenChange,
  email,
  status,
  record,
  canSend,
  sendDisabledReason,
  onSend,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: PayslipEmailContent
  status: PayslipEmailStatus
  record?: PayslipEmailRecord
  canSend: boolean
  /** Why sending isn't available yet (e.g. the payroll isn't finalized). */
  sendDisabledReason?: string
  onSend: () => void
  /** The rendered payslip document. */
  children: ReactNode
}) {
  const [mode, setMode] = useState<PreviewMode>('email')
  const missingRecipient = !email.to

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-4xl flex-col overflow-hidden p-0 sm:p-0">
        <div className="border-b border-border px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pt-5">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Preview Payslip Email
            <EmailStatusBadge status={status} record={record} />
          </DialogTitle>
          <DialogDescription>This is exactly what the employee receives — the email and the attached PDF payslip.</DialogDescription>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="min-w-0 break-words">
              <span className="font-medium text-foreground">Subject:</span> {email.subject}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1">
              <Paperclip className="size-3.5 shrink-0" />
              <span className="truncate">{email.attachmentName}</span>
            </span>
          </div>
          <div className="mt-3 inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs font-medium">
            {(
              [
                { value: 'email', label: 'Email', icon: Mail },
                { value: 'pdf', label: 'PDF Attachment', icon: FileText },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
                  mode === value ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-3 sm:p-5">
          {mode === 'email' ? (
            <div className="payslip-paper mx-auto max-w-[640px] rounded-xl p-3 shadow-soft sm:p-5">
              <PayslipEmailMeta email={email} timestamp={record?.status === 'sent' && record.sentAt ? record.sentAt : new Date().toISOString()} />
              <PayslipEmailTemplate email={email} />
            </div>
          ) : (
            <div className="payslip-paper mx-auto w-full max-w-[8.5in] rounded-sm px-[0.3in] py-[0.4in] shadow-soft-lg sm:px-[0.5in]">
              {children}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground">
            {!canSend && sendDisabledReason
              ? sendDisabledReason
              : missingRecipient
                ? 'This employee has no email address on file — sending will fail until one is added.'
                : `Will be sent to ${email.to}`}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button icon={<Send className="size-4" />} isLoading={status === 'sending'} disabled={!canSend || status === 'sending'} onClick={onSend}>
              {status === 'sent' ? 'Resend Email' : status === 'failed' ? 'Retry Email' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
