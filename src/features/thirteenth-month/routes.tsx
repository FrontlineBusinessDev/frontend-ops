import { Calculator, FileText, Info, Lock, PlayCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { usePayrollGroups } from '@/features/company-settings/hooks/usePayrollGroups'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { BulkEmailToolbar, RowCheckbox, SelectAllCheckbox } from '@/features/payslips/components/email/BulkEmailPayslips'
import { EmailStatusBadge } from '@/features/payslips/components/email/EmailStatusBadge'
import { PayslipEmailActions } from '@/features/payslips/components/email/PayslipEmailActions'
import { usePayslipEmails } from '@/features/payslips/hooks/usePayslipEmails'
import { usePayslipSelection } from '@/features/payslips/hooks/usePayslipSelection'
import { ComputationDrawer } from '@/features/thirteenth-month/components/ComputationDrawer'
import { useThirteenthMonthLines, useThirteenthMonthRuns } from '@/features/thirteenth-month/hooks/useThirteenthMonth'
import { ThirteenthMonthPayslipDocument } from '@/features/thirteenth-month/ThirteenthMonthPayslipPage'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { buildPayslipEmail } from '@/lib/payroll/payslipEmail'
import {
  finalizeThirteenthMonthRun,
  generateThirteenthMonthRun,
  isSeparated,
  previewThirteenthMonthBatch,
  type ThirteenthMonthPreview,
} from '@/lib/services/thirteenthMonthService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Employee, PayrollGroup, ThirteenthMonthSelection, ThirteenthMonthSelectionMode } from '@/types/domain'

const YEAR_OPTIONS = [2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: String(y) }))
const DEFAULT_YEAR = 2026

const MODE_OPTIONS: { value: ThirteenthMonthSelectionMode; label: string }[] = [
  { value: 'all', label: 'All Eligible Employees' },
  { value: 'employees', label: 'Specific Employee(s)' },
  { value: 'payroll_group', label: 'Payroll Group' },
  { value: 'department', label: 'Department' },
  { value: 'separated', label: 'Separated / Resigned Employees' },
]

function fullName(e: Employee) {
  return `${e.personal.firstName} ${e.personal.lastName}`
}

function selectionLabel(selection: ThirteenthMonthSelection | undefined, groups: PayrollGroup[]): string {
  if (!selection || selection.mode === 'all') return 'All Eligible Employees'
  if (selection.mode === 'employees') return `${selection.employeeIds?.length ?? 0} selected employee(s)`
  if (selection.mode === 'payroll_group') return `Payroll Group: ${groups.find((g) => g.id === selection.payrollGroupId)?.name ?? '—'}`
  if (selection.mode === 'separated') return selection.employeeIds?.length ? `Separated: ${selection.employeeIds.length} selected` : 'Separated / Resigned Employees'
  return `Department: ${selection.department ?? '—'}`
}

export function ThirteenthMonthPage() {
  const { user } = useSession()
  const { company } = useTenant()
  const { notify } = useToast()
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { groups } = usePayrollGroups()
  const { runs, isLoading: runsLoading, refetch: refetchRuns } = useThirteenthMonthRuns()
  const canManage = usePermission('thirteenth_month.manage')

  const [year, setYear] = useState(DEFAULT_YEAR)
  const [generationDate, setGenerationDate] = useState(`${DEFAULT_YEAR}-12-15`)
  const [payoutPeriodLabel, setPayoutPeriodLabel] = useState(`December ${DEFAULT_YEAR}`)
  const [mode, setMode] = useState<ThirteenthMonthSelectionMode>('all')
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [payrollGroupId, setPayrollGroupId] = useState<string | undefined>(undefined)
  const [department, setDepartment] = useState<string | undefined>(undefined)
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined)
  const [preview, setPreview] = useState<ThirteenthMonthPreview | null>(null)
  const [busy, setBusy] = useState(false)

  const selection: ThirteenthMonthSelection = useMemo(
    () => ({
      mode,
      employeeIds: mode === 'employees' || mode === 'separated' ? employeeIds : undefined,
      payrollGroupId: mode === 'payroll_group' ? payrollGroupId : undefined,
      department: mode === 'department' ? department : undefined,
    }),
    [mode, employeeIds, payrollGroupId, department],
  )
  const selectionComplete =
    mode === 'all' || mode === 'separated' || (mode === 'employees' && employeeIds.length > 0) || (mode === 'payroll_group' && !!payrollGroupId) || (mode === 'department' && !!department)

  // Live preview of who the selection covers (eligibility depends on year + cutoff date).
  useEffect(() => {
    let cancelled = false
    previewThirteenthMonthBatch(user, { year, generationDate, payoutPeriodLabel, selection }).then((p) => {
      if (!cancelled) setPreview(p)
    })
    return () => {
      cancelled = true
    }
  }, [user, year, generationDate, payoutPeriodLabel, selection, runs])

  const eligible = useMemo(() => preview?.eligible ?? [], [preview])
  // Regular batches cover active employees only; separated/resigned employees have their own batch.
  const activeEligible = useMemo(() => eligible.filter((e) => !isSeparated(e)), [eligible])
  const separatedEligible = useMemo(() => eligible.filter(isSeparated), [eligible])
  const departmentOptions = useMemo(
    () => [...new Set(activeEligible.map((e) => e.employment.department))].sort().map((d) => ({ value: d, label: d })),
    [activeEligible],
  )
  const groupOptions = groups.map((g) => ({ value: g.id, label: `${g.name} (${g.employeeIds.length})` }))

  const runsForYear = useMemo(() => runs.filter((r) => r.year === year).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [runs, year])
  const activeRun = runsForYear.find((r) => r.id === selectedRunId) ?? runsForYear[0]
  const { lines, isLoading: linesLoading, refetch: refetchLines } = useThirteenthMonthLines(activeRun?.id)
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const emails = usePayslipEmails('thirteenth_month', activeRun?.id)
  const payslipSelection = usePayslipSelection(lines.map((l) => l.employeeId))

  // 13th Month payslips are issued (and so emailed) once the batch is finalized; previews are always available.
  const canEmail = activeRun?.status === 'finalized' && canManage
  const emailDisabledReason = activeRun?.status === 'finalized' ? 'You do not have permission to send payslips.' : 'Payslips can be emailed once this batch is finalized.'
  const emailFor = (employeeId: string) => {
    const employee = employeeById.get(employeeId)
    const line = lines.find((l) => l.employeeId === employeeId)
    if (!employee || !line || !activeRun) return undefined
    return buildPayslipEmail({
      kind: 'thirteenth_month',
      company,
      employee,
      label: activeRun.payoutPeriodLabel,
      periodStart: line.activeFrom ?? `${activeRun.year}-01-01`,
      periodEnd: line.activeTo ?? `${activeRun.year}-12-31`,
      payDate: activeRun.generationDate,
      ctaPath: '/ess/payslips',
    })
  }
  const sendEmails = (employeeIds: string[]) =>
    emails.send(
      employeeIds.flatMap((employeeId) => {
        const email = emailFor(employeeId)
        const employee = employeeById.get(employeeId)
        return email && employee ? [{ employeeId, employeeName: fullName(employee), subject: email.subject }] : []
      }),
    )

  const totals = lines.reduce(
    (acc, l) => ({
      payout: acc.payout + l.thirteenthMonthPay,
      deductions: acc.deductions + (l.undertimeDeduction ?? 0) + (l.absenceDeduction ?? 0),
      separated: acc.separated + (l.separated ? 1 : 0),
    }),
    { payout: 0, deductions: 0, separated: 0 },
  )

  async function handleGenerate() {
    setBusy(true)
    const { run, lines: generated, skippedAlreadyPaid } = await generateThirteenthMonthRun(user, { year, generationDate, payoutPeriodLabel, selection })
    setBusy(false)
    setSelectedRunId(run.id)
    notify({
      title: '13th Month Pay batch generated',
      description: `${generated.length} standalone payslip(s) prepared${skippedAlreadyPaid ? ` · ${skippedAlreadyPaid} already paid this year, skipped` : ''}.`,
      tone: 'success',
    })
    refetchRuns()
    refetchLines()
  }

  async function handleFinalize() {
    if (!activeRun) return
    await finalizeThirteenthMonthRun(user, activeRun.id)
    notify({ title: '13th Month Pay finalized', description: `${lines.length} separate 13th Month payslip(s) issued for "${activeRun.payoutPeriodLabel}".`, tone: 'success' })
    refetchRuns()
  }

  return (
    <div className="space-y-5">
      <PageHeader title="13th Month Pay" description="Philippine-compliant 13th Month Pay batch generation, preview, and approval." />

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <p>
          13th Month Pay is always issued on its own <span className="font-medium text-foreground">separate payslip</span> — it's never merged into a regular payroll run.
          Pay = (Total Basic Salary Earned in the covered months − undertime − unpaid absences) ÷ 12, pro-rated by active days for mid-year hires.
          Resigned/separated employees are generated in their own batch (&ldquo;Separated / Resigned Employees&rdquo;), pro-rated to their last day.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-32">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Year</p>
            <Select
              value={String(year)}
              onValueChange={(v) => {
                const y = Number(v)
                setYear(y)
                setGenerationDate(`${y}-12-15`)
                setPayoutPeriodLabel(`December ${y}`)
                setSelectedRunId(undefined)
              }}
              options={YEAR_OPTIONS}
            />
          </div>
          <div className="w-44">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Cutoff / Generation Date</p>
            <Input type="date" value={generationDate} onChange={(e) => setGenerationDate(e.target.value)} />
          </div>
          <div className="w-52">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Payout Label</p>
            <Input value={payoutPeriodLabel} onChange={(e) => setPayoutPeriodLabel(e.target.value)} placeholder="December 2026" />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 border-t border-border pt-4">
          <div className="w-72">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Generate For</p>
            <Select
              value={mode}
              onValueChange={(v) => {
                setMode(v as ThirteenthMonthSelectionMode)
                setEmployeeIds([])
              }}
              options={MODE_OPTIONS}
            />
          </div>
          {mode === 'employees' && (
            <div className="w-full max-w-md">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Active employees</p>
              <EmployeeCombobox
                multiple
                employees={activeEligible.map((e) => ({ id: e.id, name: fullName(e), employeeNumber: e.employeeNumber, department: e.employment.department }))}
                value={employeeIds}
                onChange={setEmployeeIds}
                placeholder="Select employees…"
              />
            </div>
          )}
          {mode === 'separated' && (
            <div className="w-full max-w-md">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Separated employees (leave empty to include all)</p>
              <EmployeeCombobox
                multiple
                employees={separatedEligible.map((e) => ({
                  id: e.id,
                  name: e.employment.dateSeparated ? `${fullName(e)} (separated ${formatDate(e.employment.dateSeparated)})` : fullName(e),
                  employeeNumber: e.employeeNumber,
                  department: e.employment.department,
                }))}
                value={employeeIds}
                onChange={setEmployeeIds}
                placeholder={`All separated employees (${separatedEligible.length})`}
              />
            </div>
          )}
          {mode === 'payroll_group' && (
            <div className="w-64">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Payroll Group</p>
              <Select value={payrollGroupId} onValueChange={setPayrollGroupId} options={groupOptions} placeholder="Select payroll group" />
            </div>
          )}
          {mode === 'department' && (
            <div className="w-56">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Department</p>
              <Select value={department} onValueChange={setDepartment} options={departmentOptions} placeholder="Select department" />
            </div>
          )}
          {canManage && (
            <Button icon={<PlayCircle className="size-4" />} isLoading={busy} disabled={!selectionComplete || !preview?.included.length} onClick={handleGenerate}>
              Generate 13th Month Pay
            </Button>
          )}
        </div>

        {preview && (
          <p className="text-xs text-muted-foreground">
            Covers {formatDate(preview.coverage.start)} – {formatDate(preview.coverage.end)} ·{' '}
            {selectionComplete ? (
              <>
                <span className="font-medium text-foreground">{preview.included.length}</span>{' '}
                {mode === 'separated' ? 'separated employee(s) will be included, pro-rated to their last day' : 'active employee(s) will be included'}
                {mode !== 'separated' && separatedEligible.length > 0 && (
                  <> · {separatedEligible.length} resigned/separated employee(s) are generated separately</>
                )}
                {preview.skippedAlreadyPaid.length > 0 && <> · {preview.skippedAlreadyPaid.length} already paid in a finalized batch this year (skipped)</>}
              </>
            ) : (
              'Complete the selection to see who will be included.'
            )}
          </p>
        )}
      </Card>

      {employeesLoading || runsLoading ? (
        <Skeleton className="h-72" />
      ) : !activeRun ? (
        <EmptyState
          title="No 13th Month Pay batch generated yet for this year"
          description={canManage ? 'Choose who to generate for, then click "Generate 13th Month Pay".' : 'Waiting for a payroll admin to generate this batch.'}
        />
      ) : linesLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Employees in Batch</p>
              <p className="mt-1 font-display text-xl font-semibold">{lines.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resigned / Separated</p>
              <p className="mt-1 font-display text-xl font-semibold">{totals.separated}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Undertime & Absence Deductions</p>
              <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(totals.deductions)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total 13th Month Payout</p>
              <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(totals.payout)}</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {runsForYear.length > 1 && (
                <div className="w-full max-w-sm">
                  <Select
                    value={activeRun.id}
                    onValueChange={setSelectedRunId}
                    options={runsForYear.map((r) => ({
                      value: r.id,
                      label: `${selectionLabel(r.selection, groups)} · ${r.status === 'draft' ? 'Draft' : 'Finalized'} · ${r.generationDate}`,
                    }))}
                  />
                </div>
              )}
              <span>
                {selectionLabel(activeRun.selection, groups)} · generated {activeRun.generationDate} ·{' '}
              </span>
              <StatusBadge status={activeRun.status === 'draft' ? 'Ready' : 'Finalized'} />
            </div>
            {canManage && activeRun.status === 'draft' && (
              <Button size="sm" variant="destructive" icon={<Lock className="size-3.5" />} onClick={handleFinalize}>
                Finalize & Issue Payslips
              </Button>
            )}
          </div>

          <BulkEmailToolbar
            candidates={lines.flatMap((l) => {
              const employee = employeeById.get(l.employeeId)
              return employee ? [{ employeeId: l.employeeId, employeeName: fullName(employee), hasEmail: !!employee.personal.personalEmail, status: emails.statusFor(l.employeeId) }] : []
            })}
            selectedIds={payslipSelection.selected}
            canSend={canEmail}
            disabledReason={emailDisabledReason}
            isSending={emails.isSending}
            onSend={sendEmails}
            onSent={payslipSelection.clear}
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <SelectAllCheckbox state={payslipSelection.headerState} onChange={payslipSelection.toggleAll} />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Active Period</TableHead>
                <TableHead className="text-right">Basic Earned</TableHead>
                <TableHead className="text-right">Undertime / Absences</TableHead>
                <TableHead className="text-right">13th Month Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const employee = employeeById.get(line.employeeId)
                if (!employee) return null
                const deductions = (line.undertimeDeduction ?? 0) + (line.absenceDeduction ?? 0)
                const email = emailFor(line.employeeId)
                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <RowCheckbox checked={payslipSelection.selected.has(line.employeeId)} onChange={(c) => payslipSelection.toggle(line.employeeId, c)} label={fullName(employee)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{fullName(employee)}</span>
                        {line.separated && <Badge tone="warning">Separated</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {employee.employeeNumber} · {employee.employment.department}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {line.activeFrom && line.activeTo ? `${formatDate(line.activeFrom)} – ${formatDate(line.activeTo)}` : `Jan – Dec ${activeRun.year}`}
                      <p className="text-xs">{line.monthsCredited} / 12 months</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(line.grossBasicEarned ?? line.annualBasicEarned)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {deductions > 0 ? <span className="text-danger">−{formatCurrency(deductions)}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(line.thirteenthMonthPay)}</TableCell>
                    <TableCell>
                      <StatusBadge status={activeRun.status === 'draft' ? 'Ready' : 'Finalized'} />
                    </TableCell>
                    <TableCell>
                      <EmailStatusBadge status={emails.statusFor(line.employeeId)} record={emails.records[line.employeeId]} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <ComputationDrawer
                          employee={employee}
                          line={line}
                          run={activeRun}
                          trigger={
                            <Button size="sm" variant="ghost" icon={<Calculator className="size-3.5" />}>
                              Computation
                            </Button>
                          }
                        />
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/thirteenth-month-pay/${activeRun.id}/payslips/${employee.id}`}>
                            <FileText className="size-3.5" />
                            Payslip
                          </Link>
                        </Button>
                        {email && (
                          <PayslipEmailActions
                            compact
                            email={email}
                            status={emails.statusFor(employee.id)}
                            record={emails.records[employee.id]}
                            canSend={canEmail}
                            disabledReason={emailDisabledReason}
                            onSend={() => sendEmails([employee.id])}
                            renderPayslip={() => <ThirteenthMonthPayslipDocument company={company} run={activeRun} line={line} employee={employee} />}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
