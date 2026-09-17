import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { useSession } from '@/hooks/useSession'
import { getAttendanceForEmployee } from '@/lib/services/attendanceService'
import { formatDate } from '@/lib/utils/format'
import type { AttendanceRecord } from '@/types/domain'

export function EssAttendancePage() {
  const { employee, isLoading: isLoadingEmployee } = useSelfEmployee()
  const { user } = useSession()
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null)

  useEffect(() => {
    if (!employee) return
    getAttendanceForEmployee(user, employee.id).then(setRecords)
  }, [user, employee])

  if (isLoadingEmployee || (employee && records === null)) return <Skeleton className="h-72" />
  if (!employee) return <p className="text-sm text-muted-foreground">No employee record linked to this account.</p>

  return (
    <div className="space-y-5">
      <PageHeader title="My Attendance" description="Your recorded time-in/time-out and attendance status." />

      {!records || records.length === 0 ? (
        <EmptyState title="No attendance recorded yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time In</TableHead>
              <TableHead>Time Out</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{formatDate(r.date)}</TableCell>
                <TableCell>{r.timeIn ?? '—'}</TableCell>
                <TableCell>{r.timeOut ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
