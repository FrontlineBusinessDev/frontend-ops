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
import { createPayrollPeriod } from '@/lib/services/payrollService'

const schema = z.object({
  label: z.string().min(1, 'Required'),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().min(1, 'Required'),
  payDate: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

export function CreatePeriodDialog({ onCreated }: { onCreated: () => void }) {
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
    await createPayrollPeriod(user, values)
    notify({ title: 'Payroll period created', tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<Plus className="size-4" />}>New Payroll Period</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>New Payroll Period</DialogTitle>
        <DialogDescription>Define the period before running payroll calculations.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Label" required error={errors.label?.message} className="col-span-2">
            <Input {...register('label')} placeholder="Sep 16 – 30, 2026" />
          </FormField>
          <FormField label="Start date" required error={errors.startDate?.message}>
            <Input type="date" {...register('startDate')} />
          </FormField>
          <FormField label="End date" required error={errors.endDate?.message}>
            <Input type="date" {...register('endDate')} />
          </FormField>
          <FormField label="Pay date" required error={errors.payDate?.message}>
            <Input type="date" {...register('payDate')} />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Period
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
