import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateCompany } from '@/lib/services/companyService'
import type { Company } from '@/types/domain'

interface FormValues {
  name: string
  timezone: string
  payrollFrequency: Company['payrollFrequency']
}

const FREQUENCY_OPTIONS = [
  { value: 'semi_monthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
]

/**
 * Only ever mounted once `company` has loaded, so react-hook-form's
 * `defaultValues` are correct from this component's very first render —
 * no `reset()`-after-async-fetch dance needed (which, with a Controller-based
 * Select, does not reliably propagate; see git history if this regresses).
 */
export function CompanyInfoForm({ company, canEdit, onSaved }: { company: Company; canEdit: boolean; onSaved: () => void }) {
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      name: company.name,
      timezone: company.timezone,
      payrollFrequency: company.payrollFrequency,
    },
  })

  async function onSubmit(values: FormValues) {
    await updateCompany(user, values)
    notify({ title: 'Company settings updated', tone: 'success' })
    onSaved()
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        <FormField label="Company name" required error={errors.name?.message} className="col-span-2">
          <Input disabled={!canEdit} {...register('name', { required: true })} />
        </FormField>
        <FormField label="Timezone" required error={errors.timezone?.message}>
          <Input disabled={!canEdit} {...register('timezone', { required: true })} />
        </FormField>
        <FormField label="Payroll frequency" required>
          <Controller
            control={control}
            name="payrollFrequency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} options={FREQUENCY_OPTIONS} disabled={!canEdit} />
            )}
          />
        </FormField>
        {canEdit && (
          <div className="col-span-2 flex justify-end">
            <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!isDirty}>
              Save Changes
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}
