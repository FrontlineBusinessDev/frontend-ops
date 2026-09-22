import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { buildSampleAttendance } from '@/features/ess/sampleData'
import type { SampleAttendanceStatus } from '@/features/ess/sampleData'
import { useHighlightTarget } from '@/hooks/useHighlightTarget'
import { useSession } from '@/hooks/useSession'
import { getAttendanceForEmployee } from '@/lib/services/attendanceService'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import type { AttendanceRecord, AttendanceStatus } from '@/types/domain'

const REAL_STATUS_TONE: Record<AttendanceStatus, 'success' | 'warning' | 'danger'> = {
  present: 'success',
  late: 'warning',
  undertime: 'warning',
  absent: 'danger',
}

const SAMPLE_STATUS_LABEL: Record<SampleAttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  on_leave: 'On Leave',
  overtime: 'Overtime',
}

const SAMPLE_STATUS_TONE: Record<SampleAttendanceStatus, 'success' | 'warning' | 'brand' | 'neutral'> = {
  present: 'success',
  late: 'warning',
  on_leave: 'brand',
  overtime: 'neutral',
}

/** Real attendance-status pill — reuses the app's semantic tones (StatusBadge is too generic here since these labels come from `STATUS_LABEL`). */
function RealStatusBadge({ status }: { status: AttendanceStatus }) {
  return <Badge tone={REAL_STATUS_TONE[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>
}

function SampleStatusBadge({ status }: { status: SampleAttendanceStatus }) {
  return <Badge tone={SAMPLE_STATUS_TONE[status]}>{SAMPLE_STATUS_LABEL[status]}</Badge>
}

/** "8:57 AM – 6:05 PM" style time-in/out, and a total-hours estimate net of a 1-hour lunch — display only. */
function hoursWorkedFor(record: AttendanceRecord): string {
  if (!record.timeIn || !record.timeOut) return '—'
  const [inH, inM] = record.timeIn.split(':').map(Number)
  const [outH, outM] = record.timeOut.split(':').map(Number)
  const minutes = outH * 60 + outM - (inH * 60 + inM) - 60
  return `${(minutes / 60).toFixed(1)} hrs`
}

export function EssAttendancePage() {
  const { employee, isLoading: isLoadingEmployee } = useSelfEmployee()
  const { user } = useSession()
  const { highlightId } = useHighlightTarget()
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null)

  useEffect(() => {
    if (!employee) return
    getAttendanceForEmployee(user, employee.id).then(setRecords)
  }, [user, employee])

  if (isLoadingEmployee || (employee && records === null)) return <Skeleton className="h-72" />
  if (!employee) return <p className="text-sm text-muted-foreground">No employee record linked to this account.</p>

  const realRecords = records ?? []
  const sampleRows = realRecords.length === 0 ? buildSampleAttendance() : []

  return (
    <div className="space-y-5">
      <PageHeader title="My Attendance" description="Your recorded time-in/time-out and attendance status." />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time In</TableHead>
            <TableHead>Time Out</TableHead>
            <TableHead>Hours Worked</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {realRecords.length > 0
            ? realRecords.map((r) => (
                <TableRow key={r.id} id={`row-${r.id}`} className={cn(r.id === highlightId && 'highlight-target')}>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>{r.timeIn ?? '—'}</TableCell>
                  <TableCell>{r.timeOut ?? '—'}</TableCell>
                  <TableCell>{hoursWorkedFor(r)}</TableCell>
                  <TableCell>
                    <RealStatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))
            : sampleRows.map((r) => (
                <TableRow key={r.id} id={`row-${r.id}`} className={cn(r.id === highlightId && 'highlight-target')}>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>{r.timeIn ?? '—'}</TableCell>
                  <TableCell>{r.timeOut ?? '—'}</TableCell>
                  <TableCell>{r.hoursWorked}</TableCell>
                  <TableCell>
                    <SampleStatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
