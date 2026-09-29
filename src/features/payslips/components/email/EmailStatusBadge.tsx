import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/format'
import type { PayslipEmailRecord, PayslipEmailStatus } from '@/types/domain'

const STATUS_META: Record<PayslipEmailStatus, { label: string; tone: 'neutral' | 'brand' | 'success' | 'danger' }> = {
  unsent: { label: 'Unsent', tone: 'neutral' },
  sending: { label: 'Sending…', tone: 'brand' },
  sent: { label: 'Sent', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
}

function tooltipFor(status: PayslipEmailStatus, record?: PayslipEmailRecord): string | undefined {
  if (status === 'sent' && record?.sentAt)
    return `Sent to ${record.recipient} · ${formatDate(record.sentAt, { hour: 'numeric', minute: '2-digit' })}${record.sentBy ? ` by ${record.sentBy}` : ''}`
  if (status === 'failed' && record?.error) return record.error
  return undefined
}

/** Email dispatch status pill: Unsent / Sending… / Sent / Failed (hover for the recipient or error). */
export function EmailStatusBadge({ status, record }: { status: PayslipEmailStatus; record?: PayslipEmailRecord }) {
  const meta = STATUS_META[status]
  const Icon = status === 'sending' ? Loader2 : status === 'sent' ? CheckCircle2 : status === 'failed' ? XCircle : CircleDashed
  const tooltip = tooltipFor(status, record)
  return (
    <span className="inline-flex flex-col items-start gap-0.5" title={tooltip}>
      <Badge tone={meta.tone} className="whitespace-nowrap">
        <Icon className={status === 'sending' ? 'size-3 animate-spin' : 'size-3'} />
        {meta.label}
      </Badge>
      {status === 'failed' && record?.error && <span className="max-w-[12rem] truncate text-[11px] text-danger">{record.error}</span>}
    </span>
  )
}
