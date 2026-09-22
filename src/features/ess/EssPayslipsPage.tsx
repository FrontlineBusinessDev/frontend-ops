import { Download, Eye } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { buildSamplePayslips } from '@/features/ess/sampleData'
import type { SamplePayslip } from '@/features/ess/sampleData'
import { useOvertimeRecords } from '@/features/overtime/hooks/useOvertime'
import { PayslipCard } from '@/features/payslips/components/PayslipCard'
import { useHighlightTarget } from '@/hooks/useHighlightTarget'
import { useTenant } from '@/hooks/useTenant'
import { db } from '@/mock-data'
import { cn } from '@/lib/utils/cn'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { PayrollLine, PayrollPeriod } from '@/types/domain'

function statutoryTotal(line: PayrollLine): number {
  return line.sssEmployeeShare + line.philhealthEmployeeShare + line.pagibigEmployeeShare + line.withholdingTax
}

export function EssPayslipsPage() {
  const { employee, isLoading } = useSelfEmployee()
  const { company } = useTenant()
  const { records: overtimeRecords } = useOvertimeRecords()
  const { highlightId } = useHighlightTarget()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<{ period: PayrollPeriod; line: PayrollLine } | null>(null)

  if (isLoading) return <Skeleton className="h-72" />
  if (!employee) return <p className="text-sm text-muted-foreground">No employee record linked to this account.</p>

  const realLines = db.payrollLines
    .filter((l) => l.employeeId === employee.id)
    .filter((l) => db.payrollPeriods.find((p) => p.id === l.periodId)?.status === 'finalized')

  const isSample = realLines.length === 0
  const rows: SamplePayslip[] = isSample
    ? buildSamplePayslips(employee, employee.companyId)
    : realLines.map((line) => {
        const period = db.payrollPeriods.find((p) => p.id === line.periodId)!
        const otHours = overtimeRecords
          .filter((r) => r.employeeId === employee.id && r.status === 'approved' && r.date >= period.startDate && r.date <= period.endDate)
          .reduce((sum, r) => sum + r.hours, 0)
        return { line, period, otHours }
      })

  return (
    <div className="space-y-5">
      <PageHeader title="My Payslips" description="View and download your payslips after each payroll run is finalized." />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Gross Pay</TableHead>
            <TableHead>Statutory Deductions</TableHead>
            <TableHead>Overtime</TableHead>
            <TableHead>Net Pay</TableHead>
            <TableHead>Pay Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ period, line, otHours }) => (
            <TableRow key={line.id} id={`row-${line.id}`} className={cn(line.id === highlightId && 'highlight-target')}>
              <TableCell className="font-medium">{period.label}</TableCell>
              <TableCell>{formatCurrency(line.grossPay)}</TableCell>
              <TableCell>{formatCurrency(statutoryTotal(line))}</TableCell>
              <TableCell>{otHours > 0 ? `${otHours} hrs` : '—'}</TableCell>
              <TableCell>{formatCurrency(line.netPay)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDate(period.payDate)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Eye className="size-3.5" />}
                    onClick={() => (isSample ? setPreview({ period, line }) : navigate(`/ess/payslips/${line.id}`))}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Download className="size-3.5" />}
                    onClick={() => (isSample ? setPreview({ period, line }) : navigate(`/ess/payslips/${line.id}`))}
                  >
                    Download
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{preview?.period.label}</DialogTitle>
          <DialogDescription>Payslip preview &mdash; use Print / Download inside the full payslip for a PDF copy.</DialogDescription>
          {preview && (
            <div className="mt-4">
              <PayslipCard company={company} employee={employee} period={preview.period} line={preview.line} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
