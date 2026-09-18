import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import type { SortDirection } from '@/components/ui/FiltersPopover'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { LeaveFilterBar } from '@/features/leave/components/LeaveFilterBar'
import { LeaveRequestDialog } from '@/features/leave/components/LeaveRequestDialog'
import { LeaveRequestsList } from '@/features/leave/components/LeaveRequestsList'
import { LeaveTypesPanel } from '@/features/leave/components/LeaveTypesPanel'
import { HIERARCHY_LABEL, HIERARCHY_LEVELS, getEmployeeHierarchyLevel } from '@/features/leave/hierarchyUtil'
import { useLeaveRequests, useLeaveTypes } from '@/features/leave/hooks/useLeave'
import { usePermission } from '@/hooks/usePermission'
import type { Employee } from '@/types/domain'

const SORT_OPTIONS = [
  { value: 'requestedAt', label: 'Date Requested' },
  { value: 'name', label: 'Employee Name' },
]

export function LeavePage() {
  const { requests, isLoading, refetch } = useLeaveRequests()
  const { leaveTypes, refetch: refetchLeaveTypes } = useLeaveTypes()
  const { employees } = useEmployees()
  const canRequest = usePermission('leave.request')
  const [activeTab, setActiveTab] = useState('requests')

  const [search, setSearch] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('all')
  const [status, setStatus] = useState('all')
  const [hierarchy, setHierarchy] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('requestedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const leaveTypeById = useMemo(() => new Map(leaveTypes.map((lt) => [lt.id, lt])), [leaveTypes])

  const leaveTypeOptions = useMemo(
    () => [{ value: 'all', label: 'All Types' }, ...leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))],
    [leaveTypes],
  )
  const hierarchyOptions = useMemo(
    () => [{ value: 'all', label: 'All Hierarchy Levels' }, ...HIERARCHY_LEVELS.map((h) => ({ value: h, label: HIERARCHY_LABEL[h] }))],
    [],
  )

  const hasActiveFilters =
    search.trim() !== '' || leaveTypeId !== 'all' || status !== 'all' || hierarchy !== 'all' || dateFrom !== '' || dateTo !== ''

  function clearFilters() {
    setSearch('')
    setLeaveTypeId('all')
    setStatus('all')
    setHierarchy('all')
    setDateFrom('')
    setDateTo('')
  }

  function matchesFilters(employee: Employee | undefined, requestLeaveTypeId: string, reqDateFrom: string, reqDateTo: string): boolean {
    if (!employee) return false
    if (hierarchy !== 'all' && getEmployeeHierarchyLevel(employee) !== hierarchy) return false
    if (leaveTypeId !== 'all' && requestLeaveTypeId !== leaveTypeId) return false
    if (dateFrom && reqDateTo < dateFrom) return false
    if (dateTo && reqDateFrom > dateTo) return false

    const query = search.trim().toLowerCase()
    if (query) {
      const leaveTypeName = leaveTypeById.get(requestLeaveTypeId)?.name.toLowerCase() ?? ''
      const haystack = `${employee.personal.firstName} ${employee.personal.lastName} ${employee.employeeNumber} ${leaveTypeName}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  }

  const filteredRequests = requests
    .filter((request) => {
      if (status !== 'all' && request.status !== status) return false
      return matchesFilters(employeeById.get(request.employeeId), request.leaveTypeId, request.dateFrom, request.dateTo)
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      const result =
        sortBy === 'name'
          ? `${employeeById.get(a.employeeId)?.personal.firstName} ${employeeById.get(a.employeeId)?.personal.lastName}`.localeCompare(
              `${employeeById.get(b.employeeId)?.personal.firstName} ${employeeById.get(b.employeeId)?.personal.lastName}`,
            )
          : a.requestedAt.localeCompare(b.requestedAt)
      return sortDirection === 'asc' ? result : -result
    })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leave Management"
        description="Leave requests, approvals, and company leave types."
        actions={activeTab === 'requests' && canRequest && <LeaveRequestDialog employees={employees} leaveTypes={leaveTypes} onCreated={refetch} />}
      />

      <Tabs defaultValue="requests" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="types">Leave Types & Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <LeaveFilterBar
            search={search}
            onSearchChange={setSearch}
            leaveTypeId={leaveTypeId}
            onLeaveTypeChange={setLeaveTypeId}
            leaveTypeOptions={leaveTypeOptions}
            status={status}
            onStatusChange={setStatus}
            hierarchy={hierarchy}
            onHierarchyChange={setHierarchy}
            hierarchyOptions={hierarchyOptions}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOptions={SORT_OPTIONS}
            sortDirection={sortDirection}
            onSortDirectionChange={setSortDirection}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />

          {isLoading ? (
            <Skeleton className="h-72" />
          ) : (
            <LeaveRequestsList requests={filteredRequests} employees={employees} leaveTypes={leaveTypes} onDecided={refetch} />
          )}
        </TabsContent>

        <TabsContent value="types">
          <LeaveTypesPanel leaveTypes={leaveTypes} employees={employees} onChanged={refetchLeaveTypes} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
