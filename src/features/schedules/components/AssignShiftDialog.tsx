import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { EmployeeCombobox } from '@/components/ui/EmployeeCombobox'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { DAY_LABELS, WEEK_ORDER } from '@/features/schedules/scheduleUi'
import { useSession } from '@/hooks/useSession'
import { addDaysIso, isoDate, mondayOf, parseIso } from '@/lib/schedule/roster'
import { assignShift, clearAssignments, type WeekdayPattern } from '@/lib/services/scheduleService'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import type { Employee, ShiftTemplate } from '@/types/domain'

export type ApplyPreset = 'day' | 'week' | 'month' | 'year' | 'custom'

const REST = '__rest__'
const NONE = '__none__'

const PRESET_OPTIONS: { value: ApplyPreset; label: string }[] = [
  { value: 'day', label: 'Just this day' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'Rest of the year' },
  { value: 'custom', label: 'Custom dates' },
]

function rangeFor(preset: ApplyPreset, date: string, customFrom: string, customTo: string): { from: string; to: string } {
  const d = parseIso(date)
  switch (preset) {
    case 'day':
      return { from: date, to: date }
    case 'week':
      return { from: mondayOf(date), to: addDaysIso(mondayOf(date), 6) }
    case 'month':
      return { from: isoDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
    case 'year':
      return { from: date, to: `${d.getFullYear()}-12-31` }
    case 'custom':
      return { from: customFrom, to: customTo }
  }
}

/**
 * Assign a shift or rest day to one or more employees over a day, week, month, the rest of the year, or custom dates.
 * Choose which weekdays get the shift; the other weekdays are left alone or marked as rest days.
 */
export function AssignShiftDialog({
  open,
  onOpenChange,
  employees,
  templates,
  defaultEmployeeIds,
  defaultDate,
  defaultPreset,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: Employee[]
  templates: ShiftTemplate[]
  defaultEmployeeIds: string[]
  defaultDate: string
  defaultPreset: ApplyPreset
  onDone: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()
  const [employeeIds, setEmployeeIds] = useState<string[]>([])
  const [shift, setShift] = useState<string>('')
  const [preset, setPreset] = useState<ApplyPreset>('week')
  const [customFrom, setCustomFrom] = useState(defaultDate)
  const [customTo, setCustomTo] = useState(defaultDate)
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [otherDays, setOtherDays] = useState<'keep' | 'rest'>('keep')
  const [department, setDepartment] = useState(NONE)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmployeeIds(defaultEmployeeIds)
    setShift(templates[0]?.id ?? REST)
    setPreset(defaultPreset)
    setCustomFrom(defaultDate)
    setCustomTo(defaultDate)
    setDays(defaultPreset === 'day' ? [parseIso(defaultDate).getDay()] : [1, 2, 3, 4, 5])
    setOtherDays('keep')
    setDepartment(NONE)
  }, [open, defaultEmployeeIds, defaultDate, defaultPreset, templates])

  const active = useMemo(() => employees.filter((e) => e.employment.status === 'active'), [employees])
  const options = useMemo(
    () => active.map((e) => ({ id: e.id, name: `${e.personal.firstName} ${e.personal.lastName}`, employeeNumber: e.employeeNumber, department: e.employment.department })),
    [active],
  )
  const departments = useMemo(() => [...new Set(active.map((e) => e.employment.department))].sort(), [active])
  const range = rangeFor(preset, defaultDate, customFrom, customTo)
  const rangeValid = range.from !== '' && range.to !== '' && range.from <= range.to
  const canApply = employeeIds.length > 0 && rangeValid && shift !== '' && (preset === 'day' || days.length > 0)

  function toggleDay(day: number) {
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]))
  }

  function addDepartment(value: string) {
    setDepartment(value)
    if (value === NONE) return
    const ids = active.filter((e) => e.employment.department === value).map((e) => e.id)
    setEmployeeIds((current) => [...new Set([...current, ...ids])])
  }

  async function apply() {
    setBusy(true)
    const value = shift === REST ? null : shift
    const pattern: WeekdayPattern = {}
    for (let day = 0; day < 7; day++) pattern[day] = preset === 'day' || days.includes(day) ? value : otherDays === 'rest' ? null : undefined
    const written = await assignShift(user, { employeeIds, pattern, from: range.from, to: range.to })
    setBusy(false)
    notify({ title: 'Schedule updated', description: `${written} day${written === 1 ? '' : 's'} assigned for ${employeeIds.length} employee${employeeIds.length === 1 ? '' : 's'}.`, tone: 'success' })
    onOpenChange(false)
    onDone()
  }

  async function reset() {
    setBusy(true)
    await clearAssignments(user, employeeIds, range.from, range.to)
    setBusy(false)
    notify({ title: 'Back to template', description: 'Individual assignments in that range were cleared.', tone: 'success' })
    onOpenChange(false)
    onDone()
  }

  const shiftOptions = [...templates.map((t) => ({ value: t.id, label: `${t.name} (${t.startTime}–${t.endTime})` })), { value: REST, label: 'Rest day' }]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Assign shift</DialogTitle>
        <DialogDescription>Set a shift or rest day for the people you pick. Anything you set here overrides their template for those days.</DialogDescription>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold">Employees</p>
            <EmployeeCombobox multiple employees={options} value={employeeIds} onChange={setEmployeeIds} placeholder="Search employees…" />
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0">Add a whole department</span>
              <Select
                className="h-8 w-48"
                value={department}
                onValueChange={addDepartment}
                options={[{ value: NONE, label: 'Choose…' }, ...departments.map((d) => ({ value: d, label: d }))]}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold">Shift</p>
              <Select value={shift} onValueChange={setShift} options={shiftOptions} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold">Apply to</p>
              <Select value={preset} onValueChange={(v) => setPreset(v as ApplyPreset)} options={PRESET_OPTIONS} />
            </div>
          </div>

          {preset === 'custom' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold">From</p>
                <Input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold">To</p>
                <Input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}

          {preset !== 'day' && (
            <div>
              <p className="mb-1 text-xs font-semibold">On these days</p>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_ORDER.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn('rounded-md border px-2.5 py-1 text-xs font-medium transition-colors', days.includes(day) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={otherDays === 'rest'} onChange={(e) => setOtherDays(e.target.checked ? 'rest' : 'keep')} />
                Set the other days as rest days
              </label>
            </div>
          )}

          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {rangeValid ? (
              <>
                {formatDate(range.from)}
                {range.to !== range.from && ` – ${formatDate(range.to)}`} · {employeeIds.length} employee{employeeIds.length === 1 ? '' : 's'}
              </>
            ) : (
              'Choose a valid date range.'
            )}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" disabled={employeeIds.length === 0 || !rangeValid || busy} onClick={reset}>
            Reset to template
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canApply || busy} onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
