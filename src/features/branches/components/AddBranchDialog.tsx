import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createBranch } from '@/lib/services/branchService'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  isHeadOffice: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function AddBranchDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { isHeadOffice: false } })

  async function onSubmit(values: FormValues) {
    await createBranch(user, values)
    notify({ title: 'Branch added', tone: 'success' })
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" icon={<Plus className="size-4" />}>
          Add Branch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add Branch</DialogTitle>
        <DialogDescription>New branches are immediately available for employee assignment.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <FormField label="Branch name" required error={errors.name?.message}>
            <Input {...register('name')} placeholder="Iloilo Branch" />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Controller
              control={control}
              name="isHeadOffice"
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
            />
            Head office
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add Branch
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
