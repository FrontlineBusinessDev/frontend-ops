import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AttendanceFilterBar } from '@/features/attendance/components/AttendanceFilterBar'
import { AdjustmentsList } from '@/features/attendance/components/AdjustmentsList'
import { DailyAttendanceTable } from '@/features/attendance/components/DailyAttendanceTable'
import { FileAdjustmentDialog } from '@/features/attendance/components/FileAdjustmentDialog'
import { MiniCalendarPicker } from '@/features/attendance/components/MiniCalendarPicker'
import { GROUP_OPTIONS, getEmployeeGroup } from '@/features/attendance/groupUtil'
import { useAttendanceAdjustments, useDailyAttendance, useDateStatusSets } from '@/features/attendance/hooks/useAttendance'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { usePermission } from '@/hooks/usePermission'
import { useTenant } from '@/hooks/useTenant'
import type { Employee } from '@/types/domain'

function shiftDate(dateKey: string, deltaDays: number) {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

const DAILY_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'pending_adjustment', label: 'Pending Adjustment' },
]

const ADJUSTMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Adjustment' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function AttendancePage() {
  const [date, setDate] = useState(todayKey)
  const [activeTab, setActiveTab] = useState('daily')
  const { records, isLoading: isLoadingAttendance } = useDailyAttendance(date)
  const { onLeaveIds, pendingAdjustmentIds } = useDateStatusSets(date)
  const { adjustments, isLoading: isLoadingAdjustments, refetch } = useAttendanceAdjustments()
  const { employees, refetch: refetchEmployees } = useEmployees()
  const { branches } = useTenant()
  const canAdjust = usePermission('attendance.adjust')

  const [search, setSearch] = useState('')
  const [branchId, setBranchId] = useState('all')
  const [group, setGroup] = useState('all')
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState('all')

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  const branchOptions = useMemo(
    () => [{ value: 'all', label: 'All Branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))],
    [branches],
  )
  const departmentOptions = useMemo(() => {
    const unique = Array.from(new Set(employees.map((e) => e.employment.department))).sort()
    return [{ value: 'all', label: 'All Departments' }, ...unique.map((d) => ({ value: d, label: d }))]
  }, [employees])
  const groupOptions = useMemo(
    () => [{ value: 'all', label: 'All Groups' }, ...GROUP_OPTIONS.map((g) => ({ value: g, label: g }))],
    [],
  )

  const hasActiveFilters = search.trim() !== '' || branchId !== 'all' || group !== 'all' || department !== 'all' || status !== 'all'

  function clearFilters() {
    setSearch('')
    setBranchId('all')
    setGroup('all')
    setDepartment('all')
    setStatus('all')
  }

  function matchesCommonFilters(employee: Employee | undefined): boolean {
    if (!employee) return false
    if (branchId !== 'all' && employee.branchId !== branchId) return false
    if (group !== 'all' && getEmployeeGroup(employee) !== group) return false
    if (department !== 'all' && employee.employment.department !== department) return false

    const query = search.trim().toLowerCase()
    if (query) {
      const haystack = `${employee.personal.firstName} ${employee.personal.lastName} ${employee.employeeNumber}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  }

  const filteredRecords = records.filter((record) => {
    const employee = employeeById.get(record.employeeId)
    if (!matchesCommonFilters(employee)) return false

    if (status === 'all') return true
    if (status === 'on_leave') return onLeaveIds.has(record.employeeId)
    if (status === 'pending_adjustment') return pendingAdjustmentIds.has(record.employeeId)
    return record.status === status
  })

  const filteredAdjustments = adjustments
    .filter((adjustment) => {
      const employee = employeeById.get(adjustment.employeeId)
      if (!matchesCommonFilters(employee)) return false
      if (status === 'all') return true
      if (status === 'on_leave' || status === 'present' || status === 'absent' || status === 'late') return true
      return adjustment.status === status
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return b.requestedAt.localeCompare(a.requestedAt)
    })

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance & Timekeeping" description="Daily attendance, schedules, and adjustment approvals." />

      <AttendanceFilterBar
        search={search}
        onSearchChange={setSearch}
        branchId={branchId}
        onBranchChange={setBranchId}
        branchOptions={branchOptions}
        group={group}
        onGroupChange={setGroup}
        groupOptions={groupOptions}
        department={department}
        onDepartmentChange={setDepartment}
        departmentOptions={departmentOptions}
        status={status}
        onStatusChange={setStatus}
        statusOptions={activeTab === 'daily' ? DAILY_STATUS_OPTIONS : ADJUSTMENT_STATUS_OPTIONS}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      <Tabs defaultValue="daily" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <div className="mb-4 flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<ChevronLeft className="size-4" />} onClick={() => setDate((d) => shiftDate(d, -1))} />
            <MiniCalendarPicker value={date} onChange={setDate} />
            <Button size="sm" variant="secondary" icon={<ChevronRight className="size-4" />} onClick={() => setDate((d) => shiftDate(d, 1))} />
            {date !== todayKey() && (
              <Button size="sm" variant="ghost" onClick={() => setDate(todayKey())}>
                Today
              </Button>
            )}
          </div>
          {isLoadingAttendance ? (
            <Skeleton className="h-72" />
          ) : (
            <DailyAttendanceTable
              records={filteredRecords}
              employees={employees}
              onAdjustmentCreated={() => {
                refetch()
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="adjustments">
          <div className="mb-4 flex justify-end">
            {canAdjust && (
              <FileAdjustmentDialog
                employees={employees}
                onCreated={() => {
                  refetch()
                  refetchEmployees()
                }}
              />
            )}
          </div>
          {isLoadingAdjustments ? (
            <Skeleton className="h-72" />
          ) : (
            <AdjustmentsList
              adjustments={filteredAdjustments}
              employees={employees}
              onDecided={() => {
                refetch()
                refetchEmployees()
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
