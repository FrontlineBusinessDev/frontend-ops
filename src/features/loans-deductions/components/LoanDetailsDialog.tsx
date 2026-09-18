import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Employee, LoanRecord } from '@/types/domain'

const TYPE_LABELS: Record<string, string> = {
  sss_salary_loan: 'SSS Salary Loan',
  sss_calamity_loan: 'SSS Calamity Loan',
  pagibig_multipurpose_loan: 'Pag-IBIG Multi-Purpose Loan',
  pagibig_calamity_loan: 'Pag-IBIG Calamity Loan',
  pagibig_mp2: 'Pag-IBIG MP2 (Modified Pag-IBIG 2 Savings)',
  company_loan: 'Company Loan / Emergency Advance',
  other_deduction: 'Other Deduction',
}

export function LoanDetailsDialog({
  loan,
  employee,
  onClose,
}: {
  loan: LoanRecord | null
  employee: Employee | undefined
  onClose: () => void
}) {
  const open = loan !== null
  const history = [...(loan?.repaymentHistory ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        {loan && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : '?'} size="lg" />
                <div>
                  <DialogTitle>{employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown employee'}</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    {employee?.employment.department} &middot; {employee?.employeeNumber}
                  </DialogDescription>
                </div>
              </div>
              <StatusBadge status={loan.status} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</p>
                <p className="mt-1 text-sm font-medium">{TYPE_LABELS[loan.type] ?? loan.label}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Amount</p>
                <p className="mt-1 text-sm font-medium">{formatCurrency(loan.principal)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remaining Balance</p>
                <p className="mt-1 text-sm font-medium">{formatCurrency(loan.balance)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Monthly Deduction</p>
                <p className="mt-1 text-sm font-medium">{formatCurrency(loan.monthlyDeduction)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Started</p>
                <p className="mt-1 text-sm font-medium">{formatDate(loan.startDate)}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Repayment Schedule / History</p>
              {history.length === 0 ? (
                <EmptyState title="No deductions recorded yet" description="Entries appear here once payroll runs finalize with this deduction." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Payroll Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.payrollReference}</TableCell>
                        <TableCell>{formatCurrency(entry.amount)}</TableCell>
                        <TableCell>{formatCurrency(entry.remainingBalanceAfter)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
