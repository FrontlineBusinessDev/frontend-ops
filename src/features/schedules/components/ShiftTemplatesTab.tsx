import { Clock, Pencil, Trash2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { ShiftTemplateDialog } from '@/features/schedules/components/ShiftTemplateDialog'
import { useShiftTemplates } from '@/features/schedules/hooks/useSchedules'
import { DAY_LABELS, TONE_CLASS, WEEK_ORDER } from '@/features/schedules/scheduleUi'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { hoursFor, shortTimeRange } from '@/lib/schedule/roster'
import { deleteShiftTemplate } from '@/lib/services/scheduleService'
import { cn } from '@/lib/utils/cn'

const SHIFT_TYPE_LABEL = { day: 'Day shift', night: 'Night shift', split: 'Split shift', flexible: 'Flexible hours' } as const

export function ShiftTemplatesTab() {
  const { templates, isLoading, refetch } = useShiftTemplates()
  const { employees } = useEmployees()
  const { user } = useSession()
  const { notify } = useToast()
  const canManage = usePermission('schedules.manage')

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? People who follow it become unscheduled and days assigned to it are cleared.`)) return
    const ok = await deleteShiftTemplate(user, id)
    notify(ok ? { title: `${name} deleted`, tone: 'success' } : { title: 'The default template can’t be deleted', tone: 'danger' })
    refetch()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Shift templates</p>
          <p className="max-w-3xl text-xs text-muted-foreground">
            Reusable shifts — different hours, shifting and flexible schedules. Attendance measures lateness against these, and Payroll reads each employee’s working days from the template they follow.
          </p>
        </div>
        {canManage && <ShiftTemplateDialog employees={employees} onSaved={refetch} />}
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : templates.length === 0 ? (
        <EmptyState title="No shift templates yet" description="Add a template to start building the roster." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const isDefault = t.id.endsWith('_sched_default')
            return (
              <Card key={t.id} watermark={null} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold tracking-tight">{t.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{SHIFT_TYPE_LABEL[t.shiftType ?? 'day']}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium', TONE_CLASS[t.tone ?? 'accent'])}>{shortTimeRange(t)}</span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Hours</dt>
                    <dd className="mt-0.5 flex items-center gap-1 font-medium">
                      <Clock className="size-3.5 text-muted-foreground" />
                      {t.startTime} – {t.endTime} ({hoursFor(t)}h)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Break · grace</dt>
                    <dd className="mt-0.5 font-medium">
                      {t.breakMinutes ?? 0} min · {t.gracePeriodMinutes ?? 0} min
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap gap-1">
                  {WEEK_ORDER.map((d) => (
                    <span key={d} className={cn('rounded px-1.5 py-0.5 text-[11px]', t.daysOfWeek.includes(d) ? TONE_CLASS[t.tone ?? 'accent'] : 'bg-muted text-muted-foreground/60')}>
                      {DAY_LABELS[d]}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    {t.assignedEmployeeIds?.length ?? 0} follow this
                    {isDefault && <Badge tone="brand">Default</Badge>}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <ShiftTemplateDialog
                        template={t}
                        employees={employees}
                        onSaved={refetch}
                        trigger={
                          <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />}>
                            Edit
                          </Button>
                        }
                      />
                      {!isDefault && (
                        <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => remove(t.id, t.name)} aria-label={`Delete ${t.name}`} />
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
