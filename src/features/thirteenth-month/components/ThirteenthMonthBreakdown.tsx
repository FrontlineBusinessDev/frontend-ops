import { Calculator, TrendingDown, TrendingUp } from 'lucide-react'
import { BreakdownCard, type BreakdownRow } from '@/features/payslips/components/PayslipCard'
import { useSession } from '@/hooks/useSession'
import { basicEarningsByMonth, coverageFor, thirteenthMonthDeductionsFor } from '@/lib/services/thirteenthMonthService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Employee, ThirteenthMonthLine, ThirteenthMonthRun } from '@/types/domain'

function listDates(dates: string[]): string {
  const shown = dates.slice(0, 6).map((d) => formatDate(d, { year: undefined, month: 'short', day: 'numeric' }))
  return dates.length > 6 ? `${shown.join(', ')} +${dates.length - 6} more` : shown.join(', ')
}

/**
 * Month-by-month view of a 13th Month computation, laid out like the regular payslip:
 * an Earnings panel listing every eligible month's basic salary (pro-rated for the hire /
 * separation month), a separate Deductions panel (undertime, unpaid absences), then the ÷ 12.
 */
export function ThirteenthMonthBreakdown({ employee, line, run }: { employee: Employee; line: ThirteenthMonthLine; run: ThirteenthMonthRun }) {
  const { user } = useSession()
  const coverage = coverageFor(run.year)
  const from = line.activeFrom ?? coverage.start
  const to = line.activeTo ?? coverage.end

  const months = basicEarningsByMonth(employee, from, to)
  const deductions = thirteenthMonthDeductionsFor(user, employee, from, to)

  const earningRows: BreakdownRow[] = months.map((m) => ({ key: m.key, type: 'Basic Pay', description: m.label, amount: m.amount, hint: m.detail }))
  const earningsTotal = months.reduce((sum, m) => sum + m.amount, 0)

  const undertimeAmount = line.undertimeDeduction ?? deductions.undertime.amount
  const absenceAmount = line.absenceDeduction ?? deductions.unpaidAbsences.amount
  const deductionRows: BreakdownRow[] = []
  if (undertimeAmount > 0) {
    deductionRows.push({
      key: 'undertime',
      type: 'Undertime',
      description: `${line.undertimeHours ?? deductions.undertime.hours} hr × ${formatCurrency(deductions.hourlyRate)}/hr`,
      amount: undertimeAmount,
      hint: deductions.undertime.dates.length ? listDates(deductions.undertime.dates) : undefined,
    })
  }
  if (absenceAmount > 0) {
    const days = line.unpaidAbsenceDays ?? deductions.unpaidAbsences.days
    deductionRows.push({
      key: 'absences',
      type: 'Unpaid Absence',
      description: `${days} day${days === 1 ? '' : 's'} × ${formatCurrency(deductions.dailyRate)}/day`,
      amount: absenceAmount,
      hint: deductions.unpaidAbsences.dates.length ? listDates(deductions.unpaidAbsences.dates) : undefined,
    })
  }
  const deductionsTotal = undertimeAmount + absenceAmount

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <BreakdownCard tone="success" icon={TrendingUp} title="Earnings" total={earningsTotal} rows={earningRows} emptyLabel="No eligible earnings in this period." />
        <BreakdownCard
          tone="danger"
          icon={TrendingDown}
          title="Deductions"
          total={deductionsTotal}
          rows={deductionRows}
          emptyLabel="No undertime or unpaid absences recorded."
        />
      </div>

      <div className="space-y-2 rounded-2xl border border-border p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total Earnings</span>
          <span className="tabular-nums">{formatCurrency(earningsTotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Less: Total Deductions</span>
          <span className="tabular-nums text-danger">−{formatCurrency(deductionsTotal)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
          <span>Total Basic Salary Earned</span>
          <span className="tabular-nums">{formatCurrency(line.annualBasicEarned)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-primary/10 p-4">
        <div className="flex items-center gap-2">
          <Calculator className="size-4 shrink-0 text-primary" />
          <span className="text-sm font-medium text-primary">{formatCurrency(line.annualBasicEarned)} ÷ 12 = 13th Month Pay</span>
        </div>
        <span className="font-display text-lg font-semibold text-primary">{formatCurrency(line.thirteenthMonthPay)}</span>
      </div>
    </div>
  )
}
