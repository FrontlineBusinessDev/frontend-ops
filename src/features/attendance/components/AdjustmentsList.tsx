import { Check, X } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { decideAttendanceAdjustment } from '@/lib/services/attendanceService'
import { formatDate } from '@/lib/utils/format'
import type { AttendanceAdjustment, Employee } from '@/types/domain'

export function AdjustmentsList({
  adjustments,
  employees,
  onDecided,
}: {
  adjustments: AttendanceAdjustment[]
  employees: Employee[]
  onDecided: () => void
}) {
  const canApprove = usePermission('attendance.approve')
  const { user } = useSession()
  const { notify } = useToast()
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  async function decide(id: string, decision: 'approved' | 'rejected') {
    await decideAttendanceAdjustment(user, id, decision)
    notify({ title: `Adjustment ${decision}`, tone: decision === 'approved' ? 'success' : 'default' })
    onDecided()
  }

  if (adjustments.length === 0) {
    return <EmptyState title="No adjustment requests" description="Requests from HR will show up here for approval." />
  }

  return (
    <div className="space-y-3">
      {adjustments.map((adjustment) => {
        const employee = employeeById.get(adjustment.employeeId)
        return (
          <Card key={adjustment.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown employee'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Requested {formatDate(adjustment.requestedAt)} &middot; New time: {adjustment.requestedTimeIn ?? '—'}
                  {' – '}
                  {adjustment.requestedTimeOut ?? '—'}
                </p>
                <p className="mt-2 text-sm text-foreground">{adjustment.reason}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={adjustment.status} />
                {canApprove && adjustment.status === 'pending' && (
                  <>
                    <Button size="sm" variant="secondary" icon={<X className="size-3.5" />} onClick={() => decide(adjustment.id, 'rejected')}>
                      Reject
                    </Button>
                    <Button size="sm" icon={<Check className="size-3.5" />} onClick={() => decide(adjustment.id, 'approved')}>
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
