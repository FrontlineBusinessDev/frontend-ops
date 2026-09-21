import { Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import type { Employee } from '@/types/domain'

/** Generic multi-select assignment dialog — used for Work Schedule employee assignment. Payroll Group assignment uses the richer `PayrollGroupAssignDialog`. */
export function AssignEmployeesDialog({
  title,
  employees,
  selectedIds,
  onSave,
  trigger,
}: {
  title: string
  employees: Employee[]
  selectedIds: string[]
  onSave: (employeeIds: string[]) => Promise<void>
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds))
  const [isSaving, setIsSaving] = useState(false)
  const { notify } = useToast()

  useEffect(() => {
    if (open) setSelected(new Set(selectedIds))
  }, [open, selectedIds])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setIsSaving(true)
    await onSave(Array.from(selected))
    setIsSaving(false)
    notify({ title: 'Employee assignments updated', tone: 'success' })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary" icon={<Users className="size-4" />}>
            Assign Employees
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{selected.size} of {employees.length} employees assigned.</DialogDescription>

        <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
          {employees.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No employees found.</p>
          ) : (
            employees.map((employee) => (
              <label
                key={employee.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={selected.has(employee.id)} onCheckedChange={() => toggle(employee.id)} />
                <span className="flex-1">
                  {employee.personal.firstName} {employee.personal.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{employee.employeeNumber}</span>
              </label>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" isLoading={isSaving} onClick={handleSave}>
            Save Assignments
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
