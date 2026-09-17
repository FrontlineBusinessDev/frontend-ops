import { ArrowLeft, Lock, PlayCircle, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { usePayrollLines, usePayrollPeriods } from '@/features/payroll/hooks/usePayroll'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { approvePayroll, finalizePayroll, runPayroll } from '@/lib/services/payrollService'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export function PayrollPeriodDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useSession()
  const { notify } = useToast()
  const { periods, refetch: refetchPeriods } = usePayrollPeriods()
  const { lines, isLoading: isLoadingLines, refetch: refetchLines } = usePayrollLines(id)
  const { employees } = useEmployees()
  const canRun = usePermission('payroll.run')
  const canApprove = usePermission('payroll.approve')
  const canFinalize = usePermission('payroll.finalize')
  const [busy, setBusy] = useState(false)
  const [confirmFinalize, setConfirmFinalize] = useState(false)

  const period = periods.find((p) => p.id === id)
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  if (!period) return <Skeleton className="h-96" />

  async function handleRun() {
    if (!id) return
    setBusy(true)
    await runPayroll(user, id)
    setBusy(false)
    notify({ title: 'Payroll calculated', description: `${lines.length || employees.length} employee lines generated.`, tone: 'success' })
    refetchPeriods()
    refetchLines()
  }

  async function handleApprove() {
    if (!id) return
    await approvePayroll(user, id)
    notify({ title: 'Payroll approved', tone: 'success' })
    refetchPeriods()
  }

  async function handleFinalize() {
    if (!id) return
    await finalizePayroll(user, id)
    notify({ title: 'Payroll finalized', description: 'Payslips are now available and loan balances were updated.', tone: 'success' })
    setConfirmFinalize(false)
    refetchPeriods()
  }

  const totals = lines.reduce(
    (acc, line) => ({
      gross: acc.gross + line.grossPay,
      deductions: acc.deductions + line.totalDeductions,
      net: acc.net + line.netPay,
    }),
    { gross: 0, deductions: 0, net: 0 },
  )

  return (
    <div className="space-y-5">
      <Link to="/payroll" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to payroll runs
      </Link>

      <PageHeader
        title={period.label}
        description={`${formatDate(period.startDate)} – ${formatDate(period.endDate)} · Pay date ${formatDate(period.payDate)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={period.status} />
            {period.status === 'draft' && canRun && (
              <Button size="sm" icon={<PlayCircle className="size-4" />} isLoading={busy} onClick={handleRun}>
                Run Payroll
              </Button>
            )}
            {period.status === 'review' && canApprove && (
              <Button size="sm" icon={<ShieldCheck className="size-4" />} onClick={handleApprove}>
                Approve
              </Button>
            )}
            {period.status === 'approved' && canFinalize && (
              <Button size="sm" variant="destructive" icon={<Lock className="size-4" />} onClick={() => setConfirmFinalize(true)}>
                Finalize
              </Button>
            )}
          </div>
        }
      />

      {isLoadingLines ? (
        <Skeleton className="h-72" />
      ) : lines.length === 0 ? (
        <EmptyState
          title="Payroll not yet calculated"
          description={canRun ? 'Run payroll to calculate earnings, deductions, and net pay for every active employee.' : 'Waiting for a payroll admin to run this period.'}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gross Pay</p>
              <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(totals.gross)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Deductions</p>
              <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(totals.deductions)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net Pay</p>
              <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(totals.net)}</p>
            </Card>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                {period.status === 'finalized' && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const employee = employeeById.get(line.employeeId)
                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">{employee?.employeeNumber}</p>
                    </TableCell>
                    <TableCell>{formatCurrency(line.grossPay)}</TableCell>
                    <TableCell>{formatCurrency(line.totalDeductions)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(line.netPay)}</TableCell>
                    {period.status === 'finalized' && (
                      <TableCell>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/payslips/${line.id}`)}>
                          View Payslip
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </>
      )}

      <Dialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <DialogContent>
          <DialogTitle>Finalize {period.label}?</DialogTitle>
          <DialogDescription>
            Finalizing locks this payroll period from further changes, makes payslips available to employees, and deducts
            this period&apos;s installment from every active loan balance. This cannot be undone.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmFinalize(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFinalize}>
              Finalize Payroll
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
