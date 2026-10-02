import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { DAY_LABELS, TONE_OPTIONS, WEEK_ORDER } from '@/features/schedules/scheduleUi'
import { useSession } from '@/hooks/useSession'
import { createShiftTemplate, setTemplateEmployees, updateShiftTemplate } from '@/lib/services/scheduleService'
import type { Employee, ShiftTemplate, ShiftTone, ShiftType } from '@/types/domain'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  startTime: z.string().min(1, 'Required'),
  endTime: z.string().min(1, 'Required'),
  breakMinutes: z.number().min(0),
  shiftType: z.enum(['day', 'night', 'split', 'flexible']),
  gracePeriodMinutes: z.number().min(0),
  tone: z.enum(['accent', 'warning', 'purple', 'success']),
  daysOfWeek: z.array(z.number()).min(1, 'Select at least one working day'),
})

type FormValues = z.infer<typeof schema>

const SHIFT_TYPE_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: 'day', label: 'Day shift' },
  { value: 'night', label: 'Night shift' },
  { value: 'split', label: 'Split shift' },
  { value: 'flexible', label: 'Flexible hours' },
]

function toFormValues(template?: ShiftTemplate): FormValues {
  return {
    name: template?.name ?? '',
    startTime: template?.startTime ?? '09:00',
    endTime: template?.endTime ?? '18:00',
    breakMinutes: template?.breakMinutes ?? 60,
    shiftType: template?.shiftType ?? 'day',
    gracePeriodMinutes: template?.gracePeriodMinutes ?? 10,
    tone: template?.tone ?? 'accent',
    daysOfWeek: template?.daysOfWeek ?? [1, 2, 3, 4, 5],
  }
}

/** Create or edit a shift template, including who follows it on days without an individual assignment. */
export function ShiftTemplateDialog({
  template,
  employees,
  onSaved,
  trigger,
}: {
  template?: ShiftTemplate
  employees: Employee[]
  onSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [followers, setFollowers] = useState<string[]>([])
  const { user } = useSession()
  const { notify } = useToast()
  const isEdit = Boolean(template)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(template) })

  useEffect(() => {
    if (open) {
      reset(toFormValues(template))
      setFollowers(template?.assignedEmployeeIds ?? [])
    }
  }, [open, template, reset])

  const daysOfWeek = watch('daysOfWeek')
  const options = useMemo(
    () =>
      employees
        .filter((e) => e.employment.status === 'active')
        .map((e) => ({ id: e.id, name: `${e.personal.firstName} ${e.personal.lastName}`, employeeNumber: e.employeeNumber, department: e.employment.department })),
    [employees],
  )

  function toggleDay(day: number) {
    setValue('daysOfWeek', daysOfWeek.includes(day) ? daysOfWeek.filter((d) => d !== day) : [...daysOfWeek, day].sort(), { shouldValidate: true })
  }

  async function onSubmit(values: FormValues) {
    const input = { ...values, tone: values.tone as ShiftTone }
    let id = template?.id
    if (isEdit && template) {
      await updateShiftTemplate(user, template.id, input)
    } else {
      id = (await createShiftTemplate(user, input)).id
    }
    if (id) await setTemplateEmployees(user, id, followers)
    notify({ title: isEdit ? 'Shift template updated' : 'Shift template added', tone: 'success' })
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add Shift Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>{isEdit ? 'Edit shift template' : 'Add shift template'}</DialogTitle>
        <DialogDescription>A reusable shift — hours, working days and grace period. Assign it to people from the Roster.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Template name" required error={errors.name?.message} className="col-span-2">
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
          <FormField label="Shift type">
            <Controller control={control} name="shiftType" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={SHIFT_TYPE_OPTIONS} />} />
          </FormField>
          <FormField label="Roster color">
            <Controller control={control} name="tone" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={TONE_OPTIONS} />} />
          </FormField>

          <div className="col-span-2">
            <p className="mb-2 text-xs font-semibold text-foreground">Working days</p>
            <div className="flex flex-wrap gap-3">
              {WEEK_ORDER.map((day) => (
                <label key={day} className="flex items-center gap-1.5 text-sm">
                  <Checkbox checked={daysOfWeek.includes(day)} onCheckedChange={() => toggleDay(day)} />
                  {DAY_LABELS[day]}
                </label>
              ))}
            </div>
            {errors.daysOfWeek && <p className="mt-1 text-xs text-danger">{errors.daysOfWeek.message}</p>}
          </div>

          <div className="col-span-2">
            <p className="mb-1 text-xs font-semibold text-foreground">Employees who follow this template</p>
            <EmployeeCombobox multiple employees={options} value={followers} onChange={setFollowers} placeholder="Search employees…" />
            <p className="mt-1 text-xs text-muted-foreground">They work these days and rest on the others, unless a day is assigned individually. Each employee follows one template.</p>
          </div>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
