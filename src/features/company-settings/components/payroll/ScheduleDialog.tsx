import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createSchedule, updateSchedule } from '@/lib/services/companyService'
import type { Schedule, ShiftType } from '@/types/domain'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const schema = z.object({
  name: z.string().min(1, 'Required'),
  startTime: z.string().min(1, 'Required'),
  endTime: z.string().min(1, 'Required'),
  breakMinutes: z.number().min(0),
  shiftType: z.enum(['day', 'night', 'split', 'flexible']),
  gracePeriodMinutes: z.number().min(0),
  daysOfWeek: z.array(z.number()).min(1, 'Select at least one working day'),
})

type FormValues = z.infer<typeof schema>

const SHIFT_TYPE_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: 'day', label: 'Day Shift' },
  { value: 'night', label: 'Night Shift' },
  { value: 'split', label: 'Split Shift' },
  { value: 'flexible', label: 'Flexible' },
]

function toFormValues(schedule?: Schedule): FormValues {
  return {
    name: schedule?.name ?? '',
    startTime: schedule?.startTime ?? '09:00',
    endTime: schedule?.endTime ?? '18:00',
    breakMinutes: schedule?.breakMinutes ?? 60,
    shiftType: schedule?.shiftType ?? 'day',
    gracePeriodMinutes: schedule?.gracePeriodMinutes ?? 10,
    daysOfWeek: schedule?.daysOfWeek ?? [1, 2, 3, 4, 5],
  }
}

export function ScheduleDialog({ schedule, onSaved, trigger }: { schedule?: Schedule; onSaved: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const isEdit = Boolean(schedule)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(schedule) })

  useEffect(() => {
    if (open) reset(toFormValues(schedule))
  }, [open, schedule, reset])

  const daysOfWeek = watch('daysOfWeek')
  const restDays = DAY_LABELS.map((_, i) => i).filter((d) => !daysOfWeek.includes(d))

  function toggleDay(day: number) {
    setValue('daysOfWeek', daysOfWeek.includes(day) ? daysOfWeek.filter((d) => d !== day) : [...daysOfWeek, day].sort())
  }

  async function onSubmit(values: FormValues) {
    const input = { ...values, restDays }
    if (isEdit && schedule) {
      await updateSchedule(user, schedule.id, input)
      notify({ title: 'Work schedule updated', tone: 'success' })
    } else {
      await createSchedule(user, input)
      notify({ title: 'Work schedule added', tone: 'success' })
    }
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add Work Schedule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>{isEdit ? 'Edit Work Schedule' : 'Add Work Schedule'}</DialogTitle>
        <DialogDescription>Work schedules are separate from Payroll Groups and can be assigned to employees.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Schedule name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name')} placeholder="Night Shift" />
          </FormField>
          <FormField label="Start time" required error={errors.startTime?.message}>
            <Input type="time" {...register('startTime')} />
          </FormField>
          <FormField label="End time" required error={errors.endTime?.message}>
            <Input type="time" {...register('endTime')} />
          </FormField>
          <FormField label="Break (minutes)">
            <Input type="number" min={0} {...register('breakMinutes', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Grace period (minutes)">
            <Input type="number" min={0} {...register('gracePeriodMinutes', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Shift" className="col-span-2">
            <Controller control={control} name="shiftType" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={SHIFT_TYPE_OPTIONS} />} />
          </FormField>

          <div className="col-span-2">
            <p className="mb-2 text-xs font-semibold text-foreground">Working days</p>
            <div className="flex flex-wrap gap-3">
              {DAY_LABELS.map((label, day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={daysOfWeek.includes(day)} onCheckedChange={() => toggleDay(day)} />
                  {label}
                </label>
              ))}
            </div>
            {errors.daysOfWeek && <p className="mt-1 text-xs text-danger">{errors.daysOfWeek.message}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              Rest days: {restDays.length ? restDays.map((d) => DAY_LABELS[d]).join(', ') : 'None'}
            </p>
          </div>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Work Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
