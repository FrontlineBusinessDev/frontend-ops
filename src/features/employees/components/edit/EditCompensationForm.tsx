import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updateEmployeeCompensation, type UpdateCompensationInput } from '@/lib/services/employeeService'
import {
  OUTPUT_UNIT_OPTIONS,
  PAY_RATE_TYPE_OPTIONS,
  estimatedEquivalentFor,
  helperTextFor,
  rateFieldLabel,
} from '@/lib/payroll/payRate'
import { formatCurrency } from '@/lib/utils/format'
import type { Employee } from '@/types/domain'

const OUTPUT_UNIT_SELECT_OPTIONS = OUTPUT_UNIT_OPTIONS.map((u) => ({ value: u, label: u }))

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
      outputUnit: employee.compensation.outputUnit ?? OUTPUT_UNIT_OPTIONS[0],
      reason: 'Adjustment',
    },
  })

  const basicPay = watch('basicPay')
  const payType = watch('payType')
  const outputUnit = watch('outputUnit')
  const salaryChanged = Number(basicPay) !== employee.compensation.basicPay
  const estimatedEquivalent = payType && basicPay > 0 ? estimatedEquivalentFor(payType, basicPay) : null

  function validateOutputUnit(value?: string | null) {
    if (payType === 'output_based' && !value) return 'Output unit is required for Output-Based / Piece-Rate'
    return true
  }

  async function onSubmit(values: UpdateCompensationInput) {
    await updateEmployeeCompensation(user, employee.id, {
      ...values,
      outputUnit: values.payType === 'output_based' ? values.outputUnit : null,
    })
    notify({
      title: 'Compensation updated',
      description: salaryChanged ? 'A new compensation history entry was recorded.' : undefined,
      tone: 'success',
    })
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-3">
      <FormField label="Pay Rate Type" required>
        <Select
          value={payType}
          onValueChange={(v) => setValue('payType', v as UpdateCompensationInput['payType'])}
          options={PAY_RATE_TYPE_OPTIONS}
        />
      </FormField>
      <FormField label={rateFieldLabel(payType)} required error={errors.basicPay?.message} hint={helperTextFor(payType)}>
        <Input
          type="number"
          step="0.01"
          {...register('basicPay', { required: 'Required', valueAsNumber: true, min: { value: 0.01, message: 'Must be greater than 0' } })}
        />
      </FormField>
      {payType === 'output_based' ? (
        <FormField label="Output Unit" required error={typeof errors.outputUnit?.message === 'string' ? errors.outputUnit.message : undefined}>
          <Select
            value={outputUnit ?? ''}
            onValueChange={(v) => {
              setValue('outputUnit', v)
            }}
            options={OUTPUT_UNIT_SELECT_OPTIONS}
            placeholder="Select unit…"
          />
        </FormField>
      ) : (
        <input type="hidden" {...register('outputUnit', { validate: validateOutputUnit })} />
      )}
      <FormField
        label="Reason for change"
        hint={salaryChanged ? 'Required — base pay changed, this will be logged in Compensation History.' : 'Only recorded if base pay changes.'}
      >
        <Select value={watch('reason')} onValueChange={(v) => setValue('reason', v)} options={REASON_OPTIONS} />
      </FormField>

      {estimatedEquivalent && (
        <p className="col-span-1 -mt-1 text-xs text-muted-foreground sm:col-span-2 md:col-span-3">
          Estimated, not the actual payroll rate — {estimatedEquivalent.label.toLowerCase()}: {formatCurrency(estimatedEquivalent.value)}
        </p>
      )}

      <div className="col-span-1 flex justify-end gap-2 sm:col-span-2 md:col-span-3">
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
