import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { FLAG_META, needsReview, type EffectiveRow, type RowEdit } from '@/features/attendance/scheduleMatch'
import { TONE_CLASS } from '@/features/schedules/scheduleUi'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

/** The flagged-punch editor's time field: native time input with a clear "edited" state. */
export function TimeEdit({ value, edited, onChange, label }: { value: string | null; edited: boolean; onChange: (value: string | null) => void; label: string }) {
  return (
    <input
      type="time"
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        'h-8 w-[112px] rounded-md border bg-card px-2 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        edited ? 'border-primary bg-primary/5' : 'border-border',
      )}
    />
  )
}

function ScheduledCell({ row }: { row: EffectiveRow }) {
  if (row.kind === 'shift' && row.template) {
    return (
      <div>
        <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', TONE_CLASS[row.template.tone ?? 'accent'])}>{row.template.name}</span>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {row.template.startTime}–{row.template.endTime}
        </p>
      </div>
    )
  }
  const label = row.kind === 'rest' ? 'Rest day' : row.kind === 'leave' ? 'On approved leave' : 'No schedule'
  return <span className="text-xs text-muted-foreground">{label}</span>
}

/**
 * Schedule-based review: each row pairs the employee's assigned shift for that date with what the terminal recorded.
 * Punches that need a look are highlighted and can be corrected right here — edits are applied with the import.
 */
export function ScheduleReviewTable({
  rows,
  edits,
  onEdit,
  flaggedOnly,
}: {
  rows: EffectiveRow[]
  edits: Record<string, RowEdit>
  onEdit: (key: string, patch: RowEdit) => void
  flaggedOnly: boolean
}) {
  const visible = flaggedOnly ? rows.filter((r) => needsReview(r.flags)) : rows
  if (visible.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{flaggedOnly ? 'Nothing is flagged — every matched punch looks right.' : 'No scheduled days matched this file and filter.'}</p>
  }
  return (
    <Table className="whitespace-nowrap">
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">Apply</TableHead>
          <TableHead>Employee</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Assigned schedule</TableHead>
          <TableHead>Time in</TableHead>
          <TableHead>Time out</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((row) => {
          const flagged = needsReview(row.flags)
          const edit = edits[row.key]
          return (
            <TableRow key={row.key} className={cn(flagged && 'bg-warning/[0.06]')}>
              <TableCell>
                <Checkbox checked={row.include} onCheckedChange={(v) => onEdit(row.key, { include: v === true })} aria-label={`Apply ${row.employee.personal.firstName}'s record for ${row.date}`} />
              </TableCell>
              <TableCell>
                <p className="font-medium">
                  {row.employee.personal.firstName} {row.employee.personal.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.employee.employeeNumber} · {row.employee.employment.department}
                </p>
              </TableCell>
              <TableCell>{formatDate(row.date)}</TableCell>
              <TableCell>
                <ScheduledCell row={row} />
              </TableCell>
              <TableCell>
                <TimeEdit label="Time in" value={row.effectiveIn} edited={edit?.timeIn !== undefined && edit.timeIn !== row.timeIn} onChange={(v) => onEdit(row.key, { timeIn: v })} />
              </TableCell>
              <TableCell>
                <TimeEdit label="Time out" value={row.effectiveOut} edited={edit?.timeOut !== undefined && edit.timeOut !== row.timeOut} onChange={(v) => onEdit(row.key, { timeOut: v })} />
              </TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex max-w-60 flex-wrap items-center gap-1">
                  {row.flags.map((flag) => (
                    <Badge key={flag} tone={FLAG_META[flag].tone}>
                      {FLAG_META[flag].label}
                    </Badge>
                  ))}
                  {row.edited && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      <Pencil className="size-3" />
                      Edited
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
