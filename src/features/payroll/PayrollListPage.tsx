import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { CreatePeriodDialog } from '@/features/payroll/components/CreatePeriodDialog'
import { usePayrollPeriods } from '@/features/payroll/hooks/usePayroll'
import { usePayrollGroups } from '@/features/company-settings/hooks/usePayrollGroups'
import { usePermission } from '@/hooks/usePermission'
import { formatDate } from '@/lib/utils/format'

export function PayrollListPage() {
  const { periods, isLoading, refetch } = usePayrollPeriods()
  const { groups } = usePayrollGroups()
  const canRun = usePermission('payroll.run')
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll Runs"
        description="Create payroll periods, run calculations, and move each period through review, approval, and finalization."
        actions={canRun && <CreatePeriodDialog onCreated={refetch} />}
      />

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : periods.length === 0 ? (
        <EmptyState
          title="No payroll periods yet"
          description="Create your first payroll period to start running calculations."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Payroll Group</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Pay Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={period.id} className="cursor-pointer" onClick={() => navigate(`/payroll/${period.id}`)}>
                <TableCell className="font-medium">{period.label}</TableCell>
                <TableCell>
                  {period.payrollGroupId ? (
                    <Badge tone="brand">{groups.find((g) => g.id === period.payrollGroupId)?.name ?? 'Unknown Group'}</Badge>
                  ) : (
                    <Badge tone="neutral">All Employees</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {formatDate(period.startDate)} &ndash; {formatDate(period.endDate)}
                </TableCell>
                <TableCell>{formatDate(period.payDate)}</TableCell>
                <TableCell>
                  <StatusBadge status={period.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
