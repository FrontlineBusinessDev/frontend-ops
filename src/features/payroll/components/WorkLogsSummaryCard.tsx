import { AlertCircle, ArrowRight, Boxes, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { useSession } from '@/hooks/useSession'
import { getWorkLogSummaryForPeriod } from '@/lib/services/compensationApprovalService'
import type { WorkLogSummary } from '@/lib/services/compensationApprovalService'
import { formatCurrency } from '@/lib/utils/format'
import type { PayrollPeriod } from '@/types/domain'

type PeriodScope = Pick<PayrollPeriod, 'id' | 'status' | 'startDate' | 'endDate' | 'payrollGroupId'>

function useWorkLogSummary(period: PeriodScope | null, refreshKey: unknown) {
  const { user } = useSession()
  const [summary, setSummary] = useState<WorkLogSummary | null>(null)
  const id = period?.id ?? ''
  const status = period?.status ?? 'draft'
  const startDate = period?.startDate ?? ''
  const endDate = period?.endDate ?? ''
  const payrollGroupId = period?.payrollGroupId

  useEffect(() => {
    const valid = startDate && endDate && startDate <= endDate
    const request = valid ? getWorkLogSummaryForPeriod(user, { id, status, startDate, endDate, payrollGroupId }) : Promise.resolve(null)
    request.then(setSummary)
  }, [user, id, status, startDate, endDate, payrollGroupId, refreshKey])

  return summary
}

function hasAny(s: WorkLogSummary) {
  return s.hourly.records + s.output.records + s.pendingCount + s.rejectedCount + s.excludedApprovedCount > 0
}

function plural(n: number, word: string) {
  if (n === 1) return `${n} ${word}`
  return `${n} ${word.endsWith('entry') ? `${word.slice(0, -1)}ies` : `${word}s`}`
}

/** "Approved Work Logs" card on a payroll period — what this run pays (or, while draft, would pay) from the Approvals module. */
export function WorkLogsSummaryCard({ period, refreshKey }: { period: PayrollPeriod; refreshKey?: unknown }) {
  const summary = useWorkLogSummary(period, refreshKey)
  if (!summary || !hasAny(summary)) return null

  const isDraft = period.status === 'draft'
  const approvalsHref = `/approvals?${new URLSearchParams({ status: 'pending', periodId: period.id })}`
  const tiles = [
    { icon: Clock, label: `${plural(summary.hourly.records, 'Approved Hourly Record')}`, detail: `${summary.hourly.quantity} hrs`, amount: summary.hourly.amount },
    { icon: Boxes, label: `${plural(summary.output.records, 'Approved Piece-Rate / Output Record')}`, detail: `${summary.output.quantity} units`, amount: summary.output.amount },
  ]

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold tracking-tight">Approved Work Logs</p>
          <p className="text-xs text-muted-foreground">
            {isDraft
              ? 'Ready for processing — only approved hourly timecards and output submissions dated in this period are paid.'
              : 'Paid in this run as Hourly Compensation Pay and Output / Piece-Rate Pay.'}
          </p>
        </div>
        <Link to={approvalsHref} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Open Approvals
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {tiles.map(({ icon: Icon, label, detail, amount }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{detail}</p>
            </div>
            <p className="shrink-0 font-display text-base font-semibold tabular-nums">{formatCurrency(amount)}</p>
          </div>
        ))}
      </div>

      {(summary.pendingCount > 0 || summary.rejectedCount > 0 || summary.excludedApprovedCount > 0) && (
        <div className="mt-3 space-y-1">
          {summary.pendingCount > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-warning">
              <AlertCircle className="size-3.5 shrink-0" />
              {isDraft
                ? `${plural(summary.pendingCount, 'pending entry')} in this period won't be paid unless approved before you run payroll.`
                : `${plural(summary.pendingCount, 'entry')} still pending were not paid in this run.`}
              <Link to={approvalsHref} className="font-medium underline-offset-2 hover:underline">
                Review &amp; approve
              </Link>
            </p>
          )}
          {summary.rejectedCount > 0 && (
            <p className="text-xs text-muted-foreground">{plural(summary.rejectedCount, 'rejected entry')} excluded.</p>
          )}
          {summary.excludedApprovedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {isDraft
                ? `${plural(summary.excludedApprovedCount, 'approved entry')} already paid in another payroll run — excluded.`
                : `${plural(summary.excludedApprovedCount, 'approved entry')} not in this run (approved afterward or paid in another run).`}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

/** Compact preview for the New Payroll Period dialog, driven by the dates being entered. */
export function WorkLogsRangePreview({ startDate, endDate, payrollGroupId }: { startDate?: string; endDate?: string; payrollGroupId?: string }) {
  const summary = useWorkLogSummary(
    startDate && endDate ? { id: '', status: 'draft', startDate, endDate, payrollGroupId } : null,
    null,
  )
  if (!summary || !hasAny(summary)) return null

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs">
      <p className="font-medium text-foreground">Approved work logs in this range</p>
      <p className="mt-0.5 text-muted-foreground">
        {plural(summary.hourly.records, 'approved hourly record')} ({summary.hourly.quantity} hrs) ·{' '}
        {plural(summary.output.records, 'approved output record')} ({summary.output.quantity} units) ·{' '}
        {formatCurrency(summary.hourly.amount + summary.output.amount)}
      </p>
      {summary.pendingCount > 0 && (
        <p className="mt-0.5 text-warning">{plural(summary.pendingCount, 'pending entry')} won&apos;t be included unless approved first.</p>
      )}
    </div>
  )
}
