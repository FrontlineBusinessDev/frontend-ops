import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { ThirteenthMonthBreakdown } from '@/features/thirteenth-month/components/ThirteenthMonthBreakdown'
import { THIRTEENTH_MONTH_TAX_EXEMPT_CEILING } from '@/lib/services/thirteenthMonthService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Employee, ThirteenthMonthLine, ThirteenthMonthRun } from '@/types/domain'

export function ComputationDrawer({
  employee,
  line,
  run,
  trigger,
}: {
  employee: Employee
  line: ThirteenthMonthLine
  run: ThirteenthMonthRun
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const isProrated = line.monthsCredited < 12
  const firstName = employee.personal.firstName

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogTitle>
          {employee.personal.firstName} {employee.personal.lastName} — 13th Month Pay Computation
        </DialogTitle>
        <DialogDescription>
          Calendar Year {run.year} · Hired {formatDate(employee.employment.dateHired)}
          {employee.employment.dateSeparated && ` · Separated ${formatDate(employee.employment.dateSeparated)}`}
        </DialogDescription>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Active period counted</p>
            <p className="font-medium">
              {line.activeFrom && line.activeTo ? `${formatDate(line.activeFrom)} – ${formatDate(line.activeTo)}` : `Jan – Dec ${run.year}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Months credited</p>
            <div className="flex items-center gap-1.5">
              <p className="font-medium">{line.monthsCredited} / 12</p>
              {isProrated && <Badge tone="warning">{line.separated ? 'Pro-rated — separated' : 'Pro-rated'}</Badge>}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ThirteenthMonthBreakdown employee={employee} line={line} run={run} />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {line.separated
            ? `${firstName} resigned/separated, so only basic pay for the days actually worked counts — the separation month is pro-rated by calendar days, per Philippine Labor Code rules.`
            : isProrated
              ? `${firstName} was employed for part of ${run.year}, so only the months (and partial month) worked count toward this year's 13th Month Pay.`
              : `${firstName} worked the full calendar year, so all 12 months of basic pay count.`}{' '}
          Undertime is charged at the hourly rate and unpaid absences (not covered by an approved paid leave) at the daily rate, based on recorded attendance.
          Non-taxable up to {formatCurrency(THIRTEENTH_MONTH_TAX_EXEMPT_CEILING)}
          {(line.withholdingTax ?? 0) > 0 && `; ${formatCurrency(line.withholdingTax ?? 0)} withheld on the excess`}.
        </p>

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
