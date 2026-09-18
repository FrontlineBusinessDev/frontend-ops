import { Check, Clock, X } from 'lucide-react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Employee, OvertimeRecord } from '@/types/domain'

const TYPE_LABEL: Record<OvertimeRecord['type'], string> = {
  regular: 'Regular OT',
  rest_day_holiday: 'Rest Day OT',
  night_diff: 'Night Diff',
}

function estimatedHourlyRate(employee: Employee | undefined): number {
  if (!employee) return 0
  return employee.compensation.basicPay / (22 * 8)
}

export function OvertimeDetailsDialog({
  record,
  employee,
  canApprove,
  onClose,
  onDecide,
}: {
  record: OvertimeRecord | null
  employee: Employee | undefined
  canApprove: boolean
  onClose: () => void
  onDecide: (decision: 'approved' | 'rejected') => void
}) {
  const open = record !== null
  const hourlyRate = estimatedHourlyRate(employee)
  const payDelta = record ? record.hours * hourlyRate * record.multiplier : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {record && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>
                  {employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown employee'}
                </DialogTitle>
                <DialogDescription>
                  {employee?.employeeNumber} &middot; {employee?.employment.department}
                </DialogDescription>
              </div>
              <StatusBadge status={record.status} />
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/40 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p>
                  <p className="mt-1 text-sm font-medium">{formatDate(record.date)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</p>
                  <Badge tone="brand" className="mt-1">
                    {TYPE_LABEL[record.type]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Timecard</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {record.startTime} – {record.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hours Logged</p>
                  <p className="mt-1 text-sm font-medium">{record.hours} hrs</p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated Pay Delta</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {record.hours} hrs &times; {formatCurrency(hourlyRate)}/hr &times; {Math.round(record.multiplier * 100)}%
                  </p>
                  <p className="font-display text-lg font-semibold">{formatCurrency(payDelta)}</p>
                </div>
              </div>

              {record.reason && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason / Notes</p>
                  <p className="mt-1 text-sm text-foreground">{record.reason}</p>
                </div>
              )}

              {record.decidedBy && (
                <p className="text-xs text-muted-foreground">
                  {record.status === 'approved' ? 'Approved' : 'Rejected'} by {record.decidedBy}
                  {record.decidedAt ? ` on ${formatDate(record.decidedAt)}` : ''}
                </p>
              )}
            </div>

            {canApprove && record.status === 'pending' && (
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="destructive" icon={<X className="size-4" />} onClick={() => onDecide('rejected')}>
                  Reject
                </Button>
                <Button icon={<Check className="size-4" />} onClick={() => onDecide('approved')}>
                  Approve
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
