import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createSchedule } from '@/lib/services/companyService'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  startTime: z.string().min(1, 'Required'),
  endTime: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

export function AddScheduleDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    await createSchedule(user, { ...values, daysOfWeek: [1, 2, 3, 4, 5] })
    notify({ title: 'Schedule added', tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" icon={<Plus className="size-4" />}>
          Add Schedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add Work Schedule</DialogTitle>
        <DialogDescription>Applies Monday to Friday by default.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name')} placeholder="Night Shift" />
          </FormField>
          <FormField label="Start time" required error={errors.startTime?.message}>
            <Input type="time" {...register('startTime')} />
          </FormField>
          <FormField label="End time" required error={errors.endTime?.message}>
            <Input type="time" {...register('endTime')} />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
