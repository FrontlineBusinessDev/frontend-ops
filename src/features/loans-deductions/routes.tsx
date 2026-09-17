import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { AddLoanDialog } from '@/features/loans-deductions/components/AddLoanDialog'
import { useLoans } from '@/features/loans-deductions/hooks/useLoans'
import { usePermission } from '@/hooks/usePermission'
import { formatCurrency, formatDate } from '@/lib/utils/format'

const TYPE_LABELS: Record<string, string> = {
  sss_loan: 'SSS Loan',
  pagibig_loan: 'Pag-IBIG Loan',
  company_loan: 'Company Loan',
  other: 'Other',
}

export function LoansDeductionsPage() {
  const { loans, isLoading, refetch } = useLoans()
  const { employees } = useEmployees()
  const canManage = usePermission('loans.manage')
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Loans & Deductions"
        description="Employee loan balances, repayment schedules, and recurring payroll deductions."
        actions={canManage && <AddLoanDialog employees={employees} onCreated={refetch} />}
      />

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : loans.length === 0 ? (
        <EmptyState title="No loan records yet" description="Add a loan to start tracking automatic payroll deductions." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan) => {
            const employee = employeeById.get(loan.employeeId)
            const progress = Math.round(((loan.principal - loan.balance) / loan.principal) * 100)
            return (
              <Card key={loan.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{TYPE_LABELS[loan.type]}</p>
                  </div>
                  <StatusBadge status={loan.status} />
                </div>
                <p className="mt-3 font-display text-lg font-semibold">{formatCurrency(loan.balance)}</p>
                <p className="text-xs text-muted-foreground">of {formatCurrency(loan.principal)} remaining</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatCurrency(loan.monthlyDeduction)}/month &middot; started {formatDate(loan.startDate)}
                </p>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
