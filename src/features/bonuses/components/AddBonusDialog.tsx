import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createBonus } from '@/lib/services/bonusService'
import type { Employee } from '@/types/domain'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  bonusType: z.enum(['fixed_amount', 'percentage', 'performance_based', 'output_based']),
  targetType: z.enum(['employee', 'department', 'company']),
  targetEmployeeId: z.string().optional(),
  targetDepartment: z.string().optional(),
  amount: z.number().positive('Must be greater than 0'),
  periodLabel: z.string().min(1, 'Required'),
  taxable: z.enum(['taxable', 'non_taxable']),
  frequency: z.enum(['one_time', 'recurring']),
  notes: z.string().optional(),
  saveAsDraft: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const BONUS_TYPE_OPTIONS = [
  { value: 'fixed_amount', label: 'Fixed Amount (₱)' },
  { value: 'percentage', label: 'Percentage (%) of monthly basic pay' },
  { value: 'performance_based', label: 'Performance-Based' },
  { value: 'output_based', label: 'Output-Based' },
]

const TARGET_TYPE_OPTIONS = [
  { value: 'company', label: 'All Employees (Company-wide)' },
  { value: 'department', label: 'Employee Group / Department' },
  { value: 'employee', label: 'Individual Employee' },
]

const TAXABLE_OPTIONS = [
  { value: 'non_taxable', label: 'Non-Taxable' },
  { value: 'taxable', label: 'Taxable' },
]

const FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'One-time' },
  { value: 'recurring', label: 'Recurring' },
]

export function AddBonusDialog({ employees, departments, onCreated }: { employees: Employee[]; departments: string[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bonusType: 'fixed_amount', targetType: 'company', taxable: 'non_taxable', frequency: 'one_time', saveAsDraft: false },
  })
  const targetType = watch('targetType')

  async function onSubmit(values: FormValues) {
    await createBonus(user, {
      name: values.name,
      bonusType: values.bonusType,
      targetType: values.targetType,
      targetEmployeeId: values.targetType === 'employee' ? values.targetEmployeeId : undefined,
      targetDepartment: values.targetType === 'department' ? values.targetDepartment : undefined,
      amount: values.amount,
      periodLabel: values.periodLabel,
      taxable: values.taxable === 'taxable',
      frequency: values.frequency,
      notes: values.notes,
      status: values.saveAsDraft ? 'draft' : 'pending',
    })
    notify({ title: `Bonus/Incentive ${values.saveAsDraft ? 'saved as draft' : 'submitted for approval'}`, tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<Plus className="size-4" />}>New Bonus/Incentive</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle>New Bonus / Incentive</DialogTitle>
        <DialogDescription>Configure a non-regular earning before it's routed for approval and payroll integration.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Bonus Name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name')} placeholder="Christmas Bonus" />
          </FormField>

          <FormField label="Bonus Type" required>
            <Controller control={control} name="bonusType" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={BONUS_TYPE_OPTIONS} />} />
          </FormField>

          <FormField label={watch('bonusType') === 'percentage' ? 'Rate (%)' : 'Amount (₱)'} required error={errors.amount?.message}>
            <Input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
          </FormField>

          <FormField label="Target Recipient" required className="col-span-2">
            <Controller control={control} name="targetType" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={TARGET_TYPE_OPTIONS} />} />
          </FormField>

          {targetType === 'department' && (
            <FormField label="Department" required error={errors.targetDepartment?.message} className="col-span-2">
              <Controller
                control={control}
                name="targetDepartment"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} placeholder="Select department" options={departments.map((d) => ({ value: d, label: d }))} />
                )}
              />
            </FormField>
          )}

          {targetType === 'employee' && (
            <FormField label="Employee" required error={errors.targetEmployeeId?.message} className="col-span-2">
              <Controller
                control={control}
                name="targetEmployeeId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select employee"
                    options={employees.map((e) => ({ value: e.id, label: `${e.personal.firstName} ${e.personal.lastName}` }))}
                  />
                )}
              />
            </FormField>
          )}

          <FormField label="Effective Payroll Period" required error={errors.periodLabel?.message}>
            <Input {...register('periodLabel')} placeholder="December 2026" />
          </FormField>
          <FormField label="Frequency" required>
            <Controller control={control} name="frequency" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={FREQUENCY_OPTIONS} />} />
          </FormField>

          <FormField label="Taxability Classification" required className="col-span-2">
            <Controller control={control} name="taxable" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={TAXABLE_OPTIONS} />} />
          </FormField>
          {watch('taxable') === 'non_taxable' && (
            <p className="col-span-2 -mt-2 text-xs text-warning">
              Note: under BIR rules, non-taxable bonuses/13th-month-type pay beyond ₱90,000 combined per year become taxable on the excess. Verify against company policy.
            </p>
          )}

          <FormField label="Notes / Justification" className="col-span-2">
            <Textarea {...register('notes')} placeholder="Reason for this bonus/incentive…" />
          </FormField>

          <label className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Controller control={control} name="saveAsDraft" render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />} />
            Save as Draft (skip submitting for approval for now)
          </label>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {watch('saveAsDraft') ? 'Save as Draft' : 'Submit for Approval'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
