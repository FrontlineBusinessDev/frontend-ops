import { AlertCircle, AlertTriangle, CheckCircle2, Columns3, Copy, Cpu, Download, FileWarning, FlaskConical, Info, Plane, Upload, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
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
import { annotateImportWithLeaves, type ImportLeaveContext } from '@/features/attendance/leaveStatus'
import { downloadCsv, toCsv } from '@/features/reports/components/shared'
import { useSession } from '@/hooks/useSession'
import { applyBiometricsPunches, getApprovedLeavesInRange, getAttendanceRecords, getSchedules, importBiometricsRecords } from '@/lib/services/attendanceService'
import { getEmployees } from '@/lib/services/employeeService'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

interface Preview {
  sourceName: string
  result: BiometricsParseResult
  leave: ImportLeaveContext
}

type PreviewTab = 'records' | 'leave' | 'issues'

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

  function reset() {
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
    const toApply = preview.result.records.filter((r) => (r.action === 'create' || r.action === 'update') && r.timeIn)
    const count = await applyBiometricsPunches(
      user,
      toApply.map((r) => ({ employeeId: r.employeeId, date: r.date, timeIn: r.timeIn!, timeOut: r.timeOut })),
    )
    setIsProcessing(false)
    const errors = preview.result.issues.filter((i) => i.severity === 'error').length
    const onLeave = preview.leave.byKey.size + preview.leave.leaveOnly.length
    finish(count, preview.sourceName, errors, onLeave)
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
  const applicable = result?.records.filter((r) => r.action === 'create' || r.action === 'update').length ?? 0
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
      <DialogContent className={preview ? 'max-w-5xl' : 'max-w-xl'}>
        <DialogTitle>Import Biometrics Record</DialogTitle>
        <DialogDescription>
          {preview
            ? `Review what was read from ${preview.sourceName}. Valid records are applied; invalid lines are skipped and listed under Issues.`
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs font-medium">
                {(
                  [
                    { value: 'records', label: `Daily Records (${result.records.length})` },
                    { value: 'leave', label: `On Leave (${onLeaveCount})` },
                    { value: 'issues', label: `Issues (${result.issues.length})` },
                  ] as const
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
              <div className="flex flex-wrap gap-1">
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
              {tab === 'records' ? (
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
                      {result.records.map((r) => (
                        <TableRow key={r.key}>
                          <TableCell>
                            <p className="font-medium">{r.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              User {r.deviceUserId} → {r.employeeNumber}
                            </p>
                          </TableCell>
                          <TableCell>{formatDate(r.date)}</TableCell>
                          <TableCell className="tabular-nums">{r.timeIn ?? '—'}</TableCell>
                          <TableCell className="tabular-nums">{r.timeOut ?? '—'}</TableCell>
                          <TableCell className="tabular-nums">{r.punchCount}</TableCell>
                          <TableCell className="text-muted-foreground">{r.verifyModes.join(', ') || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{r.deviceIds.join(', ') || '—'}</TableCell>
                          <TableCell className="whitespace-normal">
                            <Badge tone={ACTION_META[r.action].tone}>{ACTION_META[r.action].label}</Badge>
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
              <p className="max-w-md text-xs text-muted-foreground">Only New and Update records are written; re-importing the same log changes nothing. Approved leave always shows as On Leave, never Absent.</p>
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
        ) : (
          <>
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
