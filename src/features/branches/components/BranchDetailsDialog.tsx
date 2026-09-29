import { Building2, CalendarDays, Crown, Mail, MapPin, Phone, Search, Users } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { fullName } from '@/features/branches/branchUtils'
import { AssignEmployeesDialog } from '@/features/branches/components/AssignEmployeesDialog'
import { useSession } from '@/hooks/useSession'
import { reassignEmployeeBranch, updateBranch } from '@/lib/services/branchService'
import { formatDate } from '@/lib/utils/format'
import type { Branch, Employee } from '@/types/domain'

function DetailItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm font-medium">{children}</div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-semibold">{value}</p>
    </div>
  )
}

/** Full branch profile — metadata, address, contact, manager — plus its employees with assign / transfer / set-manager actions. */
export function BranchDetailsDialog({
  branch,
  branches,
  employees,
  canManage,
  onClose,
  onChanged,
}: {
  branch: Branch | null
  branches: Branch[]
  employees: Employee[]
  canManage: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()
  const [query, setQuery] = useState('')

  const staff = branch ? employees.filter((e) => e.branchId === branch.id) : []
  const manager = branch?.managerEmployeeId ? employees.find((e) => e.id === branch.managerEmployeeId) : undefined
  const departments = new Set(staff.map((e) => e.employment.department)).size
  const q = query.trim().toLowerCase()
  const visible = staff
    .filter((e) => !q || `${fullName(e)} ${e.employeeNumber} ${e.employment.position} ${e.employment.department}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.id === branch?.managerEmployeeId) - Number(a.id === branch?.managerEmployeeId) || a.personal.lastName.localeCompare(b.personal.lastName))
  const otherBranches = branches.filter((b) => b.id !== branch?.id).map((b) => ({ value: b.id, label: b.name }))

  async function moveEmployee(employee: Employee, targetId: string) {
    const target = branches.find((b) => b.id === targetId)
    await reassignEmployeeBranch(user, employee.id, targetId)
    notify({ title: 'Employee transferred', description: `${fullName(employee)} moved to ${target?.name ?? 'another branch'}.`, tone: 'success' })
    onChanged()
  }

  async function setManager(employee: Employee) {
    if (!branch) return
    await updateBranch(user, branch.id, { managerEmployeeId: employee.id })
    notify({ title: 'Branch manager updated', description: `${fullName(employee)} now manages ${branch.name}.`, tone: 'success' })
    onChanged()
  }

  return (
    <Dialog
      open={!!branch}
      onOpenChange={(open) => {
        if (!open) {
          setQuery('')
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-5xl">
        {branch && (
          <>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
              <Building2 className="size-5 text-muted-foreground" />
              {branch.name}
              {branch.isHeadOffice && <Badge tone="brand">Head Office</Badge>}
              {branch.code && <Badge tone="neutral">{branch.code}</Badge>}
            </DialogTitle>
            <DialogDescription>Branch profile and assigned employees.</DialogDescription>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Employees" value={staff.length} />
              <Stat label="Active" value={staff.filter((e) => e.employment.status === 'active').length} />
              <Stat label="Departments" value={departments} />
              <Stat label="Opened" value={branch.openedDate ? formatDate(branch.openedDate) : '—'} />
            </div>

            <div className="mt-5 grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
              <DetailItem icon={<MapPin className="size-4" />} label="Address">
                {branch.address || branch.city ? (
                  <>
                    {branch.address && <p>{branch.address}</p>}
                    {branch.city && <p className="text-muted-foreground">{branch.city}</p>}
                  </>
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </DetailItem>
              <DetailItem icon={<Crown className="size-4" />} label="Branch Manager">
                {manager ? (
                  <div className="flex items-center gap-2">
                    <Avatar name={fullName(manager)} size="sm" />
                    <div>
                      <p>{fullName(manager)}</p>
                      <p className="text-xs font-normal text-muted-foreground">{manager.employment.position}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Not assigned</span>
                )}
              </DetailItem>
              <DetailItem icon={<Phone className="size-4" />} label="Contact Number">
                {branch.contactNumber ?? <span className="text-muted-foreground">Not set</span>}
              </DetailItem>
              <DetailItem icon={<Mail className="size-4" />} label="Email">
                {branch.email ?? <span className="text-muted-foreground">Not set</span>}
              </DetailItem>
              <DetailItem icon={<CalendarDays className="size-4" />} label="Branch Type">
                {branch.isHeadOffice ? 'Head Office' : 'Branch'}
              </DetailItem>
              <DetailItem icon={<Users className="size-4" />} label="Headcount">
                {staff.length} employee{staff.length === 1 ? '' : 's'} across {departments} department{departments === 1 ? '' : 's'}
              </DetailItem>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Assigned Employees ({staff.length})</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employees…" className="pl-9" />
                  </div>
                  {canManage && <AssignEmployeesDialog branch={branch} branches={branches} employees={employees} onAssigned={onChanged} triggerLabel="Assign Employees" triggerVariant="primary" />}
                </div>
              </div>

              {staff.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No employees assigned to this branch yet.</p>
              ) : (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && <TableHead className="text-right">Manage</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((e) => {
                      const isManager = e.id === branch.managerEmployeeId
                      return (
                        <TableRow key={e.id}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={fullName(e)} size="sm" />
                              <div>
                                <p className="flex items-center gap-1.5 font-medium">
                                  {fullName(e)}
                                  {isManager && (
                                    <Badge tone="brand" className="gap-1">
                                      <Crown className="size-3" />
                                      Manager
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{e.employeeNumber}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{e.employment.position}</TableCell>
                          <TableCell className="text-muted-foreground">{e.employment.department}</TableCell>
                          <TableCell>
                            <StatusBadge status={e.employment.status} />
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                {!isManager && e.employment.status === 'active' && (
                                  <Button size="sm" variant="ghost" icon={<Crown className="size-3.5" />} onClick={() => setManager(e)}>
                                    Set as Manager
                                  </Button>
                                )}
                                <div className="w-44">
                                  <Select value={undefined} onValueChange={(v) => moveEmployee(e, v)} options={otherBranches} placeholder="Transfer to…" disabled={otherBranches.length === 0} />
                                </div>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
