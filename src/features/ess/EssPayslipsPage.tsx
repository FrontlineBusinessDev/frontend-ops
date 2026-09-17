import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { db } from '@/mock-data'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export function EssPayslipsPage() {
  const { employee, isLoading } = useSelfEmployee()
  const navigate = useNavigate()

  if (isLoading) return <Skeleton className="h-72" />
  if (!employee) return <p className="text-sm text-muted-foreground">No employee record linked to this account.</p>

  const lines = db.payrollLines
    .filter((l) => l.employeeId === employee.id)
    .filter((l) => db.payrollPeriods.find((p) => p.id === l.periodId)?.status === 'finalized')

  return (
    <div className="space-y-5">
      <PageHeader title="My Payslips" description="View and download your payslips after each payroll run is finalized." />

      {lines.length === 0 ? (
        <EmptyState title="No payslips yet" description="Your payslips will appear here once payroll is finalized." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Gross Pay</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead>Pay Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const period = db.payrollPeriods.find((p) => p.id === line.periodId)
              return (
                <TableRow key={line.id} className="cursor-pointer" onClick={() => navigate(`/ess/payslips/${line.id}`)}>
                  <TableCell className="font-medium">{period?.label}</TableCell>
                  <TableCell>{formatCurrency(line.grossPay)}</TableCell>
                  <TableCell>{formatCurrency(line.netPay)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{period && formatDate(period.payDate)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
