import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { EmployeeMultiPicker } from '@/features/branches/components/EmployeeMultiPicker'
import { useSession } from '@/hooks/useSession'
import { assignEmployeesToBranch } from '@/lib/services/branchService'
import type { Branch, Employee } from '@/types/domain'

/** Bulk assign unassigned employees / transfer employees from other branches into `branch`. */
export function AssignEmployeesDialog({
  branch,
  branches,
  employees,
  onAssigned,
  triggerLabel = 'Assign',
  triggerVariant = 'secondary',
}: {
  branch: Branch
  branches: Branch[]
  employees: Employee[]
  onAssigned: () => void
  triggerLabel?: string
  triggerVariant?: 'primary' | 'secondary' | 'ghost'
}) {
  const [open, setOpen] = useState(false)
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()

  const candidates = employees.filter((e) => e.branchId !== branch.id && e.employment.status !== 'archived')

  function close(next: boolean) {
    setOpen(next)
    if (!next) setEmployeeIds([])
  }

  async function handleAssign() {
    setBusy(true)
    const moved = await assignEmployeesToBranch(user, employeeIds, branch.id)
    setBusy(false)
    notify({ title: 'Employees assigned', description: `${moved} employee(s) now assigned to ${branch.name}.`, tone: 'success' })
    close(false)
    onAssigned()
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant} icon={<UserPlus className="size-3.5" />}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Assign Employees to {branch.name}</DialogTitle>
        <DialogDescription>Select unassigned employees, or transfer employees from other branches. Transfers are recorded in each employee&apos;s history.</DialogDescription>
        <div className="mt-4">
          <EmployeeMultiPicker employees={candidates} branches={branches} value={employeeIds} onChange={setEmployeeIds} maxHeightClass="max-h-80" />
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button icon={<UserPlus className="size-4" />} isLoading={busy} disabled={employeeIds.length === 0} onClick={handleAssign}>
            Assign {employeeIds.length || ''} Employee{employeeIds.length === 1 ? '' : 's'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
