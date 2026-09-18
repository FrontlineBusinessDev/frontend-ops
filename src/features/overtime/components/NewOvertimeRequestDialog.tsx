import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createOvertimeRecord } from '@/lib/services/overtimeService'
import type { Employee } from '@/types/domain'

const schema = z.object({
  employeeId: z.string().min(1, 'Select an employee'),
  date: z.string().min(1, 'Required'),
  startTime: z.string().min(1, 'Required'),
  endTime: z.string().min(1, 'Required'),
  type: z.enum(['regular', 'rest_day_holiday', 'night_diff']),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular Overtime (125%)' },
  { value: 'rest_day_holiday', label: 'Rest Day / Holiday OT (130%-200%)' },
  { value: 'night_diff', label: 'Night Differential (110%)' },
]

export function NewOvertimeRequestDialog({ employees, onCreated }: { employees: Employee[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'regular', date: new Date().toISOString().slice(0, 10) },
  })

  async function onSubmit(values: FormValues) {
    await createOvertimeRecord(user, values)
    notify({ title: 'Overtime request logged', description: 'Pending approval.', tone: 'success' })
    reset({ type: 'regular', date: new Date().toISOString().slice(0, 10), employeeId: '', startTime: '', endTime: '', reason: '' })
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<Plus className="size-4" />}>File Request / Log Hours</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>File Overtime / Night Differential Request</DialogTitle>
        <DialogDescription>Manually log hours on behalf of an employee. This will be recorded as pending approval.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Employee" required error={errors.employeeId?.message} className="col-span-2">
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select employee"
                  options={employees.map((e) => ({
                    value: e.id,
                    label: `${e.personal.firstName} ${e.personal.lastName} (${e.employeeNumber})`,
                  }))}
                />
              )}
            />
          </FormField>
          <FormField label="Type" required className="col-span-2">
            <Controller
              control={control}
              name="type"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={TYPE_OPTIONS} />}
            />
          </FormField>
          <FormField label="Date" required error={errors.date?.message} className="col-span-2">
            <Input type="date" {...register('date')} />
          </FormField>
          <FormField label="Start time" required error={errors.startTime?.message}>
            <Input type="time" {...register('startTime')} />
          </FormField>
          <FormField label="End time" required error={errors.endTime?.message}>
            <Input type="time" {...register('endTime')} />
          </FormField>
          <FormField label="Reason / Notes" className="col-span-2">
            <Textarea {...register('reason')} placeholder="e.g. Month-end reporting deadline" />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
