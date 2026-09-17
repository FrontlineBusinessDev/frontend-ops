import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
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
import { inviteUser } from '@/lib/services/userService'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  role: z.enum(['company_admin', 'hr_admin', 'payroll_admin', 'manager', 'employee']),
})

type FormValues = z.infer<typeof schema>

const ROLE_OPTIONS = [
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'payroll_admin', label: 'Payroll Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
]

export function InviteUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'employee' } })

  async function onSubmit(values: FormValues) {
    await inviteUser(user, values)
    notify({ title: 'User invited', description: `${values.name} can now sign in as ${values.role.replace('_', ' ')}.`, tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button icon={<UserPlus className="size-4" />}>Invite User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Invite User</DialogTitle>
        <DialogDescription>Grant access with a role scoped to what they need.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Full name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name')} placeholder="Jane Dela Cruz" />
          </FormField>
          <FormField label="Email" required error={errors.email?.message} className="col-span-2">
            <Input type="email" {...register('email')} placeholder="jane.delacruz@company.com" />
          </FormField>
          <FormField label="Role" required className="col-span-2">
            <Controller
              control={control}
              name="role"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={ROLE_OPTIONS} />}
            />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Send Invite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
