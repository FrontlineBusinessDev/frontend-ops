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
import { createLoanType, updateLoanType } from '@/lib/services/loanTypeService'
import type { LoanTypeConfig } from '@/types/domain'

const PROVIDER_OPTIONS = [
  { value: 'Company', label: 'Company' },
  { value: 'SSS', label: 'SSS' },
  { value: 'Pag-IBIG', label: 'Pag-IBIG' },
  { value: 'Other', label: 'Other' },
]

const schema = z.object({
  label: z.string().trim().min(1, 'Required'),
  provider: z.enum(['SSS', 'Pag-IBIG', 'Company', 'Other']),
  description: z.string().trim().min(1, 'Required'),
  typicalTerm: z.string().trim().min(1, 'Required'),
  typicalAmount: z.string().trim().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

function toFormValues(type?: LoanTypeConfig): FormValues {
  return {
    label: type?.label ?? '',
    provider: type?.provider ?? 'Company',
    description: type?.description ?? '',
    typicalTerm: type?.typicalTerm ?? '',
    typicalAmount: type?.typicalAmount ?? '',
  }
}

export function LoanTypeDialog({ type, existing, onSaved, trigger }: { type?: LoanTypeConfig; existing: LoanTypeConfig[]; onSaved: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [duplicate, setDuplicate] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const isEdit = Boolean(type)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(type) })

  useEffect(() => {
    if (open) {
      reset(toFormValues(type))
      setDuplicate(false)
    }
  }, [open, type, reset])

  async function onSubmit(values: FormValues) {
    const taken = existing.some((t) => t.id !== type?.id && t.label.trim().toLowerCase() === values.label.toLowerCase())
    if (taken) {
      setDuplicate(true)
      return
    }
    if (type) {
      await updateLoanType(user, type.id, values)
      notify({ title: 'Loan type updated', tone: 'success' })
    } else {
      await createLoanType(user, values)
      notify({ title: `${values.label} added`, description: 'It’s now available when adding an employee loan.', tone: 'success' })
    }
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add Loan Type
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>{isEdit ? 'Edit loan type' : 'Add loan type'}</DialogTitle>
        <DialogDescription>
          {type?.builtIn
            ? 'Built-in types keep their provider and payroll setting; you can change how they’re described.'
            : 'Custom loan types are collected through payroll like a Company Loan, following that entry in Company & Payroll Settings → Deductions.'}
        </DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Loan type name" required error={errors.label?.message ?? (duplicate ? 'A loan type with this name already exists' : undefined)} className="col-span-2">
            <Input {...register('label', { onChange: () => setDuplicate(false) })} placeholder="e.g. Salary Advance" />
          </FormField>
          <FormField label="Provider" className="col-span-2">
            <Controller control={control} name="provider" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={PROVIDER_OPTIONS} disabled={type?.builtIn} />} />
          </FormField>
          <FormField label="Description" required error={errors.description?.message} className="col-span-2">
            <Textarea {...register('description')} />
          </FormField>
          <FormField label="Typical term" required error={errors.typicalTerm?.message}>
            <Input {...register('typicalTerm')} placeholder="e.g. 6 months" />
          </FormField>
          <FormField label="Typical amount" required error={errors.typicalAmount?.message}>
            <Input {...register('typicalAmount')} placeholder="e.g. Up to 1 month of basic pay" />
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Loan Type'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
