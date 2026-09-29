import { ArrowLeft, Gift, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useBonuses } from '@/features/bonuses/hooks/useBonuses'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { bonusAppliesToEmployee, bonusPayoutMode } from '@/lib/payroll/bonusMatching'
import { computeSeparateBonusPayslip, type SeparateBonusPayslip } from '@/lib/services/payrollService'
import { formatCurrency } from '@/lib/utils/format'
import type { BonusIncentive, Company, Employee } from '@/types/domain'

const BONUS_TYPE_LABEL = {
  fixed_amount: 'Fixed Amount',
  percentage: 'Percentage of monthly basic pay',
  performance_based: 'Performance-Based',
  output_based: 'Output-Based',
} as const

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground print:text-foreground/70">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

/** Standalone payslip for a bonus/incentive set to "Generate Separate Payslip" — carries only the bonus amount and its withholding tax. */
export function BonusPayslipPage() {
  const { bonusId, employeeId } = useParams<{
    bonusId: string
    employeeId: string
  }>()
  const { user } = useSession()
  const { company } = useTenant()
  const { bonuses, isLoading } = useBonuses()
  const { employees, isLoading: employeesLoading } = useEmployees()

  if (isLoading || employeesLoading) return <Skeleton className="h-96" />

  const bonus = bonuses.find((b) => b.id === bonusId)
  const employee = employees.find((e) => e.id === employeeId)
  const payslip =
    bonus && employee && bonus.status === 'approved' && bonusPayoutMode(bonus) === 'separate_payslip' && bonusAppliesToEmployee(bonus, employee)
      ? computeSeparateBonusPayslip(user, bonus, employee)
      : undefined

  if (!bonus || !employee || !payslip) {
    return (
      <div className="space-y-4">
        <Link to="/bonuses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to Bonuses & Incentives
        </Link>
        <p className="text-sm text-muted-foreground">
          No separate payslip is available. It's generated only for approved bonuses set to &ldquo;Generate Separate Payslip&rdquo;.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/bonuses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to Bonuses & Incentives
        </Link>
        <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Print / Download
        </Button>
      </div>

      <BonusPayslipDocument company={company} bonus={bonus} employee={employee} payslip={payslip} />
    </div>
  )
}

/** The bonus payslip itself — shared by the payslip page, its print/PDF, and the email preview. */
export function BonusPayslipDocument({
  company,
  bonus,
  employee,
  payslip,
}: {
  company: Company | undefined
  bonus: BonusIncentive
  employee: Employee
  payslip: SeparateBonusPayslip
}) {
  const fullName = `${employee.personal.firstName} ${employee.personal.lastName}`

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
          <Badge tone="brand" className="gap-1">
            <Gift className="size-3" />
            Bonus / Incentive Payslip
          </Badge>
          <p className="mt-1.5 text-xs text-muted-foreground print:text-foreground/70">Separate payslip · not part of the regular payroll run</p>
        </div>
      </div>

      <div className="grid gap-6 border-b border-border p-6 sm:grid-cols-2 print:border-black/30">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</p>
          <InfoRow label="Name" value={fullName} />
          <InfoRow label="Employee ID" value={employee.employeeNumber} />
          <InfoRow label="Department" value={employee.employment.department} />
          <InfoRow label="Position" value={employee.employment.position} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payout</p>
          <InfoRow label="Payroll Period" value={bonus.periodLabel} />
          <InfoRow label="Bonus Type" value={BONUS_TYPE_LABEL[bonus.bonusType]} />
          <InfoRow label="Tax Treatment" value={bonus.taxable ? 'Taxable' : 'Non-Taxable'} />
          {bonus.decidedBy && <InfoRow label="Approved By" value={bonus.decidedBy} />}
        </div>
      </div>

      <div className="p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60">
              <td className="py-2.5">
                {bonus.name}
                {bonus.bonusType === 'percentage' && <span className="block text-xs text-muted-foreground">{bonus.amount}% of monthly-equivalent basic pay</span>}
              </td>
              <td className="py-2.5 text-right tabular-nums">{formatCurrency(payslip.grossBonus)}</td>
            </tr>
            <tr className="border-b border-border/60">
              <td className="py-2.5 text-muted-foreground">
                Less: Withholding Tax
                <span className="block text-xs">
                  {!bonus.taxable
                    ? 'Non-taxable — no withholding'
                    : payslip.taxRate === 0
                      ? 'Taxable — 0% bracket (below the withholding threshold)'
                      : `Taxable — ${Math.round(payslip.taxRate * 100)}% marginal rate`}
                </span>
              </td>
              <td className="py-2.5 text-right tabular-nums text-danger">−{formatCurrency(payslip.withholdingTax)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-primary/10 px-5 py-4 print:rounded-none print:border-2 print:border-primary">
          <div>
            <p className="font-display text-sm font-semibold text-primary">Net Bonus Pay</p>
            <p className="text-xs text-muted-foreground print:text-foreground/70">Statutory contributions stay on the regular payroll payslip.</p>
          </div>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">{formatCurrency(payslip.netPay)}</p>
        </div>
      </div>

      <p className="pb-6 text-center text-[10px] uppercase tracking-wide text-muted-foreground/70 print:text-foreground/50">
        This is a system-generated document and does not require a signature.
      </p>
    </Card>
  )
}
