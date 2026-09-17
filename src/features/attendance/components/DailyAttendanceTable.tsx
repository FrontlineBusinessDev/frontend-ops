import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { AdjustmentRequestDialog } from '@/features/attendance/components/AdjustmentRequestDialog'
import { usePermission } from '@/hooks/usePermission'
import type { AttendanceRecord, Employee } from '@/types/domain'

export function DailyAttendanceTable({
  records,
  employees,
  onAdjustmentCreated,
}: {
  records: AttendanceRecord[]
  employees: Employee[]
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
                  <StatusBadge status={record.status} />
                </TableCell>
                {canAdjust && (
                  <TableCell>
                    {record.status !== 'present' && (
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
