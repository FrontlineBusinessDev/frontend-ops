import { CalendarClock, Pencil, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterField, FiltersPopover, SortControl, type SortDirection } from '@/components/ui/FiltersPopover'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { RecordCard } from '@/features/loans-deductions/components/RecordCard'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { AddLoanDialog } from '@/features/loans-deductions/components/AddLoanDialog'
import { LoanDetailsDialog } from '@/features/loans-deductions/components/LoanDetailsDialog'
import { useLoanTypes } from '@/features/loans-deductions/hooks/useBenefitsDeductions'
import { nextDeduction, projectInstallments } from '@/features/loans-deductions/loanUtils'
import { usePayrollGroups } from '@/features/company-settings/hooks/usePayrollGroups'
import { usePayrollPeriods } from '@/features/payroll/hooks/usePayroll'
import { useLoans } from '@/features/loans-deductions/hooks/useLoans'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { setLoanStatus } from '@/lib/services/loanService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { LoanRecord } from '@/types/domain'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'suspended', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
]

const SORT_OPTIONS = [
  { value: 'startDate', label: 'Start Date' },
  { value: 'balance', label: 'Remaining Balance' },
  { value: 'name', label: 'Employee Name' },
]

/** The repayment schedule on a loan card: when it's next deducted, and how many installments are left. */
function ScheduleLine({ loan, next }: { loan: LoanRecord; next: ReturnType<typeof nextDeduction> }) {
  if (loan.status === 'completed') {
    return <p className="font-medium text-foreground">Fully paid</p>
  }
  if (loan.status === 'cancelled') {
    return <p className="font-medium text-foreground">Cancelled — no further deductions</p>
  }
  if (loan.status === 'suspended') {
    return (
      <div>
        <p className="font-medium text-foreground">Deductions paused</p>
        <p className="text-muted-foreground">Resumes when you resume the loan.</p>
      </div>
    )
  }
  const installments = projectInstallments(loan)
  const last = installments[installments.length - 1]
  return (
    <div>
      <p className="font-medium text-foreground">Next deduction: {next?.when ?? '—'}</p>
      <p className="text-muted-foreground">
        {next?.detail ? `${next.detail} run · ` : ''}
        {installments.length} installment{installments.length === 1 ? '' : 's'} left{last ? ` · final payment ${last.month}` : ''}
      </p>
    </div>
  )
}

/** Every employee loan and installment deduction, with balances and repayment progress. */
export function EmployeeLoansView() {
  const { loans, isLoading, refetch } = useLoans()
  const { employees } = useEmployees()
  const { types, labelFor } = useLoanTypes()
  const { periods } = usePayrollPeriods()
  const { groups } = usePayrollGroups()
  const TYPE_OPTIONS = [{ value: 'all', label: 'All Types' }, ...types.map((t) => ({ value: t.key, label: t.label }))]
  const canManage = usePermission('loans.manage')
  const { user } = useSession()
  const { notify } = useToast()
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null)

  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [sortBy, setSortBy] = useState('startDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const activeFilterCount = [type !== 'all', status !== 'all'].filter(Boolean).length
  const hasActiveFilters = search.trim() !== '' || activeFilterCount > 0

  function clearFilters() {
    setSearch('')
    setType('all')
    setStatus('all')
  }

  async function changeStatus(loan: LoanRecord, status: LoanRecord['status'], message: string) {
    await setLoanStatus(user, loan.id, status)
    notify({ title: `${labelFor(loan.type, loan.label)} ${message}`, tone: 'success' })
    refetch()
  }

  function employeeName(employeeId: string): string {
    const employee = employeeById.get(employeeId)
    return employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : ''
  }

  const filteredLoans = loans
    .filter((loan) => {
      if (type !== 'all' && loan.type !== type) return false
      if (status !== 'all' && loan.status !== status) return false

      const query = search.trim().toLowerCase()
      if (query) {
        const employee = employeeById.get(loan.employeeId)
        const haystack = `${employeeName(loan.employeeId)} ${employee?.employeeNumber ?? ''} ${labelFor(loan.type, loan.label)}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
    .sort((a, b) => {
      let result = 0
      if (sortBy === 'balance') result = a.balance - b.balance
      else if (sortBy === 'name') result = employeeName(a.employeeId).localeCompare(employeeName(b.employeeId))
      else result = a.startDate.localeCompare(b.startDate)
      return sortDirection === 'asc' ? result : -result
    })

  return (
    <div className="space-y-5">

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, ID, or type…"
            className="pl-9"
          />
        </div>
        <FiltersPopover
          activeCount={activeFilterCount}
          footer={
            hasActiveFilters && (
              <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={clearFilters}>
                Clear Filters
              </Button>
            )
          }
        >
          <FilterField label="Loan/Deduction Type">
            <Select value={type} onValueChange={setType} options={TYPE_OPTIONS} />
          </FilterField>
          <FilterField label="Status">
            <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />
          </FilterField>
          <SortControl
            value={sortBy}
            onValueChange={setSortBy}
            options={SORT_OPTIONS}
            direction={sortDirection}
            onDirectionChange={setSortDirection}
          />
        </FiltersPopover>
        <p className="ml-auto self-center text-sm text-muted-foreground">
          {filteredLoans.length} of {loans.length} records
        </p>
        {canManage && <AddLoanDialog employees={employees} onCreated={refetch} />}
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : filteredLoans.length === 0 ? (
        <EmptyState title="No loan records match these filters" description="Try clearing a filter or add a new loan/deduction." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLoans.map((loan) => {
            const employee = employeeById.get(loan.employeeId)
            const progress = Math.round(((loan.principal - loan.balance) / loan.principal) * 100)
            const typeLabel = labelFor(loan.type, loan.label)
            return (
              <RecordCard
                key={loan.id}
                title={employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown'}
                subtitle={typeLabel}
                status={loan.status}
                headline={formatCurrency(loan.balance)}
                headlineHint={`of ${formatCurrency(loan.principal)} remaining`}
                progress={progress}
                lines={[`${formatCurrency(loan.monthlyDeduction)}/month · started ${formatDate(loan.startDate)}`]}
                note={<ScheduleLine loan={loan} next={nextDeduction(loan, periods, groups)} />}
                noteIcon={<CalendarClock className="mt-0.5 size-3.5 shrink-0 text-primary" />}
                onView={() => setSelectedLoan(loan)}
                edit={
                  <AddLoanDialog
                    employees={employees}
                    loan={loan}
                    onCreated={refetch}
                    trigger={
                      <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} disabled={!canManage || loan.status === 'completed' || loan.status === 'cancelled'} title={loan.status === 'completed' || loan.status === 'cancelled' ? `This loan is ${loan.status}.` : undefined}>
                        Edit
                      </Button>
                    }
                  />
                }
                onPause={() => changeStatus(loan, 'suspended', 'paused — no deductions until resumed')}
                onResume={() => changeStatus(loan, 'active', 'resumed')}
                onCancel={() => changeStatus(loan, 'cancelled', 'cancelled')}
                cancelName={typeLabel}
                cancelConsequence={`${employee ? employee.personal.firstName : 'The employee'}'s ${typeLabel} (${formatCurrency(loan.balance)} remaining) will stop being deducted in payroll.`}
                canManage={canManage}
                dimmed={loan.status === 'cancelled' || loan.status === 'completed'}
              />
            )
          })}
        </div>
      )}

      <LoanDetailsDialog
        loan={selectedLoan}
        employee={selectedLoan ? employeeById.get(selectedLoan.employeeId) : undefined}
        onClose={() => setSelectedLoan(null)}
      />
    </div>
  )
}
