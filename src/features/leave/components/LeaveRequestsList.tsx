import { Check, X } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { decideLeaveRequest } from '@/lib/services/leaveService'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import type { Employee, LeaveRequest, LeaveType } from '@/types/domain'

export function LeaveRequestsList({
  requests,
  employees,
  leaveTypes,
  onDecided,
  highlightId,
}: {
  requests: LeaveRequest[]
  employees: Employee[]
  leaveTypes: LeaveType[]
  onDecided: () => void
  highlightId?: string
}) {
  const canApprove = usePermission('leave.approve')
  const { user } = useSession()
  const { notify } = useToast()
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  const leaveTypeById = new Map(leaveTypes.map((lt) => [lt.id, lt]))

  async function decide(id: string, decision: 'approved' | 'rejected') {
    await decideLeaveRequest(user, id, decision)
    notify({ title: `Leave request ${decision}`, tone: decision === 'approved' ? 'success' : 'default' })
    onDecided()
  }

  if (requests.length === 0) {
    return <EmptyState title="No leave requests yet" description="Requests filed for employees will appear here." />
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const employee = employeeById.get(request.employeeId)
        const leaveType = leaveTypeById.get(request.leaveTypeId)
        return (
          <Card key={request.id} id={`row-${request.id}`} className={cn('p-4', request.id === highlightId && 'highlight-target')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown employee'}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{leaveType?.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(request.dateFrom)} &ndash; {formatDate(request.dateTo)}
                </p>
                {request.reason && <p className="mt-2 text-sm text-foreground">{request.reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={request.status} />
                {canApprove && request.status === 'pending' && (
                  <>
                    <Button size="sm" variant="secondary" icon={<X className="size-3.5" />} onClick={() => decide(request.id, 'rejected')}>
                      Reject
                    </Button>
                    <Button size="sm" icon={<Check className="size-3.5" />} onClick={() => decide(request.id, 'approved')}>
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
