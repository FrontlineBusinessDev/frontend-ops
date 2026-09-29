import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { fullName } from '@/features/branches/branchUtils'
import { EmployeeMultiPicker } from '@/features/branches/components/EmployeeMultiPicker'
import { useSession } from '@/hooks/useSession'
import { createBranch } from '@/lib/services/branchService'
import type { Branch, Employee } from '@/types/domain'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  code: z.string().optional(),
  isHeadOffice: z.boolean(),
  address: z.string().optional(),
  city: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z.union([z.literal(''), z.string().email('Enter a valid email')]).optional(),
  openedDate: z.string().optional(),
  managerEmployeeId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = { name: '', code: '', isHeadOffice: false, address: '', city: '', contactNumber: '', email: '', openedDate: '', managerEmployeeId: '' }

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border-b border-border pb-1.5">
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Add Branch — details, contact info, and bulk assignment/transfer of employees in one step. */
export function AddBranchDialog({ employees, branches, onCreated }: { employees: Employee[]; branches: Branch[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })
  const managerId = watch('managerEmployeeId')

  // Archived employees can't be assigned.
  const candidates = employees.filter((e) => e.employment.status !== 'archived')
  const selectedEmployees = candidates.filter((e) => employeeIds.includes(e.id))
  const managerOptions = selectedEmployees.map((e) => ({ value: e.id, label: `${fullName(e)} · ${e.employment.position}` }))

  function handleEmployeesChange(ids: string[]) {
    setEmployeeIds(ids)
    // The manager must be one of the branch's employees.
    if (managerId && !ids.includes(managerId)) setValue('managerEmployeeId', '')
  }

  function close(next: boolean) {
    setOpen(next)
    if (!next) {
      reset(DEFAULTS)
      setEmployeeIds([])
    }
  }

  async function onSubmit(values: FormValues) {
    // Count transfers before the move (afterwards every selected employee belongs to the new branch).
    const transfers = selectedEmployees.filter((e) => branches.some((b) => b.id === e.branchId)).length
    const clean = (v?: string) => (v?.trim() ? v.trim() : undefined)
    const branch = await createBranch(user, {
      name: values.name.trim(),
      isHeadOffice: values.isHeadOffice,
      code: clean(values.code),
      address: clean(values.address),
      city: clean(values.city),
      contactNumber: clean(values.contactNumber),
      email: clean(values.email),
      openedDate: clean(values.openedDate),
      managerEmployeeId: clean(values.managerEmployeeId),
      employeeIds,
    })
    notify({
      title: 'Branch added',
      description: employeeIds.length
        ? `${branch.name} created with ${employeeIds.length} employee(s)${transfers ? ` · ${transfers} transferred from other branches` : ''}.`
        : `${branch.name} is ready — assign employees anytime from its card.`,
      tone: 'success',
    })
    close(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button size="sm" icon={<Plus className="size-4" />}>
          Add Branch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Add Branch</DialogTitle>
        <DialogDescription>Set up the branch and assign its employees in one step. Employees can also be assigned or transferred later.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
          <div className="space-y-3">
            <SectionTitle title="Branch Details" />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Branch name" required error={errors.name?.message}>
                <Input {...register('name')} placeholder="Iloilo Branch" />
              </FormField>
              <FormField label="Branch code">
                <Input {...register('code')} placeholder="FL-ILO-01" />
              </FormField>
              <FormField label="Date opened">
                <Input type="date" {...register('openedDate')} />
              </FormField>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <Controller control={control} name="isHeadOffice" render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />} />
                Head office
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle title="Address & Contact" />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Street address" className="sm:col-span-2">
                <Input {...register('address')} placeholder="2F Atrium Building, General Luna Street" />
              </FormField>
              <FormField label="City / Province">
                <Input {...register('city')} placeholder="Iloilo City, Iloilo" />
              </FormField>
              <FormField label="Contact number">
                <Input {...register('contactNumber')} placeholder="(033) 320 1234" />
              </FormField>
              <FormField label="Branch email" error={errors.email?.message} className="sm:col-span-2">
                <Input type="email" {...register('email')} placeholder="iloilo@company.com.ph" />
              </FormField>
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle title="Assign Employees" hint="Pick unassigned employees or transfer existing ones from other branches — select as many as you need." />
            <EmployeeMultiPicker employees={candidates} branches={branches} value={employeeIds} onChange={handleEmployeesChange} maxHeightClass="max-h-56" />
            <FormField label="Branch manager" hint={managerOptions.length ? 'Chosen from the employees assigned above.' : 'Select employees above to choose a manager.'}>
              <Controller
                control={control}
                name="managerEmployeeId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange} options={managerOptions} placeholder="No manager yet" disabled={managerOptions.length === 0} />
                )}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {employeeIds.length ? `Add Branch & Assign ${employeeIds.length}` : 'Add Branch'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
