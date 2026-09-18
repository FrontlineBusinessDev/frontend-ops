import { Eye, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterField, FiltersPopover, SortControl, type SortDirection } from '@/components/ui/FiltersPopover'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { AddLoanDialog } from '@/features/loans-deductions/components/AddLoanDialog'
import { LoanDetailsDialog } from '@/features/loans-deductions/components/LoanDetailsDialog'
import { useLoans } from '@/features/loans-deductions/hooks/useLoans'
import { usePermission } from '@/hooks/usePermission'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { LoanRecord } from '@/types/domain'

const TYPE_LABELS: Record<string, string> = {
  sss_salary_loan: 'SSS Loan – Salary',
  sss_calamity_loan: 'SSS Loan – Calamity',
  pagibig_multipurpose_loan: 'Pag-IBIG Loan – Multi-Purpose',
  pagibig_calamity_loan: 'Pag-IBIG Loan – Calamity',
  pagibig_mp2: 'Pag-IBIG MP2 Savings',
  company_loan: 'Company Loan / Emergency Advance',
  other_deduction: 'Other Deduction',
}

const TYPE_OPTIONS = [{ value: 'all', label: 'All Types' }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'suspended', label: 'Suspended' },
]

const SORT_OPTIONS = [
  { value: 'startDate', label: 'Start Date' },
  { value: 'balance', label: 'Remaining Balance' },
  { value: 'name', label: 'Employee Name' },
]

export function LoansDeductionsPage() {
  const { loans, isLoading, refetch } = useLoans()
  const { employees } = useEmployees()
  const canManage = usePermission('loans.manage')
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
        const haystack = `${employeeName(loan.employeeId)} ${employee?.employeeNumber ?? ''} ${TYPE_LABELS[loan.type] ?? loan.label}`.toLowerCase()
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
      <PageHeader
        title="Loans & Deductions"
        description="Employee loan balances, repayment schedules, and recurring payroll deductions."
        actions={canManage && <AddLoanDialog employees={employees} onCreated={refetch} />}
      />

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
            return (
              <Card
                key={loan.id}
                className="cursor-pointer p-5 transition-shadow hover:shadow-soft-lg"
                onClick={() => setSelectedLoan(loan)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{TYPE_LABELS[loan.type] ?? loan.label}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={loan.status} />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Eye className="size-3.5" />}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLoan(loan)
                      }}
                      aria-label="View details"
                    />
                  </div>
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

      <LoanDetailsDialog
        loan={selectedLoan}
        employee={selectedLoan ? employeeById.get(selectedLoan.employeeId) : undefined}
        onClose={() => setSelectedLoan(null)}
      />
    </div>
  )
}
