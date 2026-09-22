import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { HolidayRateType, OtRateType } from '@/features/company-settings/payrollRatesStore'
import { usePayrollRatesStore } from '@/features/company-settings/payrollRatesStore'

/** Local draft copy so edits only take effect once "Save Settings" is clicked — mirrors the pattern
 * used by `PayrollRulesSection`, and keeps the live application-modal dropdowns from flickering
 * with every keystroke. */
function toPctDraft(rates: { id: string; multiplier: number }[]): Record<string, string> {
  return Object.fromEntries(rates.map((r) => [r.id, String(Math.round(r.multiplier * 1000) / 10)]))
}

export function OvertimeHolidayRatesSection() {
  const otRates = usePayrollRatesStore((s) => s.otRates)
  const holidayRates = usePayrollRatesStore((s) => s.holidayRates)
  const { updateOtRate, addCustomOtRate, removeCustomOtRate, updateHolidayRate, resetToDefaults } = usePayrollRatesStore.getState()
  const { notify } = useToast()

  const [otDraft, setOtDraft] = useState<Record<string, string>>(() => toPctDraft(otRates))
  const [holidayDraft, setHolidayDraft] = useState<Record<string, string>>(() => toPctDraft(holidayRates))
  const [otLabelDraft, setOtLabelDraft] = useState<Record<string, string>>(() => Object.fromEntries(otRates.map((r) => [r.id, r.label])))
  const [newRateLabel, setNewRateLabel] = useState('')
  const [newRatePct, setNewRatePct] = useState('')

  function syncDrafts() {
    setOtDraft(toPctDraft(otRates))
    setHolidayDraft(toPctDraft(holidayRates))
    setOtLabelDraft(Object.fromEntries(otRates.map((r) => [r.id, r.label])))
  }

  function handleAddCustomRate() {
    const pct = Number(newRatePct)
    if (!newRateLabel.trim() || !(pct > 0)) return
    addCustomOtRate(newRateLabel.trim(), pct / 100)
    setNewRateLabel('')
    setNewRatePct('')
    setTimeout(syncDrafts, 0)
  }

  function handleReset() {
    resetToDefaults()
    setTimeout(syncDrafts, 0)
    notify({ title: 'Rates reset to statutory defaults', tone: 'success' })
  }

  function handleSave() {
    for (const rate of otRates) {
      const pct = Number(otDraft[rate.id])
      if (pct > 0) updateOtRate(rate.id, { multiplier: pct / 100, label: otLabelDraft[rate.id]?.trim() || rate.label })
    }
    for (const rate of holidayRates) {
      const pct = Number(holidayDraft[rate.id])
      if (pct > 0) updateHolidayRate(rate.id, pct / 100)
    }
    notify({ title: 'Payroll rate settings saved', description: 'Overtime, Night Differential, and Holiday Pay rates updated.', tone: 'success' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Overtime, Night Differential &amp; Holiday Pay Rates</p>
        <Button type="button" variant="secondary" size="sm" icon={<RotateCcw className="size-3.5" />} onClick={handleReset}>
          Reset to Statutory Defaults
        </Button>
      </div>

      <Card className="p-5">
        <Card.Title>Overtime (OT) &amp; Night Differential Rates</Card.Title>
        <Card.Description>Percentage multipliers applied on top of the employee&apos;s hourly rate.</Card.Description>

        <div className="mt-4 space-y-3">
          {otRates.map((rate) => (
            <OtRateRow
              key={rate.id}
              rate={rate}
              labelValue={otLabelDraft[rate.id] ?? rate.label}
              pctValue={otDraft[rate.id] ?? toPctDraft([rate])[rate.id]}
              onLabelChange={(v) => setOtLabelDraft((d) => ({ ...d, [rate.id]: v }))}
              onPctChange={(v) => setOtDraft((d) => ({ ...d, [rate.id]: v }))}
              onRemove={rate.isCustom ? () => removeCustomOtRate(rate.id) : undefined}
            />
          ))}
        </div>

        <div className="mt-4 flex items-end gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3">
          <FormField label="Custom Rate Type Name" className="flex-1">
            <Input value={newRateLabel} onChange={(e) => setNewRateLabel(e.target.value)} placeholder="e.g. Special Project Night OT" />
          </FormField>
          <FormField label="Rate %" className="w-28">
            <div className="relative">
              <Input value={newRatePct} onChange={(e) => setNewRatePct(e.target.value)} type="number" step="0.1" placeholder="150" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </FormField>
          <Button type="button" variant="secondary" icon={<Plus className="size-3.5" />} onClick={handleAddCustomRate}>
            Add Custom Rate Type
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <Card.Title>Holiday Pay Rates</Card.Title>
        <Card.Description>Percentage multipliers applied to the employee&apos;s daily rate for holiday work.</Card.Description>

        <div className="mt-4 space-y-3">
          {holidayRates.map((rate) => (
            <HolidayRateRow
              key={rate.id}
              rate={rate}
              pctValue={holidayDraft[rate.id] ?? toPctDraft([rate])[rate.id]}
              onPctChange={(v) => setHolidayDraft((d) => ({ ...d, [rate.id]: v }))}
            />
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </div>
  )
}

function PctInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-28">
      <Input value={value} onChange={(e) => onChange(e.target.value)} type="number" step="0.1" className="pr-7" />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
    </div>
  )
}

function OtRateRow({
  rate,
  labelValue,
  pctValue,
  onLabelChange,
  onPctChange,
  onRemove,
}: {
  rate: OtRateType
  labelValue: string
  pctValue: string
  onLabelChange: (v: string) => void
  onPctChange: (v: string) => void
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
      <Input
        value={labelValue}
        onChange={(e) => onLabelChange(e.target.value)}
        disabled={!rate.isCustom}
        className="flex-1 border-none bg-transparent px-0 font-medium shadow-none focus-visible:ring-0 disabled:opacity-100"
      />
      <PctInput value={pctValue} onChange={onPctChange} />
      {onRemove ? (
        <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="size-3.5" />} onClick={onRemove} aria-label={`Remove ${rate.label}`} />
      ) : (
        <span className="w-8" />
      )}
    </div>
  )
}

function HolidayRateRow({ rate, pctValue, onPctChange }: { rate: HolidayRateType; pctValue: string; onPctChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <p className="text-sm font-medium">{rate.label}</p>
      <PctInput value={pctValue} onChange={onPctChange} />
    </div>
  )
}
