import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { ThirteenthMonthBreakdown } from '@/features/thirteenth-month/components/ThirteenthMonthBreakdown'
import { useThirteenthMonthLines, useThirteenthMonthRuns } from '@/features/thirteenth-month/hooks/useThirteenthMonth'
import { useTenant } from '@/hooks/useTenant'
import { THIRTEENTH_MONTH_TAX_EXEMPT_CEILING } from '@/lib/services/thirteenthMonthService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Company, Employee, ThirteenthMonthLine, ThirteenthMonthRun } from '@/types/domain'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground print:text-foreground/70">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function AmountRow({ label, hint, amount, deduct }: { label: string; hint?: string; amount: number; deduct?: boolean }) {
  return (
    <tr className="border-b border-border/60">
      <td className="py-2.5">
        <span className={deduct ? 'text-muted-foreground' : undefined}>{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </td>
      <td className={deduct ? 'py-2.5 text-right tabular-nums text-danger' : 'py-2.5 text-right tabular-nums'}>
        {deduct ? `−${formatCurrency(amount)}` : formatCurrency(amount)}
      </td>
    </tr>
  )
}

/** Standalone 13th Month Pay payslip — always separate from the regular payroll payslip. */
export function ThirteenthMonthPayslipPage() {
  const { runId, employeeId } = useParams<{ runId: string; employeeId: string }>()
  const { company } = useTenant()
  const { runs, isLoading: runsLoading } = useThirteenthMonthRuns()
  const { lines, isLoading: linesLoading } = useThirteenthMonthLines(runId)
  const { employees, isLoading: employeesLoading } = useEmployees()

  if (runsLoading || linesLoading || employeesLoading) return <Skeleton className="h-96" />

  const run = runs.find((r) => r.id === runId)
  const line = lines.find((l) => l.employeeId === employeeId)
  const employee = employees.find((e) => e.id === employeeId)

  const back = (
    <Link to="/thirteenth-month-pay" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-3.5" />
      Back to 13th Month Pay
    </Link>
  )

  if (!run || !line || !employee) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-sm text-muted-foreground">This 13th Month payslip isn't available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between print:hidden">
        {back}
        <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Print / Download
        </Button>
      </div>

      <ThirteenthMonthPayslipDocument company={company} run={run} line={line} employee={employee} />
    </div>
  )
}

/** The 13th Month payslip itself — shared by the payslip page, its print/PDF, and the email preview. */
export function ThirteenthMonthPayslipDocument({
  company,
  run,
  line,
  employee,
}: {
  company: Company | undefined
  run: ThirteenthMonthRun
  line: ThirteenthMonthLine
  employee: Employee
}) {
  const withholdingTax = line.withholdingTax ?? 0
  const netPay = line.netPay ?? line.thirteenthMonthPay - withholdingTax
  const isDraft = run.status === 'draft'

  return (
    <Card className="mx-auto max-w-3xl overflow-hidden p-0 print:m-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-6 print:border-black/30">
        <div className="flex items-start gap-3">
          <Avatar name={company?.name ?? 'Company'} src={company?.logoUrl} size="lg" className="shrink-0 rounded-xl" />
          <div>
            <p className="font-display text-sm font-semibold tracking-tight">{company?.name}</p>
            <p className="text-xs text-muted-foreground print:text-foreground/70">{company?.email}</p>
          </div>
        </div>
        <div className="text-right">
          <Badge tone="brand">13th Month Pay Payslip</Badge>
          <p className="mt-1.5 text-xs text-muted-foreground print:text-foreground/70">Separate payslip · not part of the regular payroll run</p>
          {isDraft && (
            <Badge tone="warning" className="mt-1.5">
              Draft — not yet issued
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 border-b border-border p-6 sm:grid-cols-2 print:border-black/30">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</p>
          <InfoRow label="Name" value={`${employee.personal.firstName} ${employee.personal.lastName}`} />
          <InfoRow label="Employee ID" value={employee.employeeNumber} />
          <InfoRow label="Department" value={employee.employment.department} />
          <InfoRow
            label="Employment"
            value={
              employee.employment.dateSeparated ? `Separated ${formatDate(employee.employment.dateSeparated)}` : `Hired ${formatDate(employee.employment.dateHired)}`
            }
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">13th Month Pay</p>
          <InfoRow label="Calendar Year" value={String(run.year)} />
          <InfoRow label="Payout" value={run.payoutPeriodLabel} />
          <InfoRow
            label="Active Period Counted"
            value={line.activeFrom && line.activeTo ? `${formatDate(line.activeFrom)} – ${formatDate(line.activeTo)}` : `Jan – Dec ${run.year}`}
          />
          <InfoRow label="Months Credited" value={`${line.monthsCredited} / 12${line.separated ? ' (pro-rated)' : ''}`} />
        </div>
      </div>

      <div className="p-6">
        <ThirteenthMonthBreakdown employee={employee} line={line} run={run} />

        <table className="mt-4 w-full text-sm">
          <tbody>
            <AmountRow
              label="Less: Withholding Tax"
              hint={
                withholdingTax > 0
                  ? `On ${formatCurrency(line.taxableExcess ?? 0)} above the ${formatCurrency(THIRTEENTH_MONTH_TAX_EXEMPT_CEILING)} non-taxable ceiling`
                  : `Non-taxable (within the ${formatCurrency(THIRTEENTH_MONTH_TAX_EXEMPT_CEILING)} ceiling)`
              }
              amount={withholdingTax}
              deduct
            />
          </tbody>
        </table>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-primary/10 px-5 py-4 print:rounded-none print:border-2 print:border-primary">
          <div>
            <p className="font-display text-sm font-semibold text-primary">Net 13th Month Pay</p>
            <p className="text-xs text-muted-foreground print:text-foreground/70">No SSS, PhilHealth or Pag-IBIG deductions apply to 13th Month Pay.</p>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">{formatCurrency(netPay)}</p>
        </div>
      </div>

      <p className="pb-6 text-center text-[10px] uppercase tracking-wide text-muted-foreground/70 print:text-foreground/50">
        This is a system-generated document and does not require a signature.
      </p>
    </Card>
  )
}
