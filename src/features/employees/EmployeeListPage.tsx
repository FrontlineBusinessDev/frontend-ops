import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
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

export function EmployeeListPage() {
  const { user } = useSession()
  const { employees, isLoading, refetch } = useEmployees()
  const { branches } = useTenant()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [branchId, setBranchId] = useState('all')
  const [department, setDepartment] = useState('all')
  const [onLeaveIds, setOnLeaveIds] = useState<Set<string>>(new Set())

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

  const hasActiveFilters = search.trim() !== '' || status !== 'active' || branchId !== 'all' || department !== 'all'

  function resetFilters() {
    setSearch('')
    setStatus('active')
    setBranchId('all')
    setDepartment('all')
  }

  const filtered = employees.filter((e) => {
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
        <div className="w-44">
          <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />
        </div>
        <div className="w-48">
          <Select value={department} onValueChange={setDepartment} options={departmentOptions} />
        </div>
        <div className="w-52">
          <Select value={branchId} onValueChange={setBranchId} options={branchOptions} />
        </div>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={resetFilters}>
            Reset
          </Button>
        )}
        <p className="ml-auto self-center text-sm text-muted-foreground">
          {filtered.length} of {employees.length} employees
        </p>
      </div>

      {isLoading ? <Skeleton className="h-96" /> : <EmployeeTable employees={filtered} />}
    </div>
  )
}
