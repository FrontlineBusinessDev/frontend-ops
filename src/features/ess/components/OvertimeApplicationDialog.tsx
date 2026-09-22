import { Plus, Upload, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { FormField } from '@/components/ui/FormField'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { otRateOptionLabel, usePayrollRatesStore } from '@/features/company-settings/payrollRatesStore'
import { computeTotalHours, useOtApplicationStore } from '@/features/ess/otApplicationStore'
import type { OtApplicationType } from '@/features/ess/otApplicationStore'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_FORM = { type: 'regular' as OtApplicationType, date: todayKey(), startTime: '', endTime: '', reason: '' }

export function OvertimeApplicationDialog({ employeeId, onSubmitted }: { employeeId: string; onSubmitted?: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addApplication = useOtApplicationStore((s) => s.addApplication)
  const otRates = usePayrollRatesStore((s) => s.otRates)
  const typeOptions = otRates.map((r) => ({ value: r.id, label: otRateOptionLabel(r) }))
  const { notify } = useToast()

  const totalHours = computeTotalHours(form.startTime, form.endTime)
  const canSubmit = form.date && form.startTime && form.endTime && form.reason.trim().length > 0

  function reset() {
    setForm(EMPTY_FORM)
    setFile(null)
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  function handleSubmit() {
    if (!canSubmit) return
    addApplication({
      employeeId,
      type: form.type,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      reason: form.reason.trim(),
      attachmentName: file?.name,
    })
    notify({ title: 'Application submitted', description: 'Your request is now pending approval.', tone: 'success' })
    setOpen(false)
    reset()
    onSubmitted?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button icon={<Plus className="size-4" />}>Apply Overtime / Night Diff</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Apply for Overtime / Night Differential</DialogTitle>
        <DialogDescription>File a request for your manager to review. This will be recorded as pending approval.</DialogDescription>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Application Type" required className="col-span-2">
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v as OtApplicationType }))}
              options={typeOptions}
            />
          </FormField>

          <FormField label="Date of Rendering" required className="col-span-2">
            <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </FormField>

          <FormField label="Start Time" required>
            <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          </FormField>
          <FormField label="End Time" required>
            <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </FormField>

          <FormField label="Total Hours" className="col-span-2" hint="Automatically computed from start and end time.">
            <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm font-semibold tabular-nums">
              {totalHours > 0 ? `${totalHours} hrs` : '—'}
            </p>
          </FormField>

          <FormField label="Reason / Justification" required className="col-span-2">
            <Textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Project crunch delivery, system deployment duty…"
            />
          </FormField>

          <FormField label="Attachment / Proof (Optional)" className="col-span-2">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const dropped = e.dataTransfer.files?.[0]
                if (dropped) setFile(dropped)
              }}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              <UploadCloud className="size-6 text-muted-foreground" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Drag a file here, or choose one below (screenshot, approval, etc.)</p>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<Upload className="size-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </FormField>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
              Submit Application
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
