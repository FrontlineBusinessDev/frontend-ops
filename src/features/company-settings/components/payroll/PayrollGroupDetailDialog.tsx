import { Eye, Repeat, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { setEmployeePayrollGroup } from '@/lib/services/payrollSettingsService'
import { formatDate } from '@/lib/utils/format'
import type { CompensationType, Employee, PayrollGroup, Schedule } from '@/types/domain'
import { PayrollGroupAssignDialog } from '@/features/company-settings/components/payroll/PayrollGroupAssignDialog'

const FREQUENCY_LABEL: Record<PayrollGroup['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semi_monthly: 'Semi-monthly',
  monthly: 'Monthly',
  custom: 'Custom',
}

export function PayrollGroupDetailDialog({
  group,
  groups,
  compensationTypes,
  schedules,
  employees,
  canEdit,
  onRefetch,
  trigger,
}: {
  group: PayrollGroup
  groups: PayrollGroup[]
  compensationTypes: CompensationType[]
  schedules: Schedule[]
  employees: Employee[]
  canEdit: boolean
  onRefetch: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Employee | null>(null)
  const [reassignTarget, setReassignTarget] = useState<{ employee: Employee; toGroupId: string } | null>(null)
  const { user } = useSession()
  const { branches } = useTenant()
  const { notify } = useToast()
  const navigate = useNavigate()

  const compensationType = compensationTypes.find((c) => c.id === group.compensationTypeId)
  const schedule = schedules.find((s) => s.id === group.workScheduleId)
  const members = employees.filter((e) => group.employeeIds.includes(e.id))
  const otherActiveGroups = groups.filter((g) => g.id !== group.id && g.status === 'active')

  async function handleRemove() {
    if (!removeTarget) return
    await setEmployeePayrollGroup(user, removeTarget.id, null)
    notify({ title: `${removeTarget.personal.firstName} removed from ${group.name}`, tone: 'success' })
    setRemoveTarget(null)
    onRefetch()
  }

  async function handleReassign() {
    if (!reassignTarget) return
    const targetGroup = groups.find((g) => g.id === reassignTarget.toGroupId)
    await setEmployeePayrollGroup(user, reassignTarget.employee.id, reassignTarget.toGroupId)
    notify({ title: `Reassigned to ${targetGroup?.name}`, tone: 'success' })
    setReassignTarget(null)
    onRefetch()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger ?? <Button size="sm">View Details</Button>}</DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogTitle>{group.name}</DialogTitle>
          <DialogDescription>{group.description}</DialogDescription>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border bg-muted/40 p-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Payroll Frequency</p>
              <p className="mt-0.5 text-sm font-medium">{FREQUENCY_LABEL[group.frequency]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cutoff Schedule</p>
              <p className="mt-0.5 text-sm font-medium">{group.cutoffSchedule}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pay Date(s)</p>
              <p className="mt-0.5 text-sm font-medium">{group.payDates}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Compensation Type</p>
              <p className="mt-0.5 text-sm font-medium">{compensationType?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Number of Employees</p>
              <p className="mt-0.5 text-sm font-medium">{members.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge tone={group.status === 'active' ? 'success' : 'neutral'} className="mt-0.5 capitalize">
                {group.status}
              </Badge>
            </div>
            {schedule && (
              <div>
                <p className="text-xs text-muted-foreground">Work Schedule</p>
                <p className="mt-0.5 text-sm font-medium">{schedule.name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Effective Date</p>
              <p className="mt-0.5 text-sm font-medium">{formatDate(group.effectiveDate)}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm font-medium">Assigned Employees</p>
            {canEdit && (
              <PayrollGroupAssignDialog group={group} groups={groups} employees={employees} compensationTypes={compensationTypes} onSaved={onRefetch} />
            )}
          </div>

          <div className="mt-3">
            {members.length === 0 ? (
              <EmptyState title="No employees assigned yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((employee) => {
                    const branch = branches.find((b) => b.id === employee.branchId)
                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <p className="font-medium">
                            {employee.personal.firstName} {employee.personal.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{employee.employeeNumber}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{employee.employment.position}</TableCell>
                        <TableCell className="text-muted-foreground">{employee.employment.department}</TableCell>
                        <TableCell className="text-muted-foreground">{branch?.name ?? '—'}</TableCell>
                        <TableCell>
                          <StatusBadge status={employee.employment.status} />
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" icon={<Eye className="size-3.5" />} onClick={() => navigate(`/employees/${employee.id}`)}>
                                View
                              </Button>
                              {otherActiveGroups.length > 0 && (
                                <Select
                                  value=""
                                  onValueChange={(toGroupId) => setReassignTarget({ employee, toGroupId })}
                                  options={otherActiveGroups.map((g) => ({ value: g.id, label: g.name }))}
                                  placeholder="Reassign…"
                                  className="h-8 w-36 text-xs"
                                />
                              )}
                              <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setRemoveTarget(employee)}>
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={removeTarget !== null} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent>
          <DialogTitle>
            Remove {removeTarget?.personal.firstName} {removeTarget?.personal.lastName}?
          </DialogTitle>
          <DialogDescription>
            They will be unassigned from {group.name} and excluded from its next payroll run until reassigned.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Remove Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignTarget !== null} onOpenChange={(o) => !o && setReassignTarget(null)}>
        <DialogContent>
          <DialogTitle>Reassign {reassignTarget?.employee.personal.firstName}?</DialogTitle>
          <DialogDescription>
            This employee is currently assigned to {group.name}. Reassign to{' '}
            {groups.find((g) => g.id === reassignTarget?.toGroupId)?.name}?
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReassignTarget(null)}>
              Cancel
            </Button>
            <Button icon={<Repeat className="size-4" />} onClick={handleReassign}>
              Reassign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
