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
import { useToast } from '@/components/ui/Toast'
import { BENEFIT_CATEGORY_META, fullName } from '@/features/loans-deductions/loanUtils'
import { useSession } from '@/hooks/useSession'
import { createEmployeeBenefit, updateEmployeeBenefit } from '@/lib/services/benefitsService'
import type { BenefitCategory, Employee, EmployeeBenefit } from '@/types/domain'

const schema = z
  .object({
    employeeId: z.string().min(1, 'Select an employee'),
    name: z.string().min(1, 'Required'),
    provider: z.string().optional(),
    coverage: z.string().optional(),
    monthlyValue: z.number({ error: 'Enter an amount' }).positive('Must be greater than 0'),
    employeeShare: z.number({ error: 'Enter 0 or more' }).min(0, 'Enter 0 or more'),
    startDate: z.string().min(1, 'Required'),
    endDate: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after the start date' })
  })

type FormValues = z.infer<typeof schema>

function toFormValues(benefit?: EmployeeBenefit): FormValues {
  return {
    employeeId: benefit?.employeeId ?? '',
    name: benefit?.name ?? '',
    provider: benefit?.provider ?? '',
    coverage: benefit?.coverage ?? '',
    monthlyValue: benefit?.monthlyValue ?? 0,
    employeeShare: benefit?.employeeShare ?? 0,
    startDate: benefit?.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: benefit?.endDate ?? '',
    notes: benefit?.notes ?? '',
  }
}

export function BenefitDialog({
  category,
  employees,
  benefit,
  onSaved,
  trigger,
}: {
  category: BenefitCategory
  employees: Employee[]
  benefit?: EmployeeBenefit
  onSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const meta = BENEFIT_CATEGORY_META[category]
  const isEdit = Boolean(benefit)
  const isAllowance = category === 'allowance'

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(benefit) })

  useEffect(() => {
    if (open) reset(toFormValues(benefit))
  }, [open, benefit, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      employeeId: values.employeeId,
      category,
      name: values.name,
      provider: isAllowance ? undefined : values.provider?.trim() || undefined,
      coverage: isAllowance ? undefined : values.coverage?.trim() || undefined,
      monthlyValue: values.monthlyValue,
      employeeShare: isAllowance ? 0 : values.employeeShare,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      notes: values.notes?.trim() || undefined,
    }
    if (benefit) {
      await updateEmployeeBenefit(user, benefit.id, payload)
      notify({ title: `${meta.title} updated`, tone: 'success' })
    } else {
      await createEmployeeBenefit(user, payload)
      const employee = employees.find((e) => e.id === values.employeeId)
      notify({ title: `${values.name} added`, description: employee ? `Assigned to ${fullName(employee)}. It will be included in the next payroll run.` : undefined, tone: 'success' })
    }
    setOpen(false)
    onSaved()
  }

  const options = employees
    .filter((e) => e.employment.status === 'active' || e.id === benefit?.employeeId)
    .map((e) => ({ id: e.id, name: fullName(e), employeeNumber: e.employeeNumber, department: e.employment.department }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add {meta.title === 'Other Benefits' ? 'Benefit' : meta.title === 'Allowances' ? 'Allowance' : meta.title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>{isEdit ? `Edit ${meta.singular}` : `Add ${meta.singular}`}</DialogTitle>
        <DialogDescription>{meta.helper}</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Employee" required error={errors.employeeId?.message} className="col-span-2">
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => <EmployeeCombobox employees={options} value={field.value || undefined} onChange={(id) => field.onChange(id ?? '')} placeholder="Select employee" />}
            />
          </FormField>
          <FormField label="Name" required error={errors.name?.message} className={isAllowance ? 'col-span-2' : undefined}>
            <Input {...register('name')} placeholder={meta.namePlaceholder} />
          </FormField>
          {!isAllowance && (
            <FormField label="Provider">
              <Input {...register('provider')} placeholder="e.g. Maxicare" />
            </FormField>
          )}
          {!isAllowance && (
            <FormField label="Plan / coverage" className="col-span-2">
              <Input {...register('coverage')} placeholder="e.g. HMO Plan B (Employee + 1 dependent)" />
            </FormField>
          )}
          <FormField
            label={isAllowance ? 'Monthly amount (PHP)' : 'Company-paid value per month (PHP)'}
            required
            error={errors.monthlyValue?.message}
            className={isAllowance ? 'col-span-2' : undefined}
          >
            <Input type="number" step="0.01" {...register('monthlyValue', { valueAsNumber: true })} />
          </FormField>
          {!isAllowance && (
            <FormField label="Employee share per month (PHP)" error={errors.employeeShare?.message} hint="Deducted from pay. Leave 0 if the company covers it fully.">
              <Input type="number" step="0.01" {...register('employeeShare', { valueAsNumber: true })} />
            </FormField>
          )}
          <FormField label="Start date" required error={errors.startDate?.message}>
            <Input type="date" {...register('startDate')} />
          </FormField>
          <FormField label="End date" error={errors.endDate?.message} hint="Optional — leave empty if open-ended.">
            <Input type="date" {...register('endDate')} />
          </FormField>
          <FormField label="Notes" className="col-span-2">
            <Textarea {...register('notes')} />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : `Add ${meta.title === 'Other Benefits' ? 'Benefit' : meta.title === 'Allowances' ? 'Allowance' : meta.title}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
