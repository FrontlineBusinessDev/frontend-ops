import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { FilterField, FiltersPopover, SortControl, type SortDirection } from '@/components/ui/FiltersPopover'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { AddEmployeeDialog } from '@/features/employees/components/AddEmployeeDialog'
import { EmployeeTable } from '@/features/employees/components/EmployeeTable'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useTenant } from '@/hooks/useTenant'
import { useSession } from '@/hooks/useSession'
import { getEmployeeIdsOnLeaveToday } from '@/lib/services/employeeService'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'department', label: 'Department' },
  { value: 'branch', label: 'Branch' },
]

export function EmployeeListPage() {
  const { user } = useSession()
  const { employees, isLoading, refetch } = useEmployees()
  const { branches } = useTenant()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [branchId, setBranchId] = useState('all')
  const [department, setDepartment] = useState('all')
  const [onLeaveIds, setOnLeaveIds] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    getEmployeeIdsOnLeaveToday(user).then(setOnLeaveIds)
  }, [user])

  const branchOptions = useMemo(
    () => [{ value: 'all', label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
    [branches],
  )

  const departmentOptions = useMemo(() => {
    const unique = Array.from(new Set(employees.map((e) => e.employment.department))).sort()
    return [{ value: 'all', label: 'All departments' }, ...unique.map((d) => ({ value: d, label: d }))]
  }, [employees])

  const activeFilterCount = [status !== 'active', branchId !== 'all', department !== 'all'].filter(Boolean).length
  const hasActiveFilters = search.trim() !== '' || activeFilterCount > 0

  function resetFilters() {
    setSearch('')
    setStatus('active')
    setBranchId('all')
    setDepartment('all')
  }

  const branchNameById = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches])

  const filtered = employees
    .filter((e) => {
      if (status === 'on_leave') {
        if (!onLeaveIds.has(e.id)) return false
      } else if (status !== 'all' && e.employment.status !== status) {
        return false
      }
      if (branchId !== 'all' && e.branchId !== branchId) return false
      if (department !== 'all' && e.employment.department !== department) return false

      const query = search.trim().toLowerCase()
      if (query) {
        const fullName = `${e.personal.firstName} ${e.personal.lastName}`.toLowerCase()
        const haystack = [fullName, e.employeeNumber, e.personal.personalEmail ?? '', e.employment.position].join(' ').toLowerCase()
        if (!haystack.includes(query)) return false
      }

      return true
    })
    .sort((a, b) => {
      let result = 0
      if (sortBy === 'department') result = a.employment.department.localeCompare(b.employment.department)
      else if (sortBy === 'branch') result = (branchNameById.get(a.branchId) ?? '').localeCompare(branchNameById.get(b.branchId) ?? '')
      else result = `${a.personal.firstName} ${a.personal.lastName}`.localeCompare(`${b.personal.firstName} ${b.personal.lastName}`)
      return sortDirection === 'asc' ? result : -result
    })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        description="View, add, and manage everyone on the company roster."
        actions={<AddEmployeeDialog onCreated={refetch} />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, email, position…"
            className="pl-9"
          />
        </div>
        <FiltersPopover
          activeCount={activeFilterCount}
          footer={
            hasActiveFilters && (
              <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={resetFilters}>
                Clear Filters
              </Button>
            )
          }
        >
          <FilterField label="Status">
            <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />
          </FilterField>
          <FilterField label="Department">
            <Select value={department} onValueChange={setDepartment} options={departmentOptions} />
          </FilterField>
          <FilterField label="Branch">
            <Select value={branchId} onValueChange={setBranchId} options={branchOptions} />
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
          {filtered.length} of {employees.length} employees
        </p>
      </div>

      {isLoading ? <Skeleton className="h-96" /> : <EmployeeTable employees={filtered} />}
    </div>
  )
}
