import { AlertCircle, CheckCircle2, Download, FlaskConical, Info, Upload, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { BIOMETRICS_COLUMNS, buildSampleBiometricsRows, parseBiometricsCsv } from '@/features/attendance/biometricsImport'
import type { BiometricsPreviewRow } from '@/features/attendance/biometricsImport'
import { downloadCsv, toCsv } from '@/features/reports/components/shared'
import { useSession } from '@/hooks/useSession'
import { applyBiometricsPunches, importBiometricsRecords } from '@/lib/services/attendanceService'
import { getEmployees } from '@/lib/services/employeeService'
import { formatDate } from '@/lib/utils/format'

interface Preview {
  sourceName: string
  rows: BiometricsPreviewRow[]
}

export function ImportBiometricsDialog({ date, onImported }: { date: string; onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useSession()
  const { notify } = useToast()

  function reset() {
    setFile(null)
    setPreview(null)
    setParseError(null)
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setParseError(null)
    e.target.value = ''
  }

  function showPreview(sourceName: string, text: string, employees: Awaited<ReturnType<typeof getEmployees>>) {
    const result = parseBiometricsCsv(text, employees)
    if (result.headerError) {
      setParseError(result.headerError)
      return
    }
    if (result.rows.length === 0) {
      setParseError('No punch rows found below the header.')
      return
    }
    setPreview({ sourceName, rows: result.rows })
  }

  async function handleDownloadSample() {
    const employees = await getEmployees(user)
    downloadCsv(`biometrics-sample-${date}.csv`, toCsv([[...BIOMETRICS_COLUMNS], ...buildSampleBiometricsRows(employees, date)]))
  }

  async function handleTrySample() {
    const employees = await getEmployees(user)
    const csv = toCsv([[...BIOMETRICS_COLUMNS], ...buildSampleBiometricsRows(employees, date)])
    showPreview('the sample data', csv, employees)
  }

  async function handleImport() {
    if (!file) return
    setIsProcessing(true)
    if (file.name.toLowerCase().endsWith('.csv')) {
      const [text, employees] = await Promise.all([file.text(), getEmployees(user)])
      setIsProcessing(false)
      showPreview(file.name, text, employees)
      return
    }
    // .xlsx / .dat aren't parsed in this demo — fall back to the simulated import for the selected date.
    await new Promise((resolve) => setTimeout(resolve, 900))
    const result = await importBiometricsRecords(user, date, file.name)
    setIsProcessing(false)
    finish(result.importedCount, formatDate(date))
  }

  async function handleApply() {
    if (!preview) return
    setIsProcessing(true)
    const valid = preview.rows.filter((r) => !r.error && r.employeeId && r.timeIn)
    const count = await applyBiometricsPunches(
      user,
      valid.map((r) => ({ employeeId: r.employeeId!, date: r.date, timeIn: r.timeIn!, timeOut: r.timeOut })),
    )
    setIsProcessing(false)
    finish(count, preview.sourceName)
  }

  function finish(count: number, context: string) {
    notify({
      title: 'Biometrics import complete',
      description: `${count} record${count === 1 ? '' : 's'} updated (${context}).`,
      tone: 'success',
    })
    reset()
    setOpen(false)
    onImported()
  }

  const validCount = preview?.rows.filter((r) => !r.error).length ?? 0
  const skippedCount = (preview?.rows.length ?? 0) - validCount

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
      <DialogContent className={preview ? 'max-w-3xl' : undefined}>
        <DialogTitle>Import Biometrics Record</DialogTitle>
        <DialogDescription>
          {preview
            ? `Review the parsed punches from ${preview.sourceName} before applying them to attendance.`
            : `Upload a raw biometrics punch log (.csv, .xlsx, or .dat). CSV logs are parsed and previewed before applying; .xlsx and .dat files are simulated for ${formatDate(date)}.`}
        </DialogDescription>

        {preview ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 font-medium text-success">
                <CheckCircle2 className="size-3.5" />
                {validCount} ready to apply
              </span>
              {skippedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-1 font-medium text-danger">
                  <AlertCircle className="size-3.5" />
                  {skippedCount} will be skipped
                </span>
              )}
            </div>

            <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Log Type</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.line}>
                      <TableCell className="font-medium">{row.employeeNumber || '—'}</TableCell>
                      <TableCell>{row.employeeName ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.date || '—'}</TableCell>
                      <TableCell className="tabular-nums">{row.timeIn ?? '—'}</TableCell>
                      <TableCell className="tabular-nums">{row.timeOut ?? '—'}</TableCell>
                      <TableCell>{row.logType || '—'}</TableCell>
                      <TableCell>
                        {row.error ? (
                          <span className="text-xs font-medium text-danger">
                            Line {row.line}: {row.error}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-success">Ready</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPreview(null)}>
                Back
              </Button>
              <Button type="button" onClick={handleApply} isLoading={isProcessing} disabled={validCount === 0}>
                Apply {validCount} Record{validCount === 1 ? '' : 's'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Use the sample data as reference format for importing biometrics</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expected columns: <span className="font-medium text-foreground">{BIOMETRICS_COLUMNS.join(', ')}</span> (Log Type is
                    optional). Dates use YYYY-MM-DD and times use 24-hour HH:MM.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" icon={<Download className="size-3.5" />} onClick={handleDownloadSample}>
                      Download Sample CSV
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
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No file selected yet</p>
              )}
              <Button type="button" size="sm" variant="secondary" icon={<Upload className="size-3.5" />} onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.dat" className="hidden" onChange={onFileSelected} />
            </div>

            {parseError && <p className="mt-3 text-xs font-medium text-danger">{parseError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleImport} isLoading={isProcessing} disabled={!file}>
                Import & Preview
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
