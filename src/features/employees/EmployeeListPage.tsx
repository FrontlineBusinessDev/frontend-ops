import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { AddEmployeeDialog } from '@/features/employees/components/AddEmployeeDialog'
import { EmployeeTable } from '@/features/employees/components/EmployeeTable'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useTenant } from '@/hooks/useTenant'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

export function EmployeeListPage() {
  const { employees, isLoading, refetch } = useEmployees()
  const { branches } = useTenant()
  const [status, setStatus] = useState('active')
  const [branchId, setBranchId] = useState('all')

  const branchOptions = useMemo(
    () => [{ value: 'all', label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
    [branches],
  )

  const filtered = employees.filter((e) => {
    if (status !== 'all' && e.employment.status !== status) return false
    if (branchId !== 'all' && e.branchId !== branchId) return false
    return true
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        description="View, add, and manage everyone on the company roster."
        actions={<AddEmployeeDialog onCreated={refetch} />}
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />
        </div>
        <div className="w-52">
          <Select value={branchId} onValueChange={setBranchId} options={branchOptions} />
        </div>
        <p className="ml-auto self-center text-sm text-muted-foreground">
          {filtered.length} of {employees.length} employees
        </p>
      </div>

      {isLoading ? <Skeleton className="h-96" /> : <EmployeeTable employees={filtered} />}
    </div>
  )
}
