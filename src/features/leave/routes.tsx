import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { LeaveRequestDialog } from '@/features/leave/components/LeaveRequestDialog'
import { LeaveRequestsList } from '@/features/leave/components/LeaveRequestsList'
import { LeaveTypesPanel } from '@/features/leave/components/LeaveTypesPanel'
import { useLeaveRequests, useLeaveTypes } from '@/features/leave/hooks/useLeave'
import { usePermission } from '@/hooks/usePermission'

export function LeavePage() {
  const { requests, isLoading, refetch } = useLeaveRequests()
  const leaveTypes = useLeaveTypes()
  const { employees } = useEmployees()
  const canRequest = usePermission('leave.request')

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leave Management"
        description="Leave requests, approvals, and company leave types."
        actions={canRequest && <LeaveRequestDialog employees={employees} leaveTypes={leaveTypes} onCreated={refetch} />}
      />

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="types">Leave Types & Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          {isLoading ? (
            <Skeleton className="h-72" />
          ) : (
            <LeaveRequestsList requests={requests} employees={employees} leaveTypes={leaveTypes} onDecided={refetch} />
          )}
        </TabsContent>

        <TabsContent value="types">
          <LeaveTypesPanel leaveTypes={leaveTypes} employees={employees} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
