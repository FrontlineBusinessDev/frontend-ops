import { Calculator } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>
          {employee.personal.firstName} {employee.personal.lastName} — 13th Month Pay Computation
        </DialogTitle>
        <DialogDescription>
          Calendar Year {run.year} · Hired {formatDate(employee.employment.dateHired)}
        </DialogDescription>

        <div className="mt-4 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Basic Salary Earned ({run.year})</p>
              <p className="font-display text-base font-semibold">{formatCurrency(line.annualBasicEarned)}</p>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <p className="text-sm text-muted-foreground">Months Credited</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">{line.monthsCredited} / 12</p>
                {isProrated && <Badge tone="warning">Prorated — mid-year hire</Badge>}
              </div>
            </div>
          </Card>

          <Card className="flex items-center justify-between bg-primary/10 p-4">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Total Basic Salary Earned {formatCurrency(line.annualBasicEarned)} ÷ 12 = 13th Month Pay
              </span>
            </div>
            <span className="font-display text-lg font-semibold text-primary">{formatCurrency(line.thirteenthMonthPay)}</span>
          </Card>

          <p className="text-xs text-muted-foreground">
            {isProrated
              ? `${employee.personal.firstName} was hired mid-${run.year}, so only ${line.monthsCredited} month(s) of basic pay count toward this year's 13th Month Pay — consistent with Philippine Labor Code proration rules for employees who did not work the full calendar year.`
              : `${employee.personal.firstName} worked the full calendar year, so all 12 months of basic pay count toward this year's 13th Month Pay.`}{' '}
            Non-taxable, per BIR regulations (up to the statutory ₱90,000 combined threshold).
          </p>
        </div>

        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
