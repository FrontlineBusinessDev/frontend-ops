import { CalendarClock, Pencil, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSession } from '@/hooks/useSession'
import { setScheduleAssignedEmployees } from '@/lib/services/companyService'
import type { Employee, Schedule, ShiftType } from '@/types/domain'
import { AssignEmployeesDialog } from '@/features/company-settings/components/payroll/AssignEmployeesDialog'
import { ScheduleDialog } from '@/features/company-settings/components/payroll/ScheduleDialog'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SHIFT_LABEL: Record<ShiftType, string> = {
  day: 'Day Shift',
  night: 'Night Shift',
  split: 'Split Shift',
  flexible: 'Flexible',
}

function formatDays(days: number[]) {
  if (days.length === 0) return '—'
  return days
    .slice()
    .sort()
    .map((d) => DAY_LABELS[d])
    .join(', ')
}

export function WorkSchedulesSection({
  schedules,
  employees,
  canEdit,
  onRefetch,
}: {
  schedules: Schedule[]
  employees: Employee[]
  canEdit: boolean
  onRefetch: () => void
}) {
  const { user } = useSession()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Work Schedules</p>
          <p className="text-xs text-muted-foreground">Attendance shift patterns — separate from Payroll Groups.</p>
        </div>
        {canEdit && <ScheduleDialog onSaved={onRefetch} />}
      </div>

      {schedules.length === 0 ? (
        <EmptyState title="No work schedules yet" icon={CalendarClock} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-sm font-semibold tracking-tight">{schedule.name}</p>
                <Badge tone="neutral">{SHIFT_LABEL[schedule.shiftType ?? 'day']}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {schedule.startTime} – {schedule.endTime}
                {schedule.breakMinutes ? ` · ${schedule.breakMinutes} min break` : ''}
              </p>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Working days</dt>
                  <dd className="font-medium text-foreground">{formatDays(schedule.daysOfWeek)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Rest days</dt>
                  <dd className="font-medium text-foreground">{formatDays(schedule.restDays ?? [])}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Grace period</dt>
                  <dd className="font-medium text-foreground">{schedule.gracePeriodMinutes ?? 0} min</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <Badge tone="brand">{schedule.assignedEmployeeIds?.length ?? 0} Assigned</Badge>
                {canEdit && (
                  <div className="flex gap-1.5">
                    <AssignEmployeesDialog
                      title={`Assign Employees – ${schedule.name}`}
                      employees={employees}
                      selectedIds={schedule.assignedEmployeeIds ?? []}
                      onSave={async (ids) => {
                        await setScheduleAssignedEmployees(user, schedule.id, ids)
                        onRefetch()
                      }}
                      trigger={
                        <Button size="sm" variant="ghost" icon={<Users className="size-3.5" />}>
                          Assign
                        </Button>
                      }
                    />
                    <ScheduleDialog
                      schedule={schedule}
                      onSaved={onRefetch}
                      trigger={
                        <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />}>
                          Edit
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
