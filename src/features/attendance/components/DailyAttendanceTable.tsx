import { AlertTriangle, Plane } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { AdjustmentRequestDialog } from '@/features/attendance/components/AdjustmentRequestDialog'
import type { LeaveResolution } from '@/features/attendance/leaveStatus'
import { usePermission } from '@/hooks/usePermission'
import type { AttendanceRecord, Employee } from '@/types/domain'

export function DailyAttendanceTable({
  records,
  employees,
  leaveResolutions,
  onAdjustmentCreated,
}: {
  records: AttendanceRecord[]
  employees: Employee[]
  /** Approved-leave status per employee for this date (overrides Absent). */
  leaveResolutions?: Map<string, LeaveResolution>
  onAdjustmentCreated: () => void
}) {
  const canAdjust = usePermission('attendance.adjust')
  const [adjusting, setAdjusting] = useState<AttendanceRecord | null>(null)

  const employeeById = new Map(employees.map((e) => [e.id, e]))

  if (records.length === 0) {
    return <EmptyState title="No attendance recorded for this date" description="Try a different date or check back tomorrow." />
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Time In</TableHead>
            <TableHead>Time Out</TableHead>
            <TableHead>Status</TableHead>
            {canAdjust && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const employee = employeeById.get(record.employeeId)
            if (!employee) return null
            const leave = leaveResolutions?.get(record.employeeId)
            // Rows added only to show an employee's leave have no punch record to adjust.
            const isLeaveOnlyRow = record.id.startsWith('leave-')
            return (
              <TableRow key={record.id}>
                <TableCell>
                  <p className="text-sm font-medium">
                    {employee.personal.firstName} {employee.personal.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{employee.employeeNumber}</p>
                </TableCell>
                <TableCell>{record.timeIn ?? '—'}</TableCell>
                <TableCell>{record.timeOut ?? '—'}</TableCell>
                <TableCell>
                  {leave ? (
                    <div className="space-y-0.5">
                      <Badge tone="brand" className="gap-1 whitespace-nowrap">
                        <Plane className="size-3" />
                        {leave.label}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground">{leave.leaveLabel}</p>
                      {leave.detail && <p className="text-[11px] text-muted-foreground">{leave.detail}</p>}
                      {leave.review && (
                        <p className="flex max-w-72 items-start gap-1 text-[11px] font-medium text-warning">
                          <AlertTriangle className="mt-px size-3 shrink-0" />
                          Review: {leave.review}
                        </p>
                      )}
                    </div>
                  ) : (
                    <StatusBadge status={record.status} />
                  )}
                </TableCell>
                {canAdjust && (
                  <TableCell>
                    {record.status !== 'present' && !isLeaveOnlyRow && (!leave || leave.review) && (
                      <Button size="sm" variant="secondary" onClick={() => setAdjusting(record)}>
                        Request Adjustment
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AdjustmentRequestDialog
        record={adjusting}
        employeeName={
          adjusting ? `${employeeById.get(adjusting.employeeId)?.personal.firstName ?? ''} ${employeeById.get(adjusting.employeeId)?.personal.lastName ?? ''}` : ''
        }
        onOpenChange={(open) => !open && setAdjusting(null)}
        onCreated={onAdjustmentCreated}
      />
    </>
  )
}
