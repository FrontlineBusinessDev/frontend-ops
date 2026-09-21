import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createPayrollGroup, updatePayrollGroup } from '@/lib/services/payrollSettingsService'
import type { CompensationType, PayrollFrequency, PayrollGroup, Schedule } from '@/types/domain'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'semi_monthly', 'monthly', 'custom']),
  cutoffSchedule: z.string().min(1, 'Required'),
  payDates: z.string().min(1, 'Required'),
  compensationTypeId: z.string().optional(),
  workScheduleId: z.string().optional(),
  effectiveDate: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

const FREQUENCY_OPTIONS: { value: PayrollFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'semi_monthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
]

const FREQUENCY_DEFAULTS: Record<PayrollFrequency, { cutoffSchedule: string; payDates: string }> = {
  weekly: { cutoffSchedule: 'Monday – Sunday', payDates: 'Following Friday' },
  biweekly: { cutoffSchedule: 'Every 2 weeks, Monday – Sunday', payDates: 'Following Friday' },
  semi_monthly: { cutoffSchedule: 'Period 1: 1st – 15th · Period 2: 16th – End of Month', payDates: '15th & 30th' },
  monthly: { cutoffSchedule: '1st – End of Month', payDates: 'Last working day of the month' },
  custom: { cutoffSchedule: '', payDates: '' },
}

function toFormValues(group?: PayrollGroup): FormValues {
  return {
    name: group?.name ?? '',
    description: group?.description ?? '',
    frequency: group?.frequency ?? 'semi_monthly',
    cutoffSchedule: group?.cutoffSchedule ?? FREQUENCY_DEFAULTS.semi_monthly.cutoffSchedule,
    payDates: group?.payDates ?? FREQUENCY_DEFAULTS.semi_monthly.payDates,
    compensationTypeId: group?.compensationTypeId ?? '',
    workScheduleId: group?.workScheduleId ?? '',
    effectiveDate: group?.effectiveDate ?? new Date().toISOString().slice(0, 10),
  }
}

export function PayrollGroupDialog({
  group,
  compensationTypes,
  schedules,
  onSaved,
  trigger,
}: {
  group?: PayrollGroup
  compensationTypes: CompensationType[]
  schedules: Schedule[]
  onSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const isEdit = Boolean(group)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(group) })

  useEffect(() => {
    if (open) reset(toFormValues(group))
  }, [open, group, reset])

  const frequency = watch('frequency')

  function handleFrequencyChange(value: PayrollFrequency) {
    setValue('frequency', value)
    const defaults = FREQUENCY_DEFAULTS[value]
    setValue('cutoffSchedule', defaults.cutoffSchedule)
    setValue('payDates', defaults.payDates)
  }

  async function onSubmit(values: FormValues) {
    if (isEdit && group) {
      await updatePayrollGroup(user, group.id, values)
      notify({ title: 'Payroll group updated', tone: 'success' })
    } else {
      await createPayrollGroup(user, { ...values, status: 'active' })
      notify({ title: 'Payroll group created', tone: 'success' })
    }
    setOpen(false)
    onSaved()
  }

  const compensationOptions = [{ value: '', label: 'None' }, ...compensationTypes.map((c) => ({ value: c.id, label: c.name }))]
  const scheduleOptions = [{ value: '', label: 'None' }, ...schedules.map((s) => ({ value: s.id, label: s.name }))]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add Payroll Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>{isEdit ? 'Edit Payroll Group' : 'Add Payroll Group'}</DialogTitle>
        <DialogDescription>Defines how and when this group of employees is processed for payroll.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Group name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name')} placeholder="Monthly Admin Payroll" />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea {...register('description')} />
          </FormField>
          <FormField label="Payroll frequency" required>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => handleFrequencyChange(v as PayrollFrequency)} options={FREQUENCY_OPTIONS} />
              )}
            />
          </FormField>
          <FormField label="Effective date" required error={errors.effectiveDate?.message}>
            <Input type="date" {...register('effectiveDate')} />
          </FormField>
          <FormField label="Cutoff schedule" required error={errors.cutoffSchedule?.message} className="col-span-2">
            <Input {...register('cutoffSchedule')} />
          </FormField>
          <FormField label="Pay dates" required error={errors.payDates?.message} className="col-span-2">
            <Input {...register('payDates')} />
          </FormField>
          <FormField label="Default compensation type">
            <Controller
              control={control}
              name="compensationTypeId"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={compensationOptions} />}
            />
          </FormField>
          <FormField label="Work schedule">
            <Controller
              control={control}
              name="workScheduleId"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={scheduleOptions} />}
            />
          </FormField>
          <p className="col-span-2 -mt-1 text-xs text-muted-foreground">Selected frequency: {frequency.replace('_', ' ')}</p>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Payroll Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
