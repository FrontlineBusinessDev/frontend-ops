import { Eye, Send } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { PayslipEmailPreviewDialog } from '@/features/payslips/components/email/PayslipEmailPreviewDialog'
import type { PayslipEmailContent } from '@/lib/payroll/payslipEmail'
import type { PayslipEmailRecord, PayslipEmailStatus } from '@/types/domain'

/** Per-employee row actions: "Preview Payslip" (email + PDF render) and "Email Payslip". */
export function PayslipEmailActions({
  email,
  status,
  record,
  canSend,
  disabledReason,
  onSend,
  renderPayslip,
  compact,
}: {
  email: PayslipEmailContent
  status: PayslipEmailStatus
  record?: PayslipEmailRecord
  canSend: boolean
  disabledReason?: string
  onSend: () => void
  /** Rendered only while the preview is open. */
  renderPayslip: () => ReactNode
  /** Icon-only buttons, for narrow lists. */
  compact?: boolean
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="ghost" icon={<Eye className="size-3.5" />} aria-label="Preview Payslip" title="Preview Payslip" onClick={() => setPreviewOpen(true)}>
        {compact ? null : 'Preview'}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        icon={<Send className="size-3.5" />}
        aria-label="Email Payslip"
        title={canSend ? (status === 'sent' ? 'Resend payslip email' : 'Email Payslip') : disabledReason}
        isLoading={status === 'sending'}
        disabled={!canSend || status === 'sending'}
        onClick={onSend}
      >
        {compact ? null : status === 'sent' ? 'Resend' : status === 'failed' ? 'Retry' : 'Email Payslip'}
      </Button>
      {previewOpen && (
        <PayslipEmailPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          email={email}
          status={status}
          record={record}
          canSend={canSend}
          sendDisabledReason={disabledReason}
          onSend={onSend}
        >
          {renderPayslip()}
        </PayslipEmailPreviewDialog>
      )}
    </>
  )
}
