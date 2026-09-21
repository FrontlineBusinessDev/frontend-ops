import { Eye, Pencil, Power, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { setPayrollGroupStatus } from '@/lib/services/payrollSettingsService'
import { formatDate } from '@/lib/utils/format'
import type { CompensationType, Employee, PayrollGroup, Schedule } from '@/types/domain'
import { PayrollGroupAssignDialog } from '@/features/company-settings/components/payroll/PayrollGroupAssignDialog'
import { PayrollGroupDetailDialog } from '@/features/company-settings/components/payroll/PayrollGroupDetailDialog'
import { PayrollGroupDialog } from '@/features/company-settings/components/payroll/PayrollGroupDialog'

const FREQUENCY_LABEL: Record<PayrollGroup['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semi_monthly: 'Semi-monthly',
  monthly: 'Monthly',
  custom: 'Custom',
}

export function PayrollGroupsSection({
  groups,
  compensationTypes,
  schedules,
  employees,
  canEdit,
  onRefetch,
}: {
  groups: PayrollGroup[]
  compensationTypes: CompensationType[]
  schedules: Schedule[]
  employees: Employee[]
  canEdit: boolean
  onRefetch: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()

  async function toggleStatus(group: PayrollGroup) {
    await setPayrollGroupStatus(user, group.id, group.status === 'active' ? 'inactive' : 'active')
    notify({ title: group.status === 'active' ? 'Payroll group deactivated' : 'Payroll group activated', tone: 'success' })
    onRefetch()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Payroll Groups</p>
          <p className="text-xs text-muted-foreground">How and when each group of employees is processed for payroll.</p>
        </div>
        {canEdit && <PayrollGroupDialog compensationTypes={compensationTypes} schedules={schedules} onSaved={onRefetch} />}
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No payroll groups yet" icon={Users} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => {
            const compensationType = compensationTypes.find((c) => c.id === group.compensationTypeId)
            const schedule = schedules.find((s) => s.id === group.workScheduleId)
            return (
              <Card key={group.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-semibold tracking-tight">{group.name}</p>
                    {group.description && <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>}
                  </div>
                  <Badge tone={group.status === 'active' ? 'success' : 'neutral'} className="capitalize shrink-0">
                    {group.status}
                  </Badge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Frequency</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{FREQUENCY_LABEL[group.frequency]}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Compensation</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{compensationType?.name ?? '—'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Cutoff</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{group.cutoffSchedule}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Pay dates</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{group.payDates}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Work schedule</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{schedule?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Effective</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{formatDate(group.effectiveDate)}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <Badge tone="brand">{group.employeeIds.length} Employees</Badge>
                  <div className="flex gap-1.5">
                    <PayrollGroupDetailDialog
                      group={group}
                      groups={groups}
                      compensationTypes={compensationTypes}
                      schedules={schedules}
                      employees={employees}
                      canEdit={canEdit}
                      onRefetch={onRefetch}
                      trigger={
                        <Button size="sm" variant="ghost" icon={<Eye className="size-3.5" />}>
                          View
                        </Button>
                      }
                    />
                    {canEdit && (
                      <>
                        <PayrollGroupAssignDialog
                          group={group}
                          groups={groups}
                          employees={employees}
                          compensationTypes={compensationTypes}
                          onSaved={onRefetch}
                          trigger={
                            <Button size="sm" variant="ghost" icon={<Users className="size-3.5" />}>
                              Assign
                            </Button>
                          }
                        />
                        <PayrollGroupDialog
                          group={group}
                          compensationTypes={compensationTypes}
                          schedules={schedules}
                          onSaved={onRefetch}
                          trigger={
                            <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />}>
                              Edit
                            </Button>
                          }
                        />
                        <Button size="sm" variant="ghost" icon={<Power className="size-3.5" />} onClick={() => toggleStatus(group)}>
                          {group.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
