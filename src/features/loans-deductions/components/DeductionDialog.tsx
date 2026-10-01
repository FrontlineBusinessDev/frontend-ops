import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useDeductionConfigs } from '@/features/loans-deductions/hooks/useBenefitsDeductions'
import { fullName } from '@/features/loans-deductions/loanUtils'
import { useSession } from '@/hooks/useSession'
import { createEmployeeDeduction, updateEmployeeDeduction } from '@/lib/services/benefitsService'
import type { Employee, EmployeeDeduction, EmployeeDeductionKind } from '@/types/domain'

const schema = z
  .object({
    employeeId: z.string().min(1, 'Select an employee'),
    name: z.string().min(1, 'Required'),
    kind: z.enum(['recurring', 'one_time']),
    amount: z.number({ error: 'Enter an amount' }).positive('Must be greater than 0'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    dueDate: z.string().optional(),
    reason: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'recurring' && !v.startDate) ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Required' })
    if (v.kind === 'recurring' && v.startDate && v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after the start date' })
    if (v.kind === 'one_time' && !v.dueDate) ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Required' })
  })

type FormValues = z.infer<typeof schema>

const KIND_OPTIONS = [
  { value: 'recurring', label: 'Recurring (monthly)' },
  { value: 'one_time', label: 'One-time' },
]

function toFormValues(deduction: EmployeeDeduction | undefined, kind: EmployeeDeductionKind): FormValues {
  const today = new Date().toISOString().slice(0, 10)
  return {
    employeeId: deduction?.employeeId ?? '',
    name: deduction?.name ?? '',
    kind: deduction?.kind ?? kind,
    amount: deduction?.amount ?? 0,
    startDate: deduction?.startDate ?? today,
    endDate: deduction?.endDate ?? '',
    dueDate: deduction?.dueDate ?? today,
    reason: deduction?.reason ?? '',
  }
}

/** Adds or edits a recurring/one-time deduction. `lockedKind` fixes the type when opened from the Recurring or One-time tab. */
export function DeductionDialog({
  employees,
  deduction,
  lockedKind,
  onSaved,
  trigger,
}: {
  employees: Employee[]
  deduction?: EmployeeDeduction
  lockedKind?: EmployeeDeductionKind
  onSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const configs = useDeductionConfigs()
  const isEdit = Boolean(deduction)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(deduction, lockedKind ?? 'recurring') })

  useEffect(() => {
    if (open) reset(toFormValues(deduction, lockedKind ?? 'recurring'))
  }, [open, deduction, lockedKind, reset])

  const kind = watch('kind')

  async function onSubmit(values: FormValues) {
    const today = new Date().toISOString().slice(0, 10)
    const payload = {
      employeeId: values.employeeId,
      name: values.name,
      kind: values.kind,
      amount: values.amount,
      startDate: values.kind === 'recurring' ? (values.startDate as string) : (values.startDate ?? today),
      endDate: values.kind === 'recurring' ? values.endDate || undefined : undefined,
      dueDate: values.kind === 'one_time' ? values.dueDate : undefined,
      reason: values.reason?.trim() || undefined,
    }
    if (deduction) {
      await updateEmployeeDeduction(user, deduction.id, payload)
      notify({ title: 'Deduction updated', tone: 'success' })
    } else {
      await createEmployeeDeduction(user, payload)
      const employee = employees.find((e) => e.id === values.employeeId)
      notify({ title: `${values.name} added`, description: employee ? `Will be deducted from ${fullName(employee)} in the matching payroll run.` : undefined, tone: 'success' })
    }
    setOpen(false)
    onSaved()
  }

  const options = employees
    .filter((e) => e.employment.status === 'active' || e.id === deduction?.employeeId)
    .map((e) => ({ id: e.id, name: fullName(e), employeeNumber: e.employeeNumber, department: e.employment.department }))
  const suggestions = configs.filter((c) => c.category === 'other' && c.isActive).map((c) => c.name)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add {lockedKind === 'recurring' ? 'Recurring' : lockedKind === 'one_time' ? 'One-time' : ''} Deduction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>{isEdit ? 'Edit deduction' : 'Add deduction'}</DialogTitle>
        <DialogDescription>
          {kind === 'recurring'
            ? 'A monthly amount, split across the month’s pay runs, until it ends or is cancelled.'
            : 'Taken in full in the pay run whose period includes the due date.'}
        </DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Employee" required error={errors.employeeId?.message} className="col-span-2">
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => <EmployeeCombobox employees={options} value={field.value || undefined} onChange={(id) => field.onChange(id ?? '')} placeholder="Select employee" />}
            />
          </FormField>
          <FormField label="Deduction name" required error={errors.name?.message} className={lockedKind ? 'col-span-2' : undefined}>
            <Input {...register('name')} list="deduction-name-suggestions" placeholder="e.g. Cooperative Savings" />
            <datalist id="deduction-name-suggestions">
              {suggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </FormField>
          {!lockedKind && (
            <FormField label="Type">
              <Controller control={control} name="kind" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={KIND_OPTIONS} />} />
            </FormField>
          )}
          <FormField label={kind === 'recurring' ? 'Amount per month (PHP)' : 'Amount (PHP)'} required error={errors.amount?.message}>
            <Input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
          </FormField>
          {kind === 'recurring' ? (
            <>
              <FormField label="Start date" required error={errors.startDate?.message}>
                <Input type="date" {...register('startDate')} />
              </FormField>
              <FormField label="End date" error={errors.endDate?.message} hint="Optional — leave empty if open-ended." className="col-span-2">
                <Input type="date" {...register('endDate')} />
              </FormField>
            </>
          ) : (
            <FormField label="Due date" required error={errors.dueDate?.message}>
              <Input type="date" {...register('dueDate')} />
            </FormField>
          )}
          <FormField label="Reason / notes" className="col-span-2">
            <Textarea {...register('reason')} />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Deduction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
