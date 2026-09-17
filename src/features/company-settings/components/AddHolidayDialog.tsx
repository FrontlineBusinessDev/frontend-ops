import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createHoliday } from '@/lib/services/companyService'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  type: z.enum(['regular', 'special_non_working']),
})

type FormValues = z.infer<typeof schema>

const TYPE_OPTIONS = [
  { value: 'regular', label: 'Regular Holiday' },
  { value: 'special_non_working', label: 'Special Non-Working Day' },
]

export function AddHolidayDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: 'regular' } })

  async function onSubmit(values: FormValues) {
    await createHoliday(user, values)
    notify({ title: 'Holiday added', tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" icon={<Plus className="size-4" />}>
          Add Holiday
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add Company Holiday</DialogTitle>
        <DialogDescription>Holidays affect attendance and payroll calculations.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name')} placeholder="Rizal Day" />
          </FormField>
          <FormField label="Date" required error={errors.date?.message}>
            <Input type="date" {...register('date')} />
          </FormField>
          <FormField label="Type" required>
            <Controller
              control={control}
              name="type"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={TYPE_OPTIONS} />}
            />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add Holiday
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
