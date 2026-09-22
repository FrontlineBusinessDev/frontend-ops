import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { MixedBaseType, MixedComponentType, MixedCompensationStructure } from '@/features/employees/mixedCompensationStore'
import { summarizeMixedCompensation } from '@/features/employees/mixedCompensationStore'

const BASE_TYPE_OPTIONS: { value: MixedBaseType; label: string }[] = [
  { value: 'monthly', label: 'Fixed Monthly Base' },
  { value: 'daily', label: 'Daily Base' },
  { value: 'hourly', label: 'Hourly Base' },
]

const COMPONENT_TYPE_OPTIONS: { value: MixedComponentType; label: string }[] = [
  { value: 'commission_pct', label: 'Commission (%)' },
  { value: 'piece_rate', label: 'Piece-Rate / Per Task Rate' },
  { value: 'allowance_per_day', label: 'Allowance per Day' },
]

const RATE_FIELD_LABEL: Record<MixedComponentType, string> = {
  commission_pct: 'Commission Percentage',
  piece_rate: 'Rate per Task',
  allowance_per_day: 'Allowance per Day',
}

const RATE_PLACEHOLDER: Record<MixedComponentType, string> = {
  commission_pct: '5',
  piece_rate: '25.00',
  allowance_per_day: '150.00',
}

export function MixedCompensationDialog({
  open,
  initialValue,
  onOpenChange,
  onSave,
}: {
  open: boolean
  initialValue?: MixedCompensationStructure
  onOpenChange: (open: boolean) => void
  onSave: (structure: MixedCompensationStructure) => void
}) {
  const [baseType, setBaseType] = useState<MixedBaseType>(initialValue?.baseType ?? 'monthly')
  const [baseAmount, setBaseAmount] = useState(initialValue?.baseAmount ? String(initialValue.baseAmount) : '')
  const [componentType, setComponentType] = useState<MixedComponentType>(initialValue?.componentType ?? 'piece_rate')
  const [rate, setRate] = useState(initialValue?.rate ? String(initialValue.rate) : '')

  const baseAmountNum = Number(baseAmount)
  const rateNum = Number(rate)
  const canSave = baseAmountNum > 0 && rateNum > 0

  const preview =
    canSave ? summarizeMixedCompensation({ baseType, baseAmount: baseAmountNum, componentType, rate: rateNum }) : null

  function handleSave() {
    if (!canSave) return
    onSave({ baseType, baseAmount: baseAmountNum, componentType, rate: rateNum })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Configure Mixed Compensation Breakdown</DialogTitle>
        <DialogDescription>Combine a fixed base with a variable component for this employee&apos;s pay structure.</DialogDescription>

        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Base Pay Component</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Base Type">
                <Select value={baseType} onValueChange={(v) => setBaseType(v as MixedBaseType)} options={BASE_TYPE_OPTIONS} />
              </FormField>
              <FormField label="Base Amount" required>
                <Input
                  type="number"
                  step="0.01"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  placeholder="20000.00"
                />
              </FormField>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Variable / Additional Component</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Component Type">
                <Select
                  value={componentType}
                  onValueChange={(v) => setComponentType(v as MixedComponentType)}
                  options={COMPONENT_TYPE_OPTIONS}
                />
              </FormField>
              <FormField label={RATE_FIELD_LABEL[componentType]} required>
                <Input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder={RATE_PLACEHOLDER[componentType]}
                />
              </FormField>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary Preview</p>
            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-sm font-medium">
              {preview ?? 'Fill in the base amount and rate to preview the structure.'}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!canSave} onClick={handleSave}>
              Save Compensation Structure
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
