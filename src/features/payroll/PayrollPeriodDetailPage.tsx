import { ArrowLeft, Calculator, Lock, PlayCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { usePayrollGroups } from '@/features/company-settings/hooks/usePayrollGroups'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { EmployeeComputationDrawer } from '@/features/payroll/components/EmployeeComputationDrawer'
import { usePayrollLines, usePayrollPeriods } from '@/features/payroll/hooks/usePayroll'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { bonusAppliesToEmployee } from '@/lib/payroll/bonusMatching'
import { findEmployeePayrollGroup } from '@/lib/payroll/groupAssignment'
import { PAY_RATE_TYPE_LABEL, formatBaseRateShort } from '@/lib/payroll/payRate'
import { basicPayFor } from '@/lib/payroll/rateBasis'
import { getAttendanceRecords } from '@/lib/services/attendanceService'
import { getBonuses } from '@/lib/services/bonusService'
import { getLoans } from '@/lib/services/loanService'
import { getOvertimeRecords } from '@/lib/services/overtimeService'
import { approvePayroll, finalizePayroll, getStatutoryConfig, runPayroll } from '@/lib/services/payrollService'
import { getDeductionConfigs } from '@/lib/services/payrollSettingsService'
import { getThirteenthMonthLines, getThirteenthMonthRuns } from '@/lib/services/thirteenthMonthService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { AttendanceRecord, BonusIncentive, DeductionConfig, LoanRecord, OvertimeRecord, StatutoryConfig, ThirteenthMonthLine } from '@/types/domain'

export function PayrollPeriodDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useSession()
  const { notify } = useToast()
  const { periods, refetch: refetchPeriods } = usePayrollPeriods()
  const { lines, isLoading: isLoadingLines, refetch: refetchLines } = usePayrollLines(id)
  const { employees } = useEmployees()
  const { groups, compensationTypes } = usePayrollGroups()
  const { branches } = useTenant()
  const canRun = usePermission('payroll.run')
  const canApprove = usePermission('payroll.approve')
  const canFinalize = usePermission('payroll.finalize')
  const [busy, setBusy] = useState(false)
  const [confirmFinalize, setConfirmFinalize] = useState(false)
  const [deductionConfigs, setDeductionConfigs] = useState<DeductionConfig[]>([])
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [statutoryConfig, setStatutoryConfig] = useState<StatutoryConfig | undefined>(undefined)
  const [bonuses, setBonuses] = useState<BonusIncentive[]>([])
  const [thirteenthMonthLines, setThirteenthMonthLines] = useState<ThirteenthMonthLine[]>([])

  const period = periods.find((p) => p.id === id)
  const periodLabel = period?.label

  useEffect(() => {
    getDeductionConfigs(user).then(setDeductionConfigs)
    getLoans(user).then(setLoans)
    getOvertimeRecords(user).then(setOvertimeRecords)
    getAttendanceRecords(user).then(setAttendanceRecords)
    getStatutoryConfig(user).then(setStatutoryConfig)
    getBonuses(user).then(setBonuses)
    getThirteenthMonthRuns(user).then((runs) => {
      const finalizedRun = runs.find((r) => r.status === 'finalized' && r.payoutPeriodLabel.trim().toLowerCase() === (periodLabel ?? '').trim().toLowerCase())
      if (finalizedRun) getThirteenthMonthLines(user, finalizedRun.id).then(setThirteenthMonthLines)
      else setThirteenthMonthLines([])
    })
  }, [user, periodLabel])
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  const payrollGroup = period?.payrollGroupId ? groups.find((g) => g.id === period.payrollGroupId) : undefined

  if (!period) return <Skeleton className="h-96" />

  async function handleRun() {
    if (!id) return
    setBusy(true)
    const generatedLines = await runPayroll(user, id)
    setBusy(false)
    notify({ title: 'Payroll calculated', description: `${generatedLines.length} employee lines generated.`, tone: 'success' })
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
            {payrollGroup ? <Badge tone="brand">{payrollGroup.name}</Badge> : <Badge tone="neutral">All Employees</Badge>}
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
                <TableHead>Position</TableHead>
                <TableHead>Payroll Group</TableHead>
                <TableHead>Pay Rate</TableHead>
                <TableHead>Rate Type</TableHead>
                <TableHead>Work/Input Basis</TableHead>
                <TableHead>Basic Pay</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const employee = employeeById.get(line.employeeId)
                const employeeGroup = employee ? findEmployeePayrollGroup(groups, employee.id) : undefined
                const compensationType = compensationTypes.find((c) => c.id === employeeGroup?.compensationTypeId)
                const branch = branches.find((b) => b.id === employee?.branchId)
                const basicPayResult = employee ? basicPayFor(employee, period, attendanceRecords) : undefined
                const employeeApprovedBonuses = employee
                  ? bonuses.filter(
                      (b) => b.status === 'approved' && b.periodLabel.trim().toLowerCase() === period.label.trim().toLowerCase() && bonusAppliesToEmployee(b, employee),
                    )
                  : []
                const employeeThirteenthMonthLine = employee ? thirteenthMonthLines.find((l) => l.employeeId === employee.id) : undefined
                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown'}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{employee?.employment.position}</TableCell>
                    <TableCell className="text-muted-foreground">{employeeGroup?.name ?? 'Unassigned'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee ? formatBaseRateShort(employee.compensation.payType, employee.compensation.basicPay, employee.compensation.outputUnit) : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{employee ? PAY_RATE_TYPE_LABEL[employee.compensation.payType] : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {basicPayResult?.basis ? `${basicPayResult.basis.quantity} ${basicPayResult.basis.unit}` : '1 payroll period'}
                    </TableCell>
                    <TableCell>{formatCurrency(basicPayResult?.amount ?? line.earnings[0]?.amount ?? 0)}</TableCell>
                    <TableCell>{formatCurrency(line.grossPay)}</TableCell>
                    <TableCell>{formatCurrency(line.totalDeductions)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(line.netPay)}</TableCell>
                    <TableCell>
                      <StatusBadge status={period.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {employee && (
                          <EmployeeComputationDrawer
                            employee={employee}
                            line={line}
                            period={period}
                            payrollGroup={employeeGroup}
                            compensationType={compensationType}
                            branch={branch}
                            deductionConfigs={deductionConfigs}
                            loans={loans.filter((l) => l.employeeId === employee.id)}
                            overtimeRecords={overtimeRecords}
                            attendanceRecords={attendanceRecords}
                            statutoryConfig={statutoryConfig}
                            approvedBonuses={employeeApprovedBonuses}
                            thirteenthMonthLine={employeeThirteenthMonthLine}
                            trigger={
                              <Button size="sm" variant="ghost" icon={<Calculator className="size-3.5" />}>
                                View Computation
                              </Button>
                            }
                          />
                        )}
                        {period.status === 'finalized' && (
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/payslips/${line.id}`)}>
                            View Payslip
                          </Button>
                        )}
                      </div>
                    </TableCell>
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
