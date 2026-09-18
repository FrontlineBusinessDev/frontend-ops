import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateEmployeeCompensation, type UpdateCompensationInput } from '@/lib/services/employeeService'
import type { Employee } from '@/types/domain'

const PAY_TYPE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
]

const REASON_OPTIONS = [
  { value: 'Annual Merit Increase', label: 'Annual Merit Increase' },
  { value: 'Promotion', label: 'Promotion' },
  { value: 'Adjustment', label: 'Adjustment' },
  { value: 'Probationary to Regular', label: 'Probationary to Regular' },
]

export function EditCompensationForm({
  employee,
  onSaved,
  onCancel,
}: {
  employee: Employee
  onSaved: () => void
  onCancel: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateCompensationInput>({
    defaultValues: {
      basicPay: employee.compensation.basicPay,
      payType: employee.compensation.payType,
      reason: 'Adjustment',
    },
  })

  const basicPay = watch('basicPay')
  const salaryChanged = Number(basicPay) !== employee.compensation.basicPay

  async function onSubmit(values: UpdateCompensationInput) {
    await updateEmployeeCompensation(user, employee.id, values)
    notify({
      title: 'Compensation updated',
      description: salaryChanged ? 'A new compensation history entry was recorded.' : undefined,
      tone: 'success',
    })
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <FormField label="Basic pay" required error={errors.basicPay?.message}>
        <Input
          type="number"
          step="0.01"
          {...register('basicPay', { required: 'Required', valueAsNumber: true, min: { value: 0, message: 'Must be positive' } })}
        />
      </FormField>
      <FormField label="Pay frequency">
        <Select
          value={watch('payType')}
          onValueChange={(v) => setValue('payType', v as UpdateCompensationInput['payType'])}
          options={PAY_TYPE_OPTIONS}
        />
      </FormField>
      <FormField
        label="Reason for change"
        hint={salaryChanged ? 'Required — base pay changed, this will be logged in Compensation History.' : 'Only recorded if base pay changes.'}
      >
        <Select value={watch('reason')} onValueChange={(v) => setValue('reason', v)} options={REASON_OPTIONS} />
      </FormField>

      <div className="col-span-2 flex justify-end gap-2 sm:col-span-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}
