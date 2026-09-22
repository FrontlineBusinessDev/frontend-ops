import { CalendarDays, Heart, Info, TrendingDown, TrendingUp, Trophy, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils/cn'
import { formatAddress, formatCurrency, formatDate } from '@/lib/utils/format'
import type { Company, DeductionConfig, Employee, LoanRecord, PayrollGroup, PayrollLine, PayrollPeriod } from '@/types/domain'

const EMPLOYMENT_TYPE_LABEL: Record<Employee['employment']['employmentType'], string> = {
  regular: 'Regular',
  probationary: 'Probationary',
  contractual: 'Contractual',
  part_time: 'Part-time',
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground print:text-foreground/70">{label}</span>
      <span className="text-right font-medium text-foreground">{value || '—'}</span>
    </div>
  )
}

function SectionBadge({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: 'primary' | 'accent' | 'muted' }) {
  const toneClasses = tone === 'primary' ? 'bg-primary/15 text-primary' : tone === 'accent' ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', toneClasses)}>
        <Icon className="size-3.5" />
      </span>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-foreground/70">{label}</p>
    </div>
  )
}

interface BreakdownRow {
  key: string
  type: string
  description: string
  amount: number
  hint?: string
}

/** Monthly recurring deductions are always actually computed by the payroll engine as an equal semi-monthly (÷2) split — this note documents that split for the employee, without changing the deducted amount itself. */
function allocationHint(monthlyAmount: number, currentPeriodAmount: number, method: DeductionConfig['allocationMethod']) {
  const methodLabel = method === 'specific_cutoff' ? '1 of 2 pay periods' : method === 'custom' ? `${formatCurrency(currentPeriodAmount)} this cutoff` : '÷ 2'
  return `Monthly Amount: ${formatCurrency(monthlyAmount)} | Allocation: ${methodLabel}`
}

function BreakdownCard({
  tone,
  icon: Icon,
  title,
  total,
  rows,
}: {
  tone: 'success' | 'danger'
  icon: LucideIcon
  title: string
  total: number
  rows: BreakdownRow[]
}) {
  const toneClasses = {
    success: { border: 'border-success/25', badge: 'bg-success/15 text-success', bar: 'bg-success/10 text-success', text: 'text-success' },
    danger: { border: 'border-danger/25', badge: 'bg-danger/15 text-danger', bar: 'bg-danger/10 text-danger', text: 'text-danger' },
  }[tone]

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-card print:border-black/30', toneClasses.border)}>
      <div className={cn('flex items-center justify-between gap-3 border-b px-4 py-3', toneClasses.border)}>
        <div className="flex items-center gap-2.5">
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', toneClasses.badge)}>
            <Icon className="size-4" />
          </span>
          <p className="font-display text-sm font-semibold tracking-tight">{title}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground print:text-foreground/60">Total {title}</p>
          <p className={cn('font-display text-sm font-semibold', toneClasses.text)}>{formatCurrency(total)}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground print:text-foreground/60">
            <th className="px-4 pt-3 pb-1.5 text-left font-semibold">Type</th>
            <th className="px-2 pt-3 pb-1.5 text-left font-semibold">Description</th>
            <th className="px-4 pt-3 pb-1.5 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-3 text-center text-xs text-muted-foreground">
                No items this period.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className="border-t border-border/60 align-top print:border-black/10">
                <td className="px-4 py-2 text-muted-foreground print:text-foreground/80">{row.type}</td>
                <td className="px-2 py-2">
                  <p>{row.description}</p>
                  {row.hint && <p className="mt-0.5 text-[10px] text-muted-foreground print:text-foreground/60">{row.hint}</p>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className={cn('flex items-center justify-between px-4 py-2.5 text-sm font-semibold', toneClasses.bar)}>
        <span>Total {title}</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

export function PayslipCard({
  company,
  employee,
  period,
  line,
  deductionConfigs = [],
  loans = [],
}: {
  company?: Company
  employee: Employee
  period: PayrollPeriod | undefined
  /** Accepted for API compatibility with callers that already look up the employee's Payroll Group — this layout doesn't display it. */
  payrollGroup?: PayrollGroup
  line: PayrollLine
  deductionConfigs?: DeductionConfig[]
  loans?: LoanRecord[]
}) {
  const configByName = new Map(deductionConfigs.map((c) => [c.name, c]))

  const allowanceLabels = new Set(employee.compensation.allowances.map((a) => a.label))
  const earningsRows: BreakdownRow[] = line.earnings.map((e, idx) => {
    if (idx === 0) {
      return { key: `${e.label}-${idx}`, type: 'Basic Pay', description: `Base compensation for ${period?.label ?? 'this period'}`, amount: e.amount }
    }
    if (allowanceLabels.has(e.label)) {
      return { key: `${e.label}-${idx}`, type: 'Allowance', description: e.label, amount: e.amount }
    }
    return { key: `${e.label}-${idx}`, type: 'Bonus', description: e.label, amount: e.amount }
  })

  const deductionRows: BreakdownRow[] = [
    ...line.loanDeductions.map((d, idx): BreakdownRow => {
      const loan = loans.find((l) => l.employeeId === employee.id && l.label === d.label)
      return {
        key: `loan-${idx}`,
        type: 'Loan',
        description: d.label,
        amount: d.amount,
        hint: loan ? allocationHint(loan.monthlyDeduction, d.amount, 'equal_split') : undefined,
      }
    }),
    ...line.otherDeductions.map((d, idx): BreakdownRow => ({ key: `other-${idx}`, type: 'Other Deduction', description: d.label, amount: d.amount })),
    {
      key: 'sss',
      type: 'Statutory Contribution',
      description: 'SSS — Employee Share',
      amount: line.sssEmployeeShare,
      hint: allocationHint(line.sssEmployeeShare * 2, line.sssEmployeeShare, configByName.get('SSS Contribution')?.allocationMethod),
    },
    {
      key: 'philhealth',
      type: 'Statutory Contribution',
      description: 'PhilHealth — Employee Share',
      amount: line.philhealthEmployeeShare,
      hint: allocationHint(line.philhealthEmployeeShare * 2, line.philhealthEmployeeShare, configByName.get('PhilHealth Contribution')?.allocationMethod),
    },
    {
      key: 'pagibig',
      type: 'Statutory Contribution',
      description: 'Pag-IBIG — Employee Share',
      amount: line.pagibigEmployeeShare,
      hint: allocationHint(line.pagibigEmployeeShare * 2, line.pagibigEmployeeShare, configByName.get('Pag-IBIG Contribution')?.allocationMethod),
    },
    { key: 'tax', type: 'Withholding Tax', description: 'Monthly Tax', amount: line.withholdingTax },
  ]

  return (
    <Card className="mx-auto max-w-4xl overflow-hidden p-0 print:m-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      {/* 3-column header: company / employee / pay period */}
      <div className="grid grid-cols-1 gap-6 border-b border-border p-6 sm:grid-cols-3 print:border-black/30">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={company?.name ?? 'Company'} src={company?.logoUrl} size="lg" className="shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold tracking-tight">{company?.name}</p>
            {company?.registeredAddress && (
              <p className="mt-1 break-words text-[11px] leading-snug text-muted-foreground print:text-foreground/70">
                {formatAddress(company.registeredAddress)}
              </p>
            )}
            {company?.email && <p className="break-words text-[11px] text-muted-foreground print:text-foreground/70">{company.email}</p>}
            {company?.website && <p className="break-words text-[11px] text-muted-foreground print:text-foreground/70">{company.website}</p>}
          </div>
        </div>

        <div>
          <SectionBadge icon={User} label="Employee Information" tone="primary" />
          <div className="space-y-1">
            <InfoRow label="Name" value={`${employee.personal.firstName} ${employee.personal.lastName}`} />
            <InfoRow label="Employee ID" value={employee.employeeNumber} />
            <InfoRow label="Department" value={employee.employment.department} />
            <InfoRow label="Position" value={employee.employment.position} />
            <InfoRow label="Employment Type" value={EMPLOYMENT_TYPE_LABEL[employee.employment.employmentType]} />
          </div>
        </div>

        <div>
          <SectionBadge icon={CalendarDays} label="Pay Period Information" tone="accent" />
          <div className="space-y-1">
            <InfoRow label="Pay Period" value={period && `${formatDate(period.startDate)} – ${formatDate(period.endDate)}`} />
            <InfoRow label="Pay Date" value={period && formatDate(period.payDate)} />
            <InfoRow label="Payment Method" value="Bank Transfer" />
            <InfoRow label="Bank Account" value="**** 4587" />
          </div>
        </div>
      </div>

      {/* Earnings & deductions cards */}
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <BreakdownCard tone="success" icon={TrendingUp} title="Earnings" total={line.grossPay} rows={earningsRows} />
        <BreakdownCard tone="danger" icon={TrendingDown} title="Deductions" total={line.totalDeductions} rows={deductionRows} />
      </div>

      {/* Net pay banner */}
      <div className="px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary/10 px-5 py-4 print:rounded-none print:border-2 print:border-primary">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Trophy className="size-5" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold tracking-tight text-primary">Net Pay</p>
              <p className="text-xs text-muted-foreground print:text-foreground/70">This is your take-home pay for the period.</p>
            </div>
          </div>
          <p className="font-display text-2xl font-bold tracking-tight text-primary">{formatCurrency(line.netPay)}</p>
        </div>
      </div>

      {/* Footer: additional info + appreciation note */}
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-4">
          <SectionBadge icon={Info} label="Additional Information" tone="muted" />
          <div className="space-y-1">
            <InfoRow label="Tax Filing Status" value="Single" />
            <InfoRow label="Withholding Exemption" value="2" />
            <InfoRow label="Remarks" value="—" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-muted/40 p-4 print:bg-transparent">
          <SectionBadge icon={Heart} label="Note & Appreciation" tone="muted" />
          <p className="text-xs leading-relaxed text-muted-foreground print:text-foreground/70">
            Thank you for being a valued member of the FBS team! Together, we build a better tomorrow.
          </p>
        </div>
      </div>

      <p className="pb-6 text-center text-[10px] uppercase tracking-wide text-muted-foreground/70 print:text-foreground/50">
        This is a system-generated document and does not require a signature.
      </p>
    </Card>
  )
}
