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
import { createEarningConfig, updateEarningConfig } from '@/lib/services/payrollSettingsService'
import type { EarningConfig } from '@/types/domain'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  calcType: z.enum(['fixed', 'variable']),
  taxable: z.boolean(),
  includedInPayroll: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const CATEGORY_OPTIONS = [
  { value: 'Basic Pay', label: 'Basic Pay' },
  { value: 'Allowance', label: 'Allowance' },
  { value: 'Overtime', label: 'Overtime' },
  { value: 'Night Differential', label: 'Night Differential' },
  { value: 'Bonus', label: 'Bonus' },
  { value: 'Commission', label: 'Commission' },
  { value: 'Output-Based Earnings', label: 'Output-Based Earnings' },
]

const CALC_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'variable', label: 'Variable' },
]

export function EarningDialog({ earning, onSaved, trigger }: { earning?: EarningConfig; onSaved: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const isEdit = Boolean(earning)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: earning?.name ?? '',
      category: earning?.category ?? 'Allowance',
      calcType: earning?.calcType ?? 'fixed',
      taxable: earning?.taxable ?? true,
      includedInPayroll: earning?.includedInPayroll ?? true,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: earning?.name ?? '',
        category: earning?.category ?? 'Allowance',
        calcType: earning?.calcType ?? 'fixed',
        taxable: earning?.taxable ?? true,
        includedInPayroll: earning?.includedInPayroll ?? true,
      })
    }
  }, [open, earning, reset])

  async function onSubmit(values: FormValues) {
    if (isEdit && earning) {
      await updateEarningConfig(user, earning.id, values)
      notify({ title: 'Earning updated', tone: 'success' })
    } else {
      await createEarningConfig(user, { ...values, isActive: true })
      notify({ title: 'Earning added', tone: 'success' })
    }
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add Earning
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit Earning' : 'Add Earning'}</DialogTitle>
        <DialogDescription>Configuration only — tax calculations are not performed here.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name')} placeholder="Meal Allowance" />
          </FormField>
          <FormField label="Category">
            <Controller control={control} name="category" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={CATEGORY_OPTIONS} />} />
          </FormField>
          <FormField label="Fixed / Variable">
            <Controller control={control} name="calcType" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={CALC_TYPE_OPTIONS} />} />
          </FormField>
          <label className="col-span-1 flex items-center gap-2 text-sm">
            <Controller control={control} name="taxable" render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />} />
            Taxable
          </label>
          <label className="col-span-1 flex items-center gap-2 text-sm">
            <Controller
              control={control}
              name="includedInPayroll"
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} />}
            />
            Included in payroll
          </label>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Earning'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
