import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { AdjustmentsList } from '@/features/attendance/components/AdjustmentsList'
import { useAttendanceAdjustments } from '@/features/attendance/hooks/useAttendance'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { LeaveRequestsList } from '@/features/leave/components/LeaveRequestsList'
import { useLeaveRequests, useLeaveTypes } from '@/features/leave/hooks/useLeave'

export function ApprovalsPage() {
  const { adjustments, isLoading: isLoadingAdjustments, refetch: refetchAdjustments } = useAttendanceAdjustments()
  const { requests, isLoading: isLoadingLeave, refetch: refetchLeave } = useLeaveRequests()
  const { leaveTypes } = useLeaveTypes()
  const { employees } = useEmployees()

  const pendingLeave = requests.filter((r) => r.status === 'pending')
  const pendingAdjustments = adjustments.filter((a) => a.status === 'pending')
  const isLoading = isLoadingAdjustments || isLoadingLeave

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Everything currently waiting on your decision, across leave and attendance."
      />

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : pendingLeave.length === 0 && pendingAdjustments.length === 0 ? (
        <EmptyState title="Nothing pending" description="You're all caught up — new requests will show up here." />
      ) : (
        <div className="space-y-6">
          {pendingLeave.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-sm font-semibold tracking-tight">Leave Requests</h2>
              <LeaveRequestsList requests={pendingLeave} employees={employees} leaveTypes={leaveTypes} onDecided={refetchLeave} />
            </div>
          )}
          {pendingAdjustments.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-sm font-semibold tracking-tight">Attendance Adjustments</h2>
              <AdjustmentsList adjustments={pendingAdjustments} employees={employees} onDecided={refetchAdjustments} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
