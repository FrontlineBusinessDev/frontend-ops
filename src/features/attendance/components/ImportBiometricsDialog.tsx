import { Upload, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { importBiometricsRecords } from '@/lib/services/attendanceService'
import { formatDate } from '@/lib/utils/format'

export function ImportBiometricsDialog({ date, onImported }: { date: string; onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useSession()
  const { notify } = useToast()

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
  }

  async function handleImport() {
    if (!file) return
    setIsProcessing(true)
    // Simulated processing delay — no real file parsing happens; see importBiometricsRecords.
    await new Promise((resolve) => setTimeout(resolve, 900))
    const result = await importBiometricsRecords(user, date, file.name)
    setIsProcessing(false)
    notify({
      title: 'Biometrics import complete',
      description: `${result.importedCount} record${result.importedCount === 1 ? '' : 's'} updated for ${formatDate(date)}.`,
      tone: 'success',
    })
    setFile(null)
    setOpen(false)
    onImported()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setFile(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" icon={<UploadCloud className="size-4" />}>
          Import Biometrics Record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Import Biometrics Record</DialogTitle>
        <DialogDescription>
          Upload a raw biometrics punch log (.csv, .xlsx, or .dat) for {formatDate(date)}. Time-in/time-out records will be
          previewed and applied automatically.
        </DialogDescription>

        <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
          <UploadCloud className="size-8 text-muted-foreground" />
          {file ? (
            <p className="text-sm font-medium">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No file selected yet</p>
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
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.dat" className="hidden" onChange={onFileSelected} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} isLoading={isProcessing} disabled={!file}>
            Import & Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
