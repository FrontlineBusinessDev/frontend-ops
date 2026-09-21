import { Calculator, Info } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { buildComputationBreakdown } from '@/lib/payroll/computationBreakdown'
import type { AllocationDetail } from '@/lib/payroll/computationBreakdown'
import { PAY_RATE_TYPE_LABEL, formatBaseRate } from '@/lib/payroll/payRate'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type {
  AttendanceRecord,
  BonusIncentive,
  Branch,
  CompensationType,
  DeductionConfig,
  Employee,
  LoanRecord,
  OvertimeRecord,
  PayrollGroup,
  PayrollLine,
  PayrollPeriod,
  StatutoryConfig,
  ThirteenthMonthLine,
} from '@/types/domain'

const FREQUENCY_LABEL: Record<PayrollGroup['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semi_monthly: 'Semi-monthly',
  monthly: 'Monthly',
  custom: 'Custom',
}

const ALLOCATION_METHOD_LABEL: Record<AllocationDetail['allocationMethod'], string> = {
  equal_split: 'Equal Split',
  specific_cutoff: 'Specific Cutoff',
  custom: 'Custom Allocation',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
}

function LineRow({
  label,
  amount,
  formula,
  emphasis,
  tone,
  badge,
}: {
  label: string
  amount: number
  formula?: string
  emphasis?: boolean
  tone?: 'muted'
  badge?: string
}) {
  return (
    <div className={`flex items-start justify-between gap-4 py-2 ${emphasis ? '' : 'border-b border-border last:border-0'}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm ${emphasis ? 'font-semibold text-foreground' : tone === 'muted' ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
            {label}
          </p>
          {badge && (
            <Badge tone="success" className="shrink-0">
              {badge}
            </Badge>
          )}
        </div>
        {formula && <p className="mt-0.5 text-xs text-muted-foreground">{formula}</p>}
      </div>
      <span className={`shrink-0 tabular-nums ${emphasis ? 'text-base font-semibold' : 'text-sm font-medium'}`}>{formatCurrency(amount)}</span>
    </div>
  )
}

function AllocationBadge({ allocation }: { allocation: AllocationDetail }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
      <Badge tone="neutral">Monthly: {formatCurrency(allocation.monthlyAmount)}</Badge>
      <Badge tone="brand">{ALLOCATION_METHOD_LABEL[allocation.allocationMethod]}</Badge>
      <span className="text-muted-foreground">
        cutoff {allocation.cutoffIndex} of {allocation.periodsPerCycle}
      </span>
    </div>
  )
}

export function EmployeeComputationDrawer({
  employee,
  line,
  period,
  payrollGroup,
  compensationType,
  branch,
  deductionConfigs,
  loans,
  overtimeRecords,
  attendanceRecords,
  statutoryConfig,
  approvedBonuses,
  thirteenthMonthLine,
  trigger,
}: {
  employee: Employee
  line: PayrollLine
  period: PayrollPeriod
  payrollGroup: PayrollGroup | undefined
  compensationType: CompensationType | undefined
  branch: Branch | undefined
  deductionConfigs: DeductionConfig[]
  loans: LoanRecord[]
  overtimeRecords: OvertimeRecord[]
  attendanceRecords: AttendanceRecord[]
  statutoryConfig: StatutoryConfig | undefined
  approvedBonuses?: BonusIncentive[]
  thirteenthMonthLine?: ThirteenthMonthLine
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const breakdown = open
    ? buildComputationBreakdown({
        employee,
        line,
        period,
        payrollGroup,
        deductionConfigs,
        loans,
        overtimeRecords,
        attendanceRecords,
        statutoryConfig,
        approvedBonuses,
        thirteenthMonthLine,
      })
    : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogTitle>
          {employee.personal.firstName} {employee.personal.lastName} — Computation Breakdown
        </DialogTitle>
        <DialogDescription>
          Full visibility into how this payroll amount was calculated, for review before approval or finalization.
        </DialogDescription>

        {breakdown && (
          <div className="mt-4 max-h-[75vh] space-y-5 overflow-y-auto pr-1">
            {/* Employee Summary */}
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Employee ID</p>
                  <p className="mt-0.5 font-medium">{employee.employeeNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Position</p>
                  <p className="mt-0.5 font-medium">{employee.employment.position}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Department</p>
                  <p className="mt-0.5 font-medium">{employee.employment.department}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Branch</p>
                  <p className="mt-0.5 font-medium">{branch?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payroll Group</p>
                  <p className="mt-0.5 font-medium">{payrollGroup?.name ?? 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Compensation Type</p>
                  <p className="mt-0.5 font-medium">{compensationType?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payroll Frequency</p>
                  <p className="mt-0.5 font-medium">{payrollGroup ? FREQUENCY_LABEL[payrollGroup.frequency] : '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pay Rate Type</p>
                  <p className="mt-0.5 font-medium">{PAY_RATE_TYPE_LABEL[employee.compensation.payType]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pay Date</p>
                  <p className="mt-0.5 font-medium">{formatDate(period.payDate)}</p>
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-muted-foreground">Payroll Period / Cutoff</p>
                  <p className="mt-0.5 font-medium">
                    {period.label} ({formatDate(period.startDate)} – {formatDate(period.endDate)})
                  </p>
                </div>
              </div>
            </Card>

            {/* Work/Input Basis — only the fields relevant to this employee's Pay Rate Type */}
            <div>
              <SectionTitle>Base Compensation & Work Basis</SectionTitle>
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Base Compensation</p>
                    <p className="mt-0.5 font-medium">{formatBaseRate(employee.compensation.payType, employee.compensation.basicPay, employee.compensation.outputUnit)}</p>
                  </div>
                  {breakdown?.basicPayResult.basis && (
                    <div>
                      <p className="text-muted-foreground capitalize">{breakdown.basicPayResult.basis.unit}</p>
                      <p className="mt-0.5 font-medium">
                        {breakdown.basicPayResult.basis.quantity} {breakdown.basicPayResult.basis.unit}
                        {breakdown.basicPayResult.basis.isFallback && (
                          <span className="ml-1 text-[11px] font-normal text-muted-foreground">(assumed — no data recorded)</span>
                        )}
                      </p>
                    </div>
                  )}
                  {(employee.compensation.payType === 'monthly' || employee.compensation.payType === 'semi_monthly') && (
                    <div>
                      <p className="text-muted-foreground">Applicable Payroll Period</p>
                      <p className="mt-0.5 font-medium">{period.label}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <LineRow label={breakdown?.basicPayResult.label ?? 'Basic Pay'} amount={breakdown?.basicPayResult.amount ?? 0} formula={breakdown?.basicPayResult.formula} emphasis />
                </div>
              </Card>
            </div>

            {/* Earnings */}
            <div>
              <SectionTitle>A. Earnings Breakdown</SectionTitle>
              <Card className="p-4">
                {breakdown.earnings.map((e) => {
                  const isBonusEarning = (approvedBonuses ?? []).some((b) => b.name === e.label) || (thirteenthMonthLine && e.label === '13th Month Pay')
                  return <LineRow key={e.label} label={e.label} amount={e.amount} formula={e.formula} badge={isBonusEarning ? 'Bonus' : undefined} />
                })}
                <div className="mt-1 border-t border-border pt-2">
                  <LineRow label="Gross Pay" amount={breakdown.summary.grossPay} emphasis />
                </div>
              </Card>

              {breakdown.overtimePreview.length > 0 && (
                <Card className="mt-3 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge tone="warning" className="gap-1">
                      <Info className="size-3" />
                      Preview
                    </Badge>
                    <p className="text-xs text-muted-foreground">Approved overtime this period — not yet included in computed Gross Pay above.</p>
                  </div>
                  {breakdown.overtimePreview.map((o, i) => (
                    <LineRow key={`${o.label}-${i}`} label={o.label} amount={o.amount} formula={o.formula} tone="muted" />
                  ))}
                </Card>
              )}
            </div>

            {/* Deductions */}
            <div>
              <SectionTitle>B. Deductions Breakdown</SectionTitle>
              <Card className="divide-y divide-border p-4">
                {breakdown.deductions.map((d, i) => (
                  <div key={`${d.label}-${i}`} className={i > 0 ? 'pt-3' : ''}>
                    <LineRow label={d.label} amount={d.currentPeriodAmount} formula={d.formula} />
                    {d.allocation && <AllocationBadge allocation={d.allocation} />}
                    {d.remainingBalance !== undefined && (
                      <p className="mt-1 text-xs text-muted-foreground">Remaining balance after this payroll (est.): {formatCurrency(d.remainingBalance)}</p>
                    )}
                  </div>
                ))}
                <div className="mt-1 border-t border-border pt-2">
                  <LineRow label="Total Deductions" amount={breakdown.summary.totalDeductions} emphasis />
                </div>
              </Card>
            </div>

            {/* Monthly Deduction Allocation Details (illustrative) */}
            {breakdown.illustrativeDeductions.length > 0 && (
              <div>
                <SectionTitle>Recurring Company Deductions — Monthly Allocation Preview</SectionTitle>
                <Card className="divide-y divide-border p-4">
                  <div className="flex items-center gap-2 pb-2">
                    <Badge tone="warning" className="gap-1">
                      <Info className="size-3" />
                      Preview only
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Configured in Payroll Settings → Deductions. Not yet deducted from Net Pay by the payroll engine.
                    </p>
                  </div>
                  {breakdown.illustrativeDeductions.map((d) => (
                    <div key={d.label} className="pt-3">
                      <LineRow label={d.label} amount={d.currentPeriodAmount} formula={d.formula} tone="muted" />
                      {d.allocation && <AllocationBadge allocation={d.allocation} />}
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Computation Summary */}
            <div>
              <SectionTitle>Computation Summary</SectionTitle>
              <Card className="p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-foreground">Earnings</p>
                    <LineRow label="Gross Pay" amount={breakdown.summary.grossPay} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-foreground">Deductions</p>
                    <LineRow label="Total Statutory Deductions" amount={breakdown.summary.totalStatutory} />
                    <LineRow label="Withholding Tax" amount={breakdown.summary.withholdingTax} />
                    <LineRow label="Loans" amount={breakdown.summary.totalLoans} />
                    <LineRow label="Other Deductions" amount={breakdown.summary.otherDeductions} />
                    <div className="mt-1 border-t border-border pt-2">
                      <LineRow label="Total Deductions" amount={breakdown.summary.totalDeductions} emphasis />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="flex items-center justify-between bg-primary/10 p-5">
              <div className="flex items-center gap-2">
                <Calculator className="size-4 text-primary" />
                <span className="font-display text-sm font-semibold tracking-tight text-primary">
                  Net Pay = Gross Pay − Total Deductions
                </span>
              </div>
              <span className="font-display text-xl font-semibold text-primary">{formatCurrency(breakdown.summary.netPay)}</span>
            </Card>
          </div>
        )}

        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
