import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { createCompensationType, updateCompensationType } from '@/lib/services/payrollSettingsService'
import type { CompensationKind, CompensationType } from '@/types/domain'

interface FormValues {
  name: string
  kind: CompensationKind
  basicRate: number
  outputRates: { label: string; unit: string; ratePerUnit: number }[]
  outputMin: number
  outputMax: number
  commissionType: 'percentage' | 'fixed'
  commissionValue: number
  commissionBasis: string
  mixedComponents: string
}

const KIND_OPTIONS: { value: CompensationKind; label: string }[] = [
  { value: 'monthly_rate', label: 'Monthly Rate' },
  { value: 'semi_monthly_rate', label: 'Semi-Monthly Rate' },
  { value: 'daily_rate', label: 'Daily Rate' },
  { value: 'hourly_rate', label: 'Hourly Rate' },
  { value: 'output_based', label: 'Output-Based / Piece-Rate' },
  { value: 'commission_based', label: 'Commission-Based' },
  { value: 'mixed', label: 'Mixed Compensation' },
]

const COMMISSION_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed Amount' },
]

function toFormValues(comp?: CompensationType): FormValues {
  return {
    name: comp?.name ?? '',
    kind: comp?.kind ?? 'monthly_rate',
    basicRate: comp?.config.basicRate ?? 0,
    outputRates: comp?.config.outputRates ?? [{ label: '', unit: 'unit', ratePerUnit: 0 }],
    outputMin: comp?.config.outputMin ?? 0,
    outputMax: comp?.config.outputMax ?? 0,
    commissionType: comp?.config.commissionType ?? 'percentage',
    commissionValue: comp?.config.commissionValue ?? 0,
    commissionBasis: comp?.config.commissionBasis ?? '',
    mixedComponents: comp?.config.mixedComponents?.join(', ') ?? '',
  }
}

export function CompensationTypeDialog({
  compensationType,
  onSaved,
  trigger,
}: {
  compensationType?: CompensationType
  onSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { user } = useSession()
  const { notify } = useToast()
  const isEdit = Boolean(compensationType)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toFormValues(compensationType) })

  const { fields, append, remove } = useFieldArray({ control, name: 'outputRates' })

  useEffect(() => {
    if (open) reset(toFormValues(compensationType))
  }, [open, compensationType, reset])

  const kind = watch('kind')

  async function onSubmit(values: FormValues) {
    const config = {
      basicRate: ['monthly_rate', 'semi_monthly_rate', 'daily_rate', 'hourly_rate', 'mixed'].includes(values.kind)
        ? Number(values.basicRate)
        : undefined,
      outputRates: values.kind === 'output_based' ? values.outputRates.map((r) => ({ ...r, ratePerUnit: Number(r.ratePerUnit) })) : undefined,
      outputMin: values.kind === 'output_based' ? Number(values.outputMin) : undefined,
      outputMax: values.kind === 'output_based' ? Number(values.outputMax) : undefined,
      commissionType: values.kind === 'commission_based' ? values.commissionType : undefined,
      commissionValue: values.kind === 'commission_based' ? Number(values.commissionValue) : undefined,
      commissionBasis: values.kind === 'commission_based' ? values.commissionBasis : undefined,
      mixedComponents:
        values.kind === 'mixed'
          ? values.mixedComponents.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
    }
    if (isEdit && compensationType) {
      await updateCompensationType(user, compensationType.id, { name: values.name, kind: values.kind, config, isActive: compensationType.isActive })
      notify({ title: 'Compensation type updated', tone: 'success' })
    } else {
      await createCompensationType(user, { name: values.name, kind: values.kind, config, isActive: true })
      notify({ title: 'Compensation type created', tone: 'success' })
    }
    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" icon={<Plus className="size-4" />}>
            Add Compensation Type
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogTitle>{isEdit ? 'Edit Compensation Type' : 'Add Compensation Type'}</DialogTitle>
        <DialogDescription>Configuration only — no payroll calculations are performed here.</DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Name" required error={errors.name?.message} className="col-span-2">
            <Input {...register('name', { required: 'Required' })} placeholder="Monthly Rate" />
          </FormField>
          <FormField label="Type" required className="col-span-2">
            <Controller
              control={control}
              name="kind"
              render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={KIND_OPTIONS} />}
            />
          </FormField>

          {['monthly_rate', 'semi_monthly_rate', 'daily_rate', 'hourly_rate', 'mixed'].includes(kind) && (
            <FormField
              label={kind === 'mixed' ? 'Base amount' : kind === 'daily_rate' ? 'Daily Rate (PHP)' : kind === 'hourly_rate' ? 'Hourly Rate (PHP)' : 'Basic Monthly Rate (PHP)'}
              className="col-span-2"
            >
              <Input type="number" step="0.01" {...register('basicRate')} />
            </FormField>
          )}

          {kind === 'output_based' && (
            <div className="col-span-2 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Output Rates</p>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
                  <FormField label="Output type">
                    <Input {...register(`outputRates.${index}.label`)} placeholder="Product A" />
                  </FormField>
                  <FormField label="Unit">
                    <Input {...register(`outputRates.${index}.unit`)} placeholder="unit" className="w-20" />
                  </FormField>
                  <FormField label="Rate (PHP)">
                    <Input type="number" step="0.01" {...register(`outputRates.${index}.ratePerUnit`)} className="w-24" />
                  </FormField>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length === 1}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={() => append({ label: '', unit: 'unit', ratePerUnit: 0 })}>
                Add Rate
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Minimum output">
                  <Input type="number" {...register('outputMin')} />
                </FormField>
                <FormField label="Maximum output">
                  <Input type="number" {...register('outputMax')} />
                </FormField>
              </div>
            </div>
          )}

          {kind === 'commission_based' && (
            <>
              <FormField label="Commission type">
                <Controller
                  control={control}
                  name="commissionType"
                  render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={COMMISSION_TYPE_OPTIONS} />}
                />
              </FormField>
              <FormField label={watch('commissionType') === 'percentage' ? 'Percentage (%)' : 'Fixed amount (PHP)'}>
                <Input type="number" step="0.01" {...register('commissionValue')} />
              </FormField>
              <FormField label="Basis" className="col-span-2">
                <Input {...register('commissionBasis')} placeholder="Net Sales" />
              </FormField>
            </>
          )}

          {kind === 'mixed' && (
            <FormField label="Combined components (comma-separated)" className="col-span-2" hint="e.g. Base Salary, Output Incentive">
              <Input {...register('mixedComponents')} placeholder="Base Salary, Output Incentive" />
            </FormField>
          )}

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Compensation Type'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
