import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createDeductionConfig, updateDeductionConfig } from '@/lib/services/payrollSettingsService'
import type { DeductionConfig } from '@/types/domain'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.enum(['government', 'tax', 'loan', 'other']),
  calcType: z.enum(['fixed', 'variable']),
  recurrence: z.enum(['recurring', 'one_time']),
  allocationMethod: z.enum(['equal_split', 'specific_cutoff', 'custom']),
  specificCutoffPeriod: z.number().min(1),
  customSplitPercentages: z.string(),
})

type FormValues = z.infer<typeof schema>

const CATEGORY_OPTIONS = [
  { value: 'government', label: 'Government Contribution' },
  { value: 'tax', label: 'Tax' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
]

const CALC_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'variable', label: 'Variable' },
]

const RECURRENCE_OPTIONS = [
  { value: 'recurring', label: 'Recurring' },
  { value: 'one_time', label: 'One-time' },
]

const ALLOCATION_METHOD_OPTIONS = [
  { value: 'equal_split', label: 'Equal Split' },
  { value: 'specific_cutoff', label: 'Specific Cutoff' },
  { value: 'custom', label: 'Custom Allocation' },
]

export function DeductionDialog({ deduction, onSaved, trigger }: { deduction?: DeductionConfig; onSaved: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const isEdit = Boolean(deduction)

  const toFormValues = (d?: DeductionConfig): FormValues => ({
    name: d?.name ?? '',
    category: d?.category ?? 'other',
    calcType: d?.calcType ?? 'fixed',
    recurrence: d?.recurrence ?? 'recurring',
    allocationMethod: d?.allocationMethod ?? 'equal_split',
    specificCutoffPeriod: d?.specificCutoffPeriod ?? 2,
    customSplitPercentages: d?.customSplitPercentages?.join(', ') ?? '50, 50',
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(deduction) })

  useEffect(() => {
    if (open) reset(toFormValues(deduction))
  }, [open, deduction, reset])

  const allocationMethod = watch('allocationMethod')

  async function onSubmit(values: FormValues) {
    const input = {
      name: values.name,
      category: values.category,
      calcType: values.calcType,
      recurrence: values.recurrence,
      allocationMethod: values.allocationMethod,
      specificCutoffPeriod: values.allocationMethod === 'specific_cutoff' ? values.specificCutoffPeriod : undefined,
      customSplitPercentages:
        values.allocationMethod === 'custom'
          ? values.customSplitPercentages.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
          : undefined,
    }
    if (isEdit && deduction) {
      await updateDeductionConfig(user, deduction.id, input)
      notify({ title: 'Deduction updated', tone: 'success' })
    } else {
      await createDeductionConfig(user, { ...input, isActive: true })
      notify({ title: 'Deduction added', tone: 'success' })
    }
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add Deduction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit Deduction' : 'Add Deduction'}</DialogTitle>
        <DialogDescription>
          Configuration placeholder only — current SSS/PhilHealth/Pag-IBIG/BIR tables are not calculated here.
        </DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name')} placeholder="Company Loan" />
          </FormField>
          <FormField label="Category">
            <Controller control={control} name="category" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={CATEGORY_OPTIONS} />} />
          </FormField>
          <FormField label="Fixed / Variable">
            <Controller control={control} name="calcType" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={CALC_TYPE_OPTIONS} />} />
          </FormField>
          <FormField label="Recurring / One-time">
            <Controller control={control} name="recurrence" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={RECURRENCE_OPTIONS} />} />
          </FormField>
          <FormField
            label="Monthly Allocation Method"
            hint="How a monthly amount is spread across this employee's Payroll Group periods. Preview only."
            className="col-span-2"
          >
            <Controller
              control={control}
              name="allocationMethod"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={ALLOCATION_METHOD_OPTIONS} />}
            />
          </FormField>
          {allocationMethod === 'specific_cutoff' && (
            <FormField label="Collecting cutoff (1-based period #)" className="col-span-2">
              <Input type="number" min={1} {...register('specificCutoffPeriod', { valueAsNumber: true })} />
            </FormField>
          )}
          {allocationMethod === 'custom' && (
            <FormField
              label="Split percentages, in order (comma-separated, must sum to 100)"
              error={errors.customSplitPercentages?.message}
              className="col-span-2"
            >
              <Input {...register('customSplitPercentages')} placeholder="40, 60" />
            </FormField>
          )}

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
