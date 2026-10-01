import { Columns3 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { MAPPING_FIELDS, type ColumnMapping } from '@/features/attendance/biometricsImport'

const NOT_IN_FILE = '-1'

/**
 * Manual column mapping for exports from other biometric models — pick which column holds each field.
 * Shows the first data row's value under each choice so the admin can confirm the match.
 */
export function ColumnMappingForm({
  headers,
  sample,
  initial,
  onApply,
  onCancel,
}: {
  headers: string[]
  sample: string[]
  initial: ColumnMapping
  onApply: (mapping: ColumnMapping) => void
  onCancel?: () => void
}) {
  const [mapping, setMapping] = useState<ColumnMapping>(initial)
  const options = [{ value: NOT_IN_FILE, label: '— Not in this file —' }, ...headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` }))]
  const hasTimestamp = mapping.timestamp !== -1 || (mapping.date !== -1 && mapping.time !== -1)
  const canApply = mapping.userId !== -1 && hasTimestamp

  return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Columns3 className="size-4 text-primary" />
        Map columns
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Tell the importer which column holds each field. Use a combined Date-Time column, or separate Date and Time columns.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {MAPPING_FIELDS.map((field) => {
          const idx = mapping[field.key]
          return (
            <div key={field.key}>
              <p className="mb-1 text-xs font-medium">
                {field.label}
                {field.required && <span className="text-danger"> *</span>}
              </p>
              <Select value={String(idx)} onValueChange={(v) => setMapping((m) => ({ ...m, [field.key]: Number(v) }))} options={options} />
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{idx !== -1 ? `e.g. ${sample[idx] || '(empty)'}` : (field.hint ?? 'Optional')}</p>
            </div>
          )
        })}
      </div>
      {!canApply && <p className="mt-3 text-xs text-danger">Map the User / Employee ID and either Date-Time or both Date and Time.</p>}
      <div className="mt-4 flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="button" size="sm" disabled={!canApply} onClick={() => onApply(mapping)}>
          Apply Mapping & Preview
        </Button>
      </div>
    </div>
  )
}
