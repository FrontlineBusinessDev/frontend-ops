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
import { WorkLogsSummaryCard } from '@/features/payroll/components/WorkLogsSummaryCard'
import { BulkEmailToolbar, RowCheckbox, SelectAllCheckbox } from '@/features/payslips/components/email/BulkEmailPayslips'
import { EmailStatusBadge } from '@/features/payslips/components/email/EmailStatusBadge'
import { PayslipEmailActions } from '@/features/payslips/components/email/PayslipEmailActions'
import { PayslipCard } from '@/features/payslips/components/PayslipCard'
import { usePayslipEmails } from '@/features/payslips/hooks/usePayslipEmails'
import { usePayslipSelection } from '@/features/payslips/hooks/usePayslipSelection'
import { usePayrollLines, usePayrollPeriods } from '@/features/payroll/hooks/usePayroll'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { bonusAppliesToEmployee, includedInRegularPayroll } from '@/lib/payroll/bonusMatching'
import { findEmployeePayrollGroup } from '@/lib/payroll/groupAssignment'
import { PAY_RATE_TYPE_LABEL, formatBaseRateShort } from '@/lib/payroll/payRate'
import { buildPayslipEmail } from '@/lib/payroll/payslipEmail'
import { basicPayFor } from '@/lib/payroll/rateBasis'
import { getAttendanceRecords } from '@/lib/services/attendanceService'
import { getBonuses } from '@/lib/services/bonusService'
import { getCompensationApprovals } from '@/lib/services/compensationApprovalService'
import { getLoans } from '@/lib/services/loanService'
import { getOvertimeRecords } from '@/lib/services/overtimeService'
import { approvePayroll, finalizePayroll, getStatutoryConfig, runPayroll } from '@/lib/services/payrollService'
import { getDeductionConfigs } from '@/lib/services/payrollSettingsService'
import { getThirteenthMonthLines, getThirteenthMonthRuns } from '@/lib/services/thirteenthMonthService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type {
  AttendanceRecord,
  BonusIncentive,
  CompensationApproval,
  DeductionConfig,
  LoanRecord,
  OvertimeRecord,
  StatutoryConfig,
  ThirteenthMonthLine,
} from '@/types/domain'

export function PayrollPeriodDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useSession()
  const { notify } = useToast()
  const { periods, refetch: refetchPeriods } = usePayrollPeriods()
  const { lines, isLoading: isLoadingLines, refetch: refetchLines } = usePayrollLines(id)
  const { employees } = useEmployees()
  const { groups, compensationTypes } = usePayrollGroups()
  const { branches, company } = useTenant()
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
  const [compensationApprovals, setCompensationApprovals] = useState<CompensationApproval[]>([])

  const period = periods.find((p) => p.id === id)
  const periodLabel = period?.label
  const periodStatus = period?.status

  // Re-read after each status change — running payroll locks approved entries to this period.
  useEffect(() => {
    getCompensationApprovals(user).then(setCompensationApprovals)
  }, [user, periodStatus])

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
  const emails = usePayslipEmails('payroll', id)
  const selection = usePayslipSelection(lines.map((l) => l.employeeId))

  if (!period) return <Skeleton className="h-96" />

  // Payslips are only issued (and so only emailed) once the run is finalized; previews are always available.
  const canEmail = period.status === 'finalized' && (canRun || canFinalize)
  const emailDisabledReason = period.status === 'finalized' ? 'You do not have permission to send payslips.' : 'Payslips can be emailed once this payroll run is finalized.'
  const employeeName = (employeeId: string) => {
    const e = employeeById.get(employeeId)
    return e ? `${e.personal.firstName} ${e.personal.lastName}` : 'Unknown'
  }
  const emailFor = (employeeId: string) => {
    const employee = employeeById.get(employeeId)
    const line = lines.find((l) => l.employeeId === employeeId)
    return employee && line ? buildPayslipEmail({
          kind: 'payroll',
          company,
          employee,
          label: period.label,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          payDate: period.payDate,
          ctaPath: `/ess/payslips/${line.id}`,
        }) : undefined
  }
  const sendEmails = (employeeIds: string[]) =>
    emails.send(
      employeeIds.flatMap((employeeId) => {
        const email = emailFor(employeeId)
        return email ? [{ employeeId, employeeName: employeeName(employeeId), subject: email.subject }] : []
      }),
    )

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

      <WorkLogsSummaryCard period={period} />

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

          <BulkEmailToolbar
            candidates={lines.map((l) => ({
              employeeId: l.employeeId,
              employeeName: employeeName(l.employeeId),
              hasEmail: !!employeeById.get(l.employeeId)?.personal.personalEmail,
              status: emails.statusFor(l.employeeId),
            }))}
            selectedIds={selection.selected}
            canSend={canEmail}
            disabledReason={emailDisabledReason}
            isSending={emails.isSending}
            onSend={sendEmails}
            onSent={selection.clear}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <SelectAllCheckbox state={selection.headerState} onChange={selection.toggleAll} />
                </TableHead>
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
                <TableHead>Email Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const employee = employeeById.get(line.employeeId)
                const employeeGroup = employee ? findEmployeePayrollGroup(groups, employee.id) : undefined
                const compensationType = compensationTypes.find((c) => c.id === employeeGroup?.compensationTypeId)
                const branch = branches.find((b) => b.id === employee?.branchId)
                const basicPayResult = employee ? basicPayFor(employee, period, attendanceRecords, compensationApprovals, line.periodsPerMonth ?? 2) : undefined
                const employeeApprovedBonuses = employee
                  ? bonuses.filter(
                      (b) =>
                        b.status === 'approved' &&
                        includedInRegularPayroll(b) &&
                        b.periodLabel.trim().toLowerCase() === period.label.trim().toLowerCase() &&
                        bonusAppliesToEmployee(b, employee),
                    )
                  : []
                const employeeThirteenthMonthLine = employee ? thirteenthMonthLines.find((l) => l.employeeId === employee.id) : undefined
                const email = emailFor(line.employeeId)
                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <RowCheckbox checked={selection.selected.has(line.employeeId)} onChange={(c) => selection.toggle(line.employeeId, c)} label={employeeName(line.employeeId)} />
                    </TableCell>
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
                    <TableCell>
                      <EmailStatusBadge status={emails.statusFor(line.employeeId)} record={emails.records[line.employeeId]} />
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
                            compensationApprovals={compensationApprovals}
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
                        {employee && email && (
                          <PayslipEmailActions
                            compact
                            email={email}
                            status={emails.statusFor(employee.id)}
                            record={emails.records[employee.id]}
                            canSend={canEmail}
                            disabledReason={emailDisabledReason}
                            onSend={() => sendEmails([employee.id])}
                            renderPayslip={() => (
                              <PayslipCard
                                company={company}
                                employee={employee}
                                period={period}
                                payrollGroup={employeeGroup}
                                line={line}
                                deductionConfigs={deductionConfigs}
                                loans={loans.filter((l) => l.employeeId === employee.id)}
                              />
                            )}
                          />
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
