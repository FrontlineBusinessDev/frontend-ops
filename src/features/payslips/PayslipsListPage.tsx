import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { usePayrollPeriods } from '@/features/payroll/hooks/usePayroll'
import { formatDate } from '@/lib/utils/format'

export function PayslipsListPage() {
  const { periods, isLoading } = usePayrollPeriods()
  const navigate = useNavigate()
  const finalized = periods.filter((p) => p.status === 'finalized')

  return (
    <div className="space-y-5">
      <PageHeader title="Payslips" description="Payslips become available once a payroll period is finalized." />

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : finalized.length === 0 ? (
        <EmptyState
          title="No finalized payroll periods yet"
          description="Once a payroll admin finalizes a run, its payslips will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Pay Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {finalized.map((period) => (
              <TableRow key={period.id} className="cursor-pointer" onClick={() => navigate(`/payroll/${period.id}`)}>
                <TableCell className="font-medium">{period.label}</TableCell>
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
