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
import { COMPLIANCE_CATEGORY_OPTIONS, COMPLIANCE_FREQUENCY_OPTIONS, MONTH_NAMES } from '@/lib/payroll/complianceDeadlines'
import { createComplianceDeadline, updateComplianceDeadline } from '@/lib/services/complianceService'
import type { ComplianceDeadline } from '@/types/domain'

const schema = z
  .object({
    name: z.string().min(1, 'Required'),
    category: z.enum(['SSS', 'PhilHealth', 'Pag-IBIG', 'BIR', 'Payroll', 'Other']),
    description: z.string().min(1, 'Required'),
    frequency: z.enum(['monthly', 'yearly', 'one_time']),
    dueDay: z.number({ error: 'Enter a day from 1 to 31' }).int().min(1, 'Enter a day from 1 to 31').max(31, 'Enter a day from 1 to 31').optional(),
    dueMonth: z.number().int().min(0).max(11).optional(),
    dueDate: z.string().optional(),
    remindDaysBefore: z.number({ error: 'Enter 0 or more days' }).int().min(0, 'Enter 0 or more days').max(365),
  })
  .superRefine((v, ctx) => {
    if (v.frequency === 'one_time' && !v.dueDate) ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Pick a date' })
    if (v.frequency !== 'one_time' && v.dueDay === undefined) ctx.addIssue({ code: 'custom', path: ['dueDay'], message: 'Enter a day from 1 to 31' })
  })

type FormValues = z.infer<typeof schema>

function toFormValues(deadline?: ComplianceDeadline): FormValues {
  return {
    name: deadline?.name ?? '',
    category: deadline?.category ?? 'Other',
    description: deadline?.description ?? '',
    frequency: deadline?.frequency ?? 'yearly',
    dueDay: deadline?.dueDay ?? 1,
    dueMonth: deadline?.dueMonth ?? 0,
    dueDate: deadline?.dueDate ?? '',
    remindDaysBefore: deadline?.remindDaysBefore ?? 7,
  }
}

const MONTH_OPTIONS = MONTH_NAMES.map((name, i) => ({ value: String(i), label: name }))

export function ComplianceDeadlineDialog({ deadline, onSaved, trigger }: { deadline?: ComplianceDeadline; onSaved: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const isEdit = Boolean(deadline)
  // Built-in government deadlines keep their name and category; only the timing and reminder window are editable.
  const locked = Boolean(deadline && !deadline.custom)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(deadline) })

  useEffect(() => {
    if (open) reset(toFormValues(deadline))
  }, [open, deadline, reset])

  const frequency = watch('frequency')

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      category: values.category,
      description: values.description,
      frequency: values.frequency,
      remindDaysBefore: values.remindDaysBefore,
      dueDay: values.frequency === 'one_time' ? undefined : values.dueDay,
      dueMonth: values.frequency === 'yearly' ? values.dueMonth : undefined,
      dueDate: values.frequency === 'one_time' ? values.dueDate : undefined,
    }
    if (deadline) {
      await updateComplianceDeadline(user, deadline.id, payload)
      notify({ title: 'Deadline updated', tone: 'success' })
    } else {
      await createComplianceDeadline(user, { ...payload, enabled: true })
      notify({ title: 'Reminder added', tone: 'success' })
    }
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add Reminder
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>{isEdit ? 'Edit Compliance Deadline' : 'Add Custom Reminder'}</DialogTitle>
        <DialogDescription>Shown on the dashboard&apos;s Reminders card as the due date approaches.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name')} placeholder="Renew Mayor's Permit" disabled={locked} />
          </FormField>
          <FormField label="Category">
            <Controller control={control} name="category" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={COMPLIANCE_CATEGORY_OPTIONS} disabled={locked} />} />
          </FormField>
          <FormField label="Repeats">
            <Controller control={control} name="frequency" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={COMPLIANCE_FREQUENCY_OPTIONS} />} />
          </FormField>

          {frequency === 'one_time' ? (
            <FormField label="Due date" required error={errors.dueDate?.message}>
              <Input type="date" {...register('dueDate')} />
            </FormField>
          ) : (
            <>
              {frequency === 'yearly' && (
                <FormField label="Month">
                  <Controller control={control} name="dueMonth" render={({ field }) => <Select value={String(field.value ?? 0)} onValueChange={(v) => field.onChange(Number(v))} options={MONTH_OPTIONS} />} />
                </FormField>
              )}
              <FormField label="Due day of the month" required error={errors.dueDay?.message} hint="A day the month doesn't have (e.g. 31 in June) falls on the month's last day.">
                <Input type="number" min={1} max={31} {...register('dueDay', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })} />
              </FormField>
            </>
          )}

          <FormField label="Remind me (days before)" required error={errors.remindDaysBefore?.message} hint="The dashboard highlights the reminder from this many days out.">
            <Input type="number" min={0} {...register('remindDaysBefore', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Description" required error={errors.description?.message} className="col-span-2" hint={frequency === 'monthly' ? 'Use {period} to insert the month the remittance covers, e.g. "Remit the {period} SSS premiums."' : undefined}>
            <Textarea {...register('description')} />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Reminder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
