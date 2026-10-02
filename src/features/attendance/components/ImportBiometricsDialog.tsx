import { AlertCircle, AlertTriangle, CalendarRange, CheckCircle2, Columns3, Copy, Cpu, Download, FileWarning, FlaskConical, Info, ListChecks, Pencil, Plane, Upload, UploadCloud } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import {
  FORMAT_LABEL,
  FORMAT_MAPPING,
  buildSampleAttlog,
  buildSampleZkCsv,
  decodeBiometricsFile,
  parseBiometricsFile,
  type BiometricsParseResult,
  type ColumnMapping,
  type DailyImportRecord,
} from '@/features/attendance/biometricsImport'
import { ColumnMappingForm } from '@/features/attendance/components/ColumnMappingForm'
import { ScheduleReviewTable, TimeEdit } from '@/features/attendance/components/ScheduleReviewTable'
import { annotateImportWithLeaves, type ImportLeaveContext } from '@/features/attendance/leaveStatus'
import { buildScheduleMatch, effectiveRow, needsReview, type MatchResult, type RowEdit } from '@/features/attendance/scheduleMatch'
import { downloadCsv, toCsv } from '@/features/reports/components/shared'
import { useSession } from '@/hooks/useSession'
import { addDaysIso, mondayOf, type RosterContext } from '@/lib/schedule/roster'
import { getRosterContext } from '@/lib/services/scheduleService'
import type { ShiftTemplate } from '@/types/domain'
import { applyBiometricsPunches, getApprovedLeavesInRange, getAttendanceRecords, getSchedules, importBiometricsRecords } from '@/lib/services/attendanceService'
import { getEmployees } from '@/lib/services/employeeService'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

interface Preview {
  sourceName: string
  result: BiometricsParseResult
  leave: ImportLeaveContext
  /** Schedule-based imports: the file matched against each employee's assigned schedule. */
  match?: MatchResult
  roster?: RosterContext
}

type PreviewTab = 'records' | 'leave' | 'issues' | 'review'

type ImportMethod = 'standard' | 'schedule'

const METHODS: { value: ImportMethod; title: string; summary: string; bestFor: string[]; flow: string; icon: typeof Upload }[] = [
  {
    value: 'standard',
    title: 'Standard import',
    summary: 'Import biometric records without schedule matching.',
    bestFor: ['Simple attendance processes', 'Quick or raw biometric uploads', 'Schedules aren’t configured yet'],
    flow: 'Upload file → Preview → Validate → Apply',
    icon: Upload,
  },
  {
    value: 'schedule',
    title: 'Schedule-based import',
    summary: 'Match biometric records with each employee’s assigned schedule before applying attendance.',
    bestFor: ['Different departments and work hours', 'Shifting employees and rest days', 'Flexible or manager-assigned schedules'],
    flow: 'Pick range, department, schedule → Upload → Review matches → Apply',
    icon: CalendarRange,
  },
]

/** The file being imported, kept so it can be re-parsed with a manual column mapping. */
interface Source {
  name: string
  text: string
}

interface MappingDraft {
  headers: string[]
  sample: string[]
  mapping: ColumnMapping
}

const ACTION_META: Record<DailyImportRecord['action'], { label: string; tone: 'success' | 'brand' | 'neutral' | 'danger' }> = {
  create: { label: 'New', tone: 'success' },
  update: { label: 'Update', tone: 'brand' },
  unchanged: { label: 'Already imported', tone: 'neutral' },
  skip: { label: 'Skipped', tone: 'danger' },
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function LeaveNote({ resolution }: { resolution: { label: string; leaveLabel: string; detail?: string; review?: string } }) {
  return (
    <div className="mt-1 space-y-0.5">
      <Badge tone="brand" className="gap-1">
        <Plane className="size-3" />
        {resolution.label}
      </Badge>
      <p className="text-[11px] text-muted-foreground">{resolution.leaveLabel}</p>
      {resolution.detail && <p className="max-w-64 text-[11px] text-muted-foreground">{resolution.detail}</p>}
      {resolution.review && (
        <p className="flex max-w-64 items-start gap-1 text-[11px] font-medium text-warning">
          <AlertTriangle className="mt-px size-3 shrink-0" />
          Review: {resolution.review}
        </p>
      )}
    </div>
  )
}

/**
 * Imports raw punch logs from a ZKTeco ZK3969 terminal (USB attlog .dat, GLog .txt, or CSV export) and the
 * legacy FBS daily template. Punches are combined into one time-in / time-out per employee per day,
 * previewed with every invalid line explained, and only valid records are applied.
 */
export function ImportBiometricsDialog({ date, onImported }: { date: string; onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [tab, setTab] = useState<PreviewTab>('records')
  const [parseError, setParseError] = useState<string | null>(null)
  const [source, setSource] = useState<Source | null>(null)
  const [mappingDraft, setMappingDraft] = useState<MappingDraft | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useSession()
  const { notify } = useToast()
  const [method, setMethod] = useState<ImportMethod | null>(null)
  const [rangeFrom, setRangeFrom] = useState(() => mondayOf(date))
  const [rangeTo, setRangeTo] = useState(() => addDaysIso(mondayOf(date), 6))
  const [department, setDepartment] = useState('all')
  const [templateId, setTemplateId] = useState('all')
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [rowEdits, setRowEdits] = useState<Record<string, RowEdit>>({})
  const [flaggedOnly, setFlaggedOnly] = useState(true)
  const [recordEdits, setRecordEdits] = useState<Record<string, { timeIn?: string | null; timeOut?: string | null }>>({})
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set())

  // Options for the schedule-based filters.
  useEffect(() => {
    if (!open) return
    void getSchedules(user).then(setTemplates)
    void getEmployees(user).then((list) => setDepartments([...new Set(list.filter((e) => e.employment.status === 'active').map((e) => e.employment.department))].sort()))
  }, [open, user])

  function reset() {
    setMethod(null)
    setRowEdits({})
    setRecordEdits({})
    setEditingKeys(new Set())
    setFlaggedOnly(true)
    setFile(null)
    setPreview(null)
    setParseError(null)
    setTab('records')
    setSource(null)
    setMappingDraft(null)
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setParseError(null)
    e.target.value = ''
  }

  async function showPreview(sourceName: string, text: string, mapping?: ColumnMapping) {
    setSource({ name: sourceName, text })
    const [employees, existing, schedules] = await Promise.all([getEmployees(user), getAttendanceRecords(user), getSchedules(user)])
    const result = parseBiometricsFile(text, employees, existing, { mapping })
    if (result.headerError) {
      setParseError(result.headerError)
      // Unrecognised headers: let the admin map the columns by hand.
      if (result.columns) setMappingDraft({ headers: result.columns.headers, sample: result.columns.sample, mapping: result.columns.mapping })
      setPreview(null)
      return
    }
    if (result.records.length === 0 && result.issues.length === 0) {
      setParseError('No punch records found in the file.')
      return
    }
    // Approved leaves on the file's dates: leave overrides Absent, and punches on a leave day are flagged.
    const dates = result.records.map((r) => r.date).sort()
    const leaves = dates.length ? await getApprovedLeavesInRange(user, dates[0], dates[dates.length - 1]) : []
    const leave = annotateImportWithLeaves(result.records, leaves, employees, schedules)
    setParseError(null)
    setMappingDraft(null)
    setRowEdits({})
    setRecordEdits({})
    setEditingKeys(new Set())
    if (method === 'schedule') {
      if (!rangeFrom || !rangeTo || rangeFrom > rangeTo) {
        setParseError('Choose a valid date range (From must be on or before To).')
        return
      }
      // One day either side so overnight shifts can pick up the next morning's clock-out.
      const roster = await getRosterContext(user, addDaysIso(rangeFrom, -1), addDaysIso(rangeTo, 1))
      const match = buildScheduleMatch({ records: result.records, employees, roster, from: rangeFrom, to: rangeTo, department, templateId })
      setTab('review')
      setPreview({ sourceName, result, leave, match, roster })
      return
    }
    setTab(result.records.length === 0 ? 'issues' : 'records')
    setPreview({ sourceName, result, leave })
  }

  function applyMapping(mapping: ColumnMapping) {
    if (source) void showPreview(source.name, source.text, mapping)
  }

  function openMappingEditor() {
    const columns = preview?.result.columns
    if (!columns) return
    setMappingDraft({ headers: columns.headers, sample: columns.sample, mapping: columns.mapping })
    setPreview(null)
  }

  async function handleDownloadSample(kind: 'dat' | 'csv') {
    const employees = await getEmployees(user)
    if (kind === 'dat') downloadText('ZK3969_1_attlog.dat', buildSampleAttlog(employees, date))
    else downloadCsv(`ZK3969_attendance_${date}.csv`, toCsv(buildSampleZkCsv(employees, date)))
  }

  async function handleTrySample() {
    const employees = await getEmployees(user)
    await showPreview('the ZK3969 sample log', buildSampleAttlog(employees, date))
  }

  async function handleImport() {
    if (!file) return
    setIsProcessing(true)
    const name = file.name.toLowerCase()
    if (name.endsWith('.csv') || name.endsWith('.dat') || name.endsWith('.txt')) {
      try {
        const text = decodeBiometricsFile(await file.arrayBuffer())
        await showPreview(file.name, text)
      } catch {
        setParseError(`Couldn't read ${file.name}. Make sure it's the original attlog .dat, GLog .txt, or CSV exported from the device.`)
      } finally {
        setIsProcessing(false)
      }
      return
    }
    // .xlsx isn't parsed in this demo — fall back to the simulated import for the selected date.
    await new Promise((resolve) => setTimeout(resolve, 900))
    const result = await importBiometricsRecords(user, date, file.name)
    setIsProcessing(false)
    finish(result.importedCount, formatDate(date))
  }

  async function handleApply() {
    if (!preview) return
    setIsProcessing(true)
    const punches = preview.match
      ? scheduleRows.filter((r) => r.include && r.effectiveIn).map((r) => ({ employeeId: r.employee.id, date: r.date, timeIn: r.effectiveIn!, timeOut: r.effectiveOut }))
      : standardRows.filter((r) => r.apply && r.timeIn).map((r) => ({ employeeId: r.record.employeeId, date: r.record.date, timeIn: r.timeIn!, timeOut: r.timeOut }))
    const count = await applyBiometricsPunches(user, punches)
    setIsProcessing(false)
    const errors = preview.result.issues.filter((i) => i.severity === 'error').length
    const onLeave = preview.leave.byKey.size + preview.leave.leaveOnly.length
    finish(count, preview.sourceName, errors, onLeave)
  }

  function editRecord(key: string, patch: { timeIn?: string | null; timeOut?: string | null }) {
    setRecordEdits((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  }

  function editRow(key: string, patch: RowEdit) {
    setRowEdits((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  }

  function downloadIssues() {
    if (!preview) return
    downloadCsv(
      `biometrics-import-issues-${date}.csv`,
      toCsv([['Line', 'Severity', 'Problem', 'Raw line'], ...preview.result.issues.map((i) => [String(i.line), i.severity, i.message, i.raw.replace(/\t/g, ' ⇥ ')])]),
    )
  }

  function finish(count: number, context: string, skippedLines = 0, onLeave = 0) {
    notify({
      title: 'Biometrics import complete',
      description: `${count} attendance record${count === 1 ? '' : 's'} updated (${context})${skippedLines ? ` · ${skippedLines} invalid line${skippedLines === 1 ? '' : 's'} skipped` : ''}${onLeave ? ` · ${onLeave} on approved leave shown as On Leave` : ''}.`,
      tone: 'success',
    })
    reset()
    setOpen(false)
    onImported()
  }

  const result = preview?.result
  const isSchedule = Boolean(preview?.match)

  // Standard import: each record with any corrected times, and whether it still needs a look.
  const standardRows = useMemo(
    () =>
      (result?.records ?? []).map((record) => {
        const edit = recordEdits[record.key]
        const timeIn = edit?.timeIn !== undefined ? edit.timeIn : record.timeIn
        const timeOut = edit?.timeOut !== undefined ? edit.timeOut : record.timeOut
        const edited = timeIn !== record.timeIn || timeOut !== record.timeOut
        const flagReason = record.action === 'skip' ? null : !timeIn ? 'Missing time-in' : !timeOut ? 'Missing time-out — only one punch was recorded' : null
        const apply = record.action !== 'skip' && (record.action === 'create' || record.action === 'update' || edited) && Boolean(timeIn)
        return { record, timeIn, timeOut, edited, flagReason, apply }
      }),
    [result, recordEdits],
  )
  const scheduleRows = useMemo(() => (preview?.match?.rows ?? []).map((row) => effectiveRow(row, rowEdits[row.key])), [preview, rowEdits])
  const scheduleFlagged = scheduleRows.filter((r) => needsReview(r.flags)).length
  const scheduleIncluded = scheduleRows.filter((r) => r.include && r.effectiveIn).length
  const scheduleEdited = scheduleRows.filter((r) => r.edited).length
  const applicable = isSchedule ? scheduleIncluded : standardRows.filter((r) => r.apply).length
  const unchanged = result?.records.filter((r) => r.action === 'unchanged').length ?? 0
  const errorCount = result?.issues.filter((i) => i.severity === 'error').length ?? 0
  const warningCount = result?.issues.filter((i) => i.severity === 'warning').length ?? 0
  const dates = result ? [...new Set(result.records.map((r) => r.date))].sort() : []
  const onLeaveCount = preview ? preview.leave.byKey.size + preview.leave.leaveOnly.length : 0
  const reviewCount = preview ? [...preview.leave.byKey.values(), ...preview.leave.leaveOnly.map((l) => l.resolution)].filter((r) => r.review).length : 0

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" icon={<UploadCloud className="size-4" />}>
          Import Biometrics Record
        </Button>
      </DialogTrigger>
      <DialogContent className={preview ? 'max-w-5xl' : method === null ? 'max-w-3xl' : 'max-w-xl'}>
        <DialogTitle>Import Biometrics Record</DialogTitle>
        <DialogDescription>
          {preview
            ? isSchedule
              ? `Each scheduled day is matched with the punches in ${preview.sourceName}. Flagged punches can be corrected here before they’re applied.`
              : `Review what was read from ${preview.sourceName}. Valid records are applied; invalid lines are skipped and listed under Issues. Single-punch records can be corrected before applying.`
            : method === null
              ? 'Choose how the biometric log should be imported.'
              : 'Upload the punch log exported from your ZKTeco ZK3969 terminal (USB attlog .dat, GLog .txt, or CSV).'}
        </DialogDescription>

        {preview && result ? (
          <>
            <div className="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs">
              <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                <Cpu className="size-3.5 text-primary" />
                Detected: {result.format ? FORMAT_LABEL[result.format] : 'Unknown'}
              </p>
              {result.format && <p className="mt-1 text-muted-foreground">Field mapping: {FORMAT_MAPPING[result.format]}</p>}
              <p className="mt-1 text-muted-foreground">
                {result.stats.lines} line{result.stats.lines === 1 ? '' : 's'} read · {result.stats.punches} punch{result.stats.punches === 1 ? '' : 'es'}
                {dates.length > 0 && ` · ${dates.length === 1 ? formatDate(dates[0]) : `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`}`}
              </p>
            </div>

            {isSchedule && preview.match && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
                  <CalendarRange className="size-3.5" />
                  {formatDate(rangeFrom)} – {formatDate(rangeTo)} · {department === 'all' ? 'All departments' : department} · {templateId === 'all' ? 'All schedules' : (templates.find((t) => t.id === templateId)?.name ?? 'Schedule')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                  <CheckCircle2 className="size-3.5" />
                  {scheduleIncluded} record{scheduleIncluded === 1 ? '' : 's'} ready to apply
                </span>
                {scheduleFlagged > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 font-medium text-warning">
                    <AlertTriangle className="size-3.5" />
                    {scheduleFlagged} flagged for review
                  </span>
                )}
                {scheduleEdited > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                    <Pencil className="size-3.5" />
                    {scheduleEdited} edited
                  </span>
                )}
                {preview.match.excluded.uncoveredDays > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                    <Info className="size-3.5" />
                    {preview.match.excluded.uncoveredDays} day{preview.match.excluded.uncoveredDays === 1 ? '' : 's'} in the range have no punches in this file — not checked
                  </span>
                )}
                {preview.match.excluded.outsideRange + preview.match.excluded.outsideFilter + preview.match.excluded.unmapped > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                    <Info className="size-3.5" />
                    Not matched: {preview.match.excluded.outsideRange} outside the date range · {preview.match.excluded.outsideFilter} other departments or schedules · {preview.match.excluded.unmapped} unmapped
                  </span>
                )}
              </div>
            )}

            {!isSchedule && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                <CheckCircle2 className="size-3.5" />
                {applicable} record{applicable === 1 ? '' : 's'} ready to apply
              </span>
              {unchanged > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                  <Copy className="size-3.5" />
                  {unchanged} already imported (no change)
                </span>
              )}
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 font-medium text-danger">
                  <AlertCircle className="size-3.5" />
                  {errorCount} invalid line{errorCount === 1 ? '' : 's'} skipped
                  {result.stats.unmapped > 0 && ` (${result.stats.unmapped} unmapped ID${result.stats.unmapped === 1 ? '' : 's'})`}
                </span>
              )}
              {onLeaveCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  <Plane className="size-3.5" />
                  {onLeaveCount} on approved leave{reviewCount > 0 && ` · ${reviewCount} need review`}
                </span>
              )}
              {warningCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 font-medium text-warning">
                  <AlertTriangle className="size-3.5" />
                  {warningCount} duplicate punch{warningCount === 1 ? '' : 'es'} ignored
                </span>
              )}
            </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs font-medium">
                {(isSchedule
                  ? ([
                      { value: 'review', label: `Schedule Review (${scheduleRows.length})` },
                      { value: 'issues', label: `Issues (${result.issues.length})` },
                    ] as const)
                  : ([
                      { value: 'records', label: `Daily Records (${result.records.length})` },
                      { value: 'leave', label: `On Leave (${onLeaveCount})` },
                      { value: 'issues', label: `Issues (${result.issues.length})` },
                    ] as const)
                ).map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTab(t.value)}
                    className={cn('rounded-md px-3 py-1.5 transition-colors', tab === t.value ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {isSchedule && tab === 'review' && (
                  <label className="mr-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
                    Flagged only ({scheduleFlagged})
                  </label>
                )}
                {result.columns && (
                  <Button type="button" size="sm" variant="ghost" icon={<Columns3 className="size-3.5" />} onClick={openMappingEditor}>
                    Adjust Column Mapping
                  </Button>
                )}
                {result.issues.length > 0 && (
                  <Button type="button" size="sm" variant="ghost" icon={<FileWarning className="size-3.5" />} onClick={downloadIssues}>
                    Download Issue Log
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-2 max-h-80 overflow-auto rounded-xl border border-border">
              {tab === 'review' && isSchedule ? (
                <ScheduleReviewTable rows={scheduleRows} edits={rowEdits} onEdit={editRow} flaggedOnly={flaggedOnly} />
              ) : tab === 'records' ? (
                result.records.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">No valid punches to import — see Issues.</p>
                ) : (
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device ID → Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead>Punches</TableHead>
                        <TableHead>Verify</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standardRows.map(({ record: r, timeIn, timeOut, edited, flagReason }) => (
                        <TableRow key={r.key} className={cn(flagReason && 'bg-warning/[0.06]')}>
                          <TableCell>
                            <p className="font-medium">{r.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              User {r.deviceUserId} → {r.employeeNumber}
                            </p>
                          </TableCell>
                          <TableCell>{formatDate(r.date)}</TableCell>
                          {r.action !== 'skip' && (flagReason || edited || editingKeys.has(r.key)) ? (
                            <>
                              <TableCell>
                                <TimeEdit label="Time in" value={timeIn} edited={timeIn !== r.timeIn} onChange={(v) => editRecord(r.key, { timeIn: v })} />
                              </TableCell>
                              <TableCell>
                                <TimeEdit label="Time out" value={timeOut} edited={timeOut !== r.timeOut} onChange={(v) => editRecord(r.key, { timeOut: v })} />
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="tabular-nums">{r.timeIn ?? '—'}</TableCell>
                              <TableCell className="tabular-nums">
                                <span className="inline-flex items-center gap-1.5">
                                  {r.timeOut ?? '—'}
                                  {r.action !== 'skip' && (
                                    <button
                                      type="button"
                                      aria-label={`Edit ${r.employeeName}'s punches`}
                                      title="Edit punches"
                                      onClick={() => setEditingKeys((current) => new Set(current).add(r.key))}
                                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                      <Pencil className="size-3" />
                                    </button>
                                  )}
                                </span>
                              </TableCell>
                            </>
                          )}
                          <TableCell className="tabular-nums">{r.punchCount}</TableCell>
                          <TableCell className="text-muted-foreground">{r.verifyModes.join(', ') || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{r.deviceIds.join(', ') || '—'}</TableCell>
                          <TableCell className="whitespace-normal">
                            <Badge tone={ACTION_META[r.action].tone}>{ACTION_META[r.action].label}</Badge>
                            {flagReason && (
                              <p className="mt-0.5 flex max-w-56 items-start gap-1 text-[11px] font-medium text-warning">
                                <AlertTriangle className="mt-px size-3 shrink-0" />
                                {flagReason}. Fix it here or it&apos;s applied as is.
                              </p>
                            )}
                            {edited && (
                              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                                <Pencil className="size-3" />
                                Edited
                              </p>
                            )}
                            {r.action === 'update' && r.previous && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                was {r.previous.timeIn ?? '—'}–{r.previous.timeOut ?? '—'}
                              </p>
                            )}
                            {r.notes.map((n) => (
                              <p key={n} className={cn('mt-0.5 max-w-56 text-[11px]', r.action === 'skip' ? 'text-danger' : 'text-muted-foreground')}>
                                {n}
                              </p>
                            ))}
                            {preview.leave.byKey.get(r.key) && <LeaveNote resolution={preview.leave.byKey.get(r.key)!} />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : tab === 'leave' ? (
                onLeaveCount === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nobody in this file is on approved leave on these dates.</p>
                ) : (
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Punches in file</TableHead>
                        <TableHead>Attendance status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        ...result.records
                          .filter((r) => preview.leave.byKey.has(r.key))
                          .map((r) => ({ key: r.key, name: r.employeeName, number: r.employeeNumber, date: r.date, punches: `${r.timeIn ?? '—'} – ${r.timeOut ?? '—'}`, resolution: preview.leave.byKey.get(r.key)! })),
                        ...preview.leave.leaveOnly.map((l) => ({
                          key: l.key,
                          name: `${l.employee.personal.firstName} ${l.employee.personal.lastName}`,
                          number: l.employee.employeeNumber,
                          date: l.date,
                          punches: 'None',
                          resolution: l.resolution,
                        })),
                      ]
                        .sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number))
                        .map((row) => (
                          <TableRow key={row.key}>
                            <TableCell>
                              <p className="font-medium">{row.name}</p>
                              <p className="text-xs text-muted-foreground">{row.number}</p>
                            </TableCell>
                            <TableCell>{formatDate(row.date)}</TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">{row.punches}</TableCell>
                            <TableCell className="whitespace-normal">
                              <LeaveNote resolution={row.resolution} />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )
              ) : result.issues.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No issues — every line was read successfully.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Line</TableHead>
                      <TableHead>Problem</TableHead>
                      <TableHead>Raw line</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.issues.map((i) => (
                      <TableRow key={`${i.line}-${i.message}`}>
                        <TableCell className="tabular-nums text-muted-foreground">{i.line}</TableCell>
                        <TableCell>
                          <span className={cn('inline-flex items-start gap-1.5 text-xs font-medium', i.severity === 'error' ? 'text-danger' : 'text-warning')}>
                            {i.severity === 'error' ? <AlertCircle className="mt-px size-3.5 shrink-0" /> : <AlertTriangle className="mt-px size-3.5 shrink-0" />}
                            {i.message}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="block max-w-80 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground" title={i.raw}>
                            {i.raw.replace(/\t/g, ' ⇥ ').trim() || '(empty)'}
                          </code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <p className="max-w-md text-xs text-muted-foreground">
                {isSchedule
                  ? 'Only ticked rows with a time-in are written. Rows with no punch are left as they are — add a time-in to record one. Approved leave always shows as On Leave, never Absent.'
                  : 'Only New and Update records (and any you edited) are written; re-importing the same log changes nothing. Approved leave always shows as On Leave, never Absent.'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setPreview(null)}>
                  Back
                </Button>
                <Button type="button" onClick={handleApply} isLoading={isProcessing} disabled={applicable === 0}>
                  Apply {applicable} Record{applicable === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          </>
        ) : method === null ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className="flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <m.icon className="size-4" />
                    </span>
                    {m.title}
                  </span>
                  <span className="mt-2 text-xs text-muted-foreground">{m.summary}</span>
                  <span className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Best for</span>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                    {m.bestFor.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <span className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    <ListChecks className="mt-px size-3.5 shrink-0" />
                    {m.flow}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <span className="font-medium">{method === 'standard' ? 'Standard import' : 'Schedule-based import'}</span>
              <button type="button" className="text-primary hover:underline" onClick={() => { setMethod(null); setParseError(null) }}>
                Change method
              </button>
            </div>

            {method === 'schedule' && (
              <div className="mt-3 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold">Date range — from</p>
                  <Input type="date" value={rangeFrom} max={rangeTo || undefined} onChange={(e) => setRangeFrom(e.target.value)} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold">Date range — to</p>
                  <Input type="date" value={rangeTo} min={rangeFrom || undefined} onChange={(e) => setRangeTo(e.target.value)} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold">Department</p>
                  <Select value={department} onValueChange={setDepartment} options={[{ value: 'all', label: 'All departments' }, ...departments.map((d) => ({ value: d, label: d }))]} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold">Schedule</p>
                  <Select value={templateId} onValueChange={setTemplateId} options={[{ value: 'all', label: 'All schedules' }, ...templates.map((t) => ({ value: t.id, label: t.name }))]} />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  The system matches <span className="font-medium text-foreground">employee + date + assigned schedule + biometric record</span>, then shows a review screen. Schedules come from the Schedules roster.
                </p>
              </div>
            )}

            <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">ZKTeco ZK3969 exports are read directly</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">USB attlog (.dat)</span> — User ID, Date-Time, Device ID, In/Out State, Verify Mode
                    </li>
                    <li>
                      <span className="font-medium text-foreground">GLog (.txt)</span> — No, Mchn, EnNo, Name, Mode, IOMd, DateTime
                    </li>
                    <li>
                      <span className="font-medium text-foreground">CSV</span> — User ID / AC-No., Timestamp (or Date + Time), Verification Mode, In/Out State, Device ID
                    </li>
                  </ul>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Device User IDs map to employee IDs by number (User 6 → FR-0006). Punches become one time-in and time-out per employee per day.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" icon={<Download className="size-3.5" />} onClick={() => handleDownloadSample('dat')}>
                      Sample .dat
                    </Button>
                    <Button type="button" size="sm" variant="secondary" icon={<Download className="size-3.5" />} onClick={() => handleDownloadSample('csv')}>
                      Sample .csv
                    </Button>
                    <Button type="button" size="sm" variant="ghost" icon={<FlaskConical className="size-3.5" />} onClick={handleTrySample}>
                      Preview with Sample Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
              <UploadCloud className="size-8 text-muted-foreground" />
              {file ? <p className="text-sm font-medium">{file.name}</p> : <p className="text-sm text-muted-foreground">No file selected yet</p>}
              <Button type="button" size="sm" variant="secondary" icon={<Upload className="size-3.5" />} onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
              <input ref={fileInputRef} type="file" accept=".dat,.txt,.csv,.xlsx" className="hidden" onChange={onFileSelected} />
              <p className="text-[11px] text-muted-foreground">.dat, .txt, .csv · .xlsx is simulated for {formatDate(date)} in this demo</p>
            </div>

            {parseError && (
              <p className="mt-3 flex items-start gap-1.5 text-xs font-medium text-danger">
                <AlertCircle className="mt-px size-3.5 shrink-0" />
                {parseError}
              </p>
            )}
            {mappingDraft && (
              <ColumnMappingForm
                key={JSON.stringify(mappingDraft.mapping)}
                headers={mappingDraft.headers}
                sample={mappingDraft.sample}
                initial={mappingDraft.mapping}
                onApply={applyMapping}
                onCancel={() => setMappingDraft(null)}
              />
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {/* While mapping columns, the form's own "Apply Mapping & Preview" is the next step. */}
              {!mappingDraft && (
                <Button type="button" onClick={handleImport} isLoading={isProcessing} disabled={!file}>
                  Import & Preview
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
