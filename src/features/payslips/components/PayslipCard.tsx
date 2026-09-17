import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Employee, PayrollLine, PayrollPeriod } from '@/types/domain'

function Row({ label, amount, emphasis }: { label: string; amount: number; emphasis?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${emphasis ? 'font-semibold' : ''}`}>
      <span className={emphasis ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{formatCurrency(amount)}</span>
    </div>
  )
}

export function PayslipCard({ employee, period, line }: { employee: Employee; period: PayrollPeriod | undefined; line: PayrollLine }) {
  const totalStatutory = line.sssEmployeeShare + line.philhealthEmployeeShare + line.pagibigEmployeeShare

  return (
    <Card className="mx-auto max-w-2xl p-8">
      <div className="flex items-start justify-between border-b border-border pb-5">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight">
            {employee.personal.firstName} {employee.personal.lastName}
          </p>
          <p className="text-sm text-muted-foreground">
            {employee.employeeNumber} &middot; {employee.employment.position}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{period?.label}</p>
          <p className="text-xs text-muted-foreground">
            {period && `${formatDate(period.startDate)} – ${formatDate(period.endDate)}`}
          </p>
          <p className="text-xs text-muted-foreground">Pay date {period && formatDate(period.payDate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 py-5">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Earnings</p>
          {line.earnings.map((e) => (
            <Row key={e.label} label={e.label} amount={e.amount} />
          ))}
          <div className="mt-1 border-t border-border pt-1.5">
            <Row label="Gross Pay" amount={line.grossPay} emphasis />
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deductions</p>
          {line.loanDeductions.map((d) => (
            <Row key={d.label} label={d.label} amount={d.amount} />
          ))}
          {line.otherDeductions.map((d) => (
            <Row key={d.label} label={d.label} amount={d.amount} />
          ))}
          <Row label="SSS" amount={line.sssEmployeeShare} />
          <Row label="PhilHealth" amount={line.philhealthEmployeeShare} />
          <Row label="Pag-IBIG" amount={line.pagibigEmployeeShare} />
          <Row label="Withholding Tax" amount={line.withholdingTax} />
          <div className="mt-1 border-t border-border pt-1.5">
            <Row label="Total Deductions" amount={line.totalDeductions} emphasis />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-primary/10 px-5 py-4">
        <span className="font-display text-sm font-semibold tracking-tight text-primary">Net Pay</span>
        <span className="font-display text-xl font-semibold text-primary">{formatCurrency(line.netPay)}</span>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Statutory contributions withheld this period: {formatCurrency(totalStatutory)}. Employer counterpart contributions
        (SSS {formatCurrency(line.sssEmployerShare)}, PhilHealth {formatCurrency(line.philhealthEmployerShare)}, Pag-IBIG{' '}
        {formatCurrency(line.pagibigEmployerShare)}) are remitted separately and do not affect net pay.
      </p>
    </Card>
  )
}
