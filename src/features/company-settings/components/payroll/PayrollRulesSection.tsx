import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { updatePayrollRules } from '@/lib/services/payrollSettingsService'
import type { PayrollRules } from '@/types/domain'

type FormValues = Omit<PayrollRules, 'companyId'>

const ROUNDING_METHOD_OPTIONS = [
  { value: 'nearest', label: 'Round to Nearest' },
  { value: 'round_up', label: 'Always Round Up' },
  { value: 'round_down', label: 'Always Round Down' },
]

const LATE_DEDUCTION_METHOD_OPTIONS = [
  { value: 'per_minute', label: 'Per-Minute Deduction' },
  { value: 'fixed', label: 'Fixed Deduction' },
]

const ABSENCE_BASIS_OPTIONS = [
  { value: 'basic_pay_divided_by_working_days', label: 'Basic Pay ÷ Working Days' },
  { value: 'fixed_daily_rate', label: 'Fixed Daily Rate' },
]

const ABSENCE_HANDLING_OPTIONS = [
  { value: 'deduct_daily_rate', label: 'Deduct Daily Rate' },
  { value: 'no_deduction', label: 'No Deduction' },
]

function toFormValues(rules?: PayrollRules): FormValues {
  return {
    roundingDecimalPrecision: rules?.roundingDecimalPrecision ?? 2,
    roundingMethod: rules?.roundingMethod ?? 'nearest',
    lateGracePeriodMinutes: rules?.lateGracePeriodMinutes ?? 10,
    lateDeductionMethod: rules?.lateDeductionMethod ?? 'per_minute',
    latePerMinuteDeduction: rules?.latePerMinuteDeduction ?? 0,
    overtimePreApprovalRequired: rules?.overtimePreApprovalRequired ?? true,
    overtimeDefaultMultiplier: rules?.overtimeDefaultMultiplier ?? 1.25,
    overtimeRestDayMultiplier: rules?.overtimeRestDayMultiplier ?? 1.3,
    overtimeHolidayMultiplier: rules?.overtimeHolidayMultiplier ?? 2,
    absenceDailyRateBasis: rules?.absenceDailyRateBasis ?? 'basic_pay_divided_by_working_days',
    absenceUnpaidHandling: rules?.absenceUnpaidHandling ?? 'deduct_daily_rate',
    prorationNewEmployee: rules?.prorationNewEmployee ?? true,
    prorationResignedEmployee: rules?.prorationResignedEmployee ?? true,
    prorationMidPeriodChanges: rules?.prorationMidPeriodChanges ?? true,
    adjustmentsRetroactiveAllowed: rules?.adjustmentsRetroactiveAllowed ?? true,
    adjustmentsManualAllowed: rules?.adjustmentsManualAllowed ?? true,
    adjustmentsApprovalRequired: rules?.adjustmentsApprovalRequired ?? true,
  }
}

export function PayrollRulesSection({ rules, canEdit, onRefetch }: { rules?: PayrollRules; canEdit: boolean; onRefetch: () => void }) {
  const { user } = useSession()
  const { notify } = useToast()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({ defaultValues: toFormValues(rules) })

  useEffect(() => {
    reset(toFormValues(rules))
  }, [rules, reset])

  async function onSubmit(values: FormValues) {
    await updatePayrollRules(user, values)
    notify({ title: 'Payroll rules updated', tone: 'success' })
    onRefetch()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm font-medium">Payroll Rules</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Card.Title>Rounding Rules</Card.Title>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <FormField label="Decimal precision">
              <Input type="number" min={0} max={4} disabled={!canEdit} {...register('roundingDecimalPrecision')} />
            </FormField>
            <FormField label="Rounding method">
              <Controller control={control} name="roundingMethod" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={ROUNDING_METHOD_OPTIONS} disabled={!canEdit} />} />
            </FormField>
          </div>
        </Card>

        <Card className="p-5">
          <Card.Title>Late & Undertime</Card.Title>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <FormField label="Grace period (minutes)">
              <Input type="number" min={0} disabled={!canEdit} {...register('lateGracePeriodMinutes')} />
            </FormField>
            <FormField label="Deduction method">
              <Controller control={control} name="lateDeductionMethod" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={LATE_DEDUCTION_METHOD_OPTIONS} disabled={!canEdit} />} />
            </FormField>
            <FormField label="Per-minute deduction (PHP)" className="col-span-2">
              <Input type="number" step="0.01" min={0} disabled={!canEdit} {...register('latePerMinuteDeduction')} />
            </FormField>
          </div>
        </Card>

        <Card className="p-5">
          <Card.Title>Overtime</Card.Title>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="col-span-2 flex items-center justify-between text-sm">
              Pre-approval required
              <Controller control={control} name="overtimePreApprovalRequired" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />} />
            </label>
            <FormField label="Default multiplier">
              <Input type="number" step="0.01" disabled={!canEdit} {...register('overtimeDefaultMultiplier')} />
            </FormField>
            <FormField label="Rest day multiplier">
              <Input type="number" step="0.01" disabled={!canEdit} {...register('overtimeRestDayMultiplier')} />
            </FormField>
            <FormField label="Holiday multiplier">
              <Input type="number" step="0.01" disabled={!canEdit} {...register('overtimeHolidayMultiplier')} />
            </FormField>
          </div>
        </Card>

        <Card className="p-5">
          <Card.Title>Absence</Card.Title>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <FormField label="Daily rate calculation basis">
              <Controller control={control} name="absenceDailyRateBasis" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={ABSENCE_BASIS_OPTIONS} disabled={!canEdit} />} />
            </FormField>
            <FormField label="Unpaid absence handling">
              <Controller control={control} name="absenceUnpaidHandling" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={ABSENCE_HANDLING_OPTIONS} disabled={!canEdit} />} />
            </FormField>
          </div>
        </Card>

        <Card className="p-5">
          <Card.Title>Proration</Card.Title>
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between text-sm">
              New employee
              <Controller control={control} name="prorationNewEmployee" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />} />
            </label>
            <label className="flex items-center justify-between text-sm">
              Resigned employee
              <Controller control={control} name="prorationResignedEmployee" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />} />
            </label>
            <label className="flex items-center justify-between text-sm">
              Mid-period changes
              <Controller control={control} name="prorationMidPeriodChanges" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />} />
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <Card.Title>Payroll Adjustments</Card.Title>
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between text-sm">
              Retroactive adjustments allowed
              <Controller control={control} name="adjustmentsRetroactiveAllowed" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />} />
            </label>
            <label className="flex items-center justify-between text-sm">
              Manual adjustments allowed
              <Controller control={control} name="adjustmentsManualAllowed" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />} />
            </label>
            <label className="flex items-center justify-between text-sm">
              Adjustment approval required
              <Controller control={control} name="adjustmentsApprovalRequired" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />} />
            </label>
          </div>
        </Card>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
            Save Changes
          </Button>
        </div>
      )}
    </form>
  )
}
