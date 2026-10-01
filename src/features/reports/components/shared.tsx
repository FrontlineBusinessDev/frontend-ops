import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Banknote, BarChart3, Building2, CalendarClock, Check, ChevronDown, Download, FileText, HandCoins, HeartPulse, Home, Landmark, Printer, Receipt, Repeat, Rows3, ShieldCheck, SquareStack, UserCheck, UserX, Users, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  downloadReportWorkbook,
  formatGeneratedAt,
  installReportPrintSetup,
  isReportPrintSetupActive,
  printReport,
  type ExcelExport,
  type PageOrientation,
  type PaperSize,
  type ReportMetaItem,
} from '@/features/reports/reportExport'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { cn } from '@/lib/utils/cn'

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export interface ReportDef {
  id: string
  label: string
  description: string
}

export interface ReportCategory {
  label: string
  reports: ReportDef[]
}

/** One report tile in a category grid — selecting it navigates to that report's dedicated full-page view, carrying along the originating tab so "Back to Reports" can restore it. */
export function ReportCard({ report, tab }: { report: ReportDef; tab: 'basic' | 'advanced' }) {
  return (
    <Link
      to={`/reports/${report.id}?tab=${tab}`}
      className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <p className="text-sm font-medium">{report.label}</p>
      <p className="text-xs leading-snug text-muted-foreground">{report.description}</p>
    </Link>
  )
}

export function ReportCategorySection({ category, tab }: { category: ReportCategory; tab: 'basic' | 'advanced' }) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category.label}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {category.reports.map((report) => (
          <ReportCard key={report.id} report={report} tab={tab} />
        ))}
      </div>
    </div>
  )
}

/** Wraps a selected report's view: title/description, an Export to Excel (.xlsx) + PDF action pair, print-hidden chrome, and a print-only document header. */
export function ReportViewShell({
  title,
  description,
  meta = [],
  orientation: defaultOrientation = 'portrait',
  onExportExcel,
  children,
}: {
  title: string
  description?: string
  /** Report context (coverage period, department, employee…) shown in the PDF header and Excel row 3. */
  meta?: ReportMetaItem[]
  /** Default PDF orientation — wide tables start in landscape; the user can switch in the PDF menu. */
  orientation?: PageOrientation
  onExportExcel?: () => ExcelExport | Promise<ExcelExport>
  children: React.ReactNode
}) {
  const { user } = useSession()
  const { company } = useTenant()
  const [orientation, setOrientation] = useState<PageOrientation>(defaultOrientation)
  const [generatedAt, setGeneratedAt] = useState(() => new Date())
  const [exporting, setExporting] = useState(false)
  const companyName = company?.name ?? 'Frontline Business Solutions'
  const printOptions = useRef<{ paper: PaperSize; orientation: PageOrientation }>({ paper: 'letter', orientation: defaultOrientation })

  useEffect(() => {
    printOptions.current.orientation = orientation
  }, [orientation])

  // Browser-initiated prints (Ctrl+P) get the same page setup and a fresh "Generated" timestamp.
  useEffect(() => {
    let cleanup: (() => void) | null = null
    const onBeforePrint = () => {
      setGeneratedAt(new Date())
      if (!isReportPrintSetupActive()) cleanup = installReportPrintSetup(printOptions.current)
    }
    const onAfterPrint = () => {
      cleanup?.()
      cleanup = null
    }
    window.addEventListener('beforeprint', onBeforePrint)
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint)
      window.removeEventListener('afterprint', onAfterPrint)
      cleanup?.()
    }
  }, [])

  function onPrint(paper: PaperSize) {
    printOptions.current.paper = paper
    flushSync(() => setGeneratedAt(new Date()))
    printReport({ paper, orientation })
  }

  async function onExcel() {
    if (!onExportExcel) return
    setExporting(true)
    try {
      downloadReportWorkbook({ companyName, title, meta, generatedBy: user.name, data: await onExportExcel() })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card className="report-print p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="font-display text-base font-semibold tracking-tight">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onExportExcel && (
            <Button size="sm" variant="secondary" icon={<Download className="size-3.5" />} onClick={onExcel} disabled={exporting}>
              Export to Excel
            </Button>
          )}
          <PdfExportMenu orientation={orientation} onOrientationChange={setOrientation} onPrint={onPrint} />
        </div>
      </div>

      <ReportPrintHeader
        companyName={companyName}
        logoUrl={company?.logoUrl}
        title={title}
        description={description}
        meta={meta}
        generatedAt={generatedAt}
        generatedBy={user.name}
      />
      {children}
    </Card>
  )
}

const MENU_ITEM = 'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-muted'
const MENU_LABEL = 'px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'

function PdfExportMenu({
  orientation,
  onOrientationChange,
  onPrint,
}: {
  orientation: PageOrientation
  onOrientationChange: (o: PageOrientation) => void
  onPrint: (paper: PaperSize) => void
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button size="sm" variant="secondary" icon={<FileText className="size-3.5" />}>
          Export to PDF
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-56 rounded-xl border border-border bg-card p-1 shadow-soft-lg">
          <DropdownMenu.Label className={MENU_LABEL}>Orientation</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={orientation} onValueChange={(v) => onOrientationChange(v as PageOrientation)}>
            {(['portrait', 'landscape'] as const).map((o) => (
              <DropdownMenu.RadioItem key={o} value={o} onSelect={(e) => e.preventDefault()} className={MENU_ITEM}>
                <span className="flex size-3.5 items-center justify-center">
                  <DropdownMenu.ItemIndicator>
                    <Check className="size-3.5 text-primary" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {o === 'portrait' ? 'Portrait' : 'Landscape'}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Label className={MENU_LABEL}>Paper size</DropdownMenu.Label>
          <DropdownMenu.Item onSelect={() => onPrint('letter')} className={MENU_ITEM}>
            <Printer className="size-3.5 text-muted-foreground" />
            Letter
            <span className="ml-auto text-xs text-muted-foreground">8.5 × 11 in</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onPrint('a4')} className={MENU_ITEM}>
            <Printer className="size-3.5 text-muted-foreground" />
            A4
            <span className="ml-auto text-xs text-muted-foreground">210 × 297 mm</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** Standardized document header block — rendered only on paper / PDF. */
function ReportPrintHeader({
  companyName,
  logoUrl,
  title,
  description,
  meta,
  generatedAt,
  generatedBy,
}: {
  companyName: string
  logoUrl?: string
  title: string
  description?: string
  meta: ReportMetaItem[]
  generatedAt: Date
  generatedBy: string
}) {
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const details: ReportMetaItem[] = [...meta, { label: 'Generated', value: formatGeneratedAt(generatedAt) }, { label: 'Generated by', value: generatedBy }]

  return (
    <div className="report-print-header mb-4 hidden print:block">
      <div className="flex items-center justify-between gap-4 border-b-2 border-[#1e6f5e] pb-2.5">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="size-10 rounded-lg object-contain" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#1e6f5e] text-sm font-bold text-white">{initials}</div>
          )}
          <div>
            <p className="text-[13pt] font-bold leading-tight text-[#111827]">{companyName}</p>
            <p className="text-[8pt] text-[#6b7280]">Payroll &amp; HR Reports</p>
          </div>
        </div>
        <p className="text-right text-[7.5pt] font-semibold uppercase tracking-wide text-[#6b7280]">Confidential</p>
      </div>
      <p className="mt-3 text-[15pt] font-bold leading-tight text-[#111827]">{title}</p>
      {description && <p className="mt-0.5 text-[8.5pt] text-[#4b5563]">{description}</p>}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[8pt] text-[#374151]">
        {details.map((d) => (
          <p key={d.label}>
            <span className="font-semibold text-[#111827]">{d.label}:</span> {d.value}
          </p>
        ))}
      </div>
    </div>
  )
}

/** Unified top toolbar for a report's filter controls (employee combobox, department/branch selects, date range, etc.). */
export function ReportFilterBar({ children, onClear }: { children: ReactNode; onClear?: () => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <div className="flex flex-1 flex-wrap items-end gap-3">{children}</div>
      {onClear && (
        <Button size="sm" variant="ghost" icon={<X className="size-3.5" />} onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}

export function FilterLabel({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

export type ReportViewMode = 'graph' | 'table' | 'split'

const VIEW_MODE_OPTIONS: { value: ReportViewMode; label: string; icon: LucideIcon }[] = [
  { value: 'graph', label: 'Graph View', icon: BarChart3 },
  { value: 'table', label: 'Data Table', icon: Rows3 },
  { value: 'split', label: 'Split View', icon: SquareStack },
]

/** Graph/Table/Split toggle shown above analytics reports that pair a chart with its underlying table. */
export function ViewModeToggle({ value, onChange }: { value: ReportViewMode; onChange: (mode: ReportViewMode) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 print:hidden">
      {VIEW_MODE_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
            value === o.value ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <o.icon className="size-3.5" />
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface ViewPaneProps {
  mode: ReportViewMode
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}

/** Chart pane governed by a ViewModeToggle — hidden in Table mode, but always shown when printing so exports keep the visual. */
export function ChartPane({ mode, className, style, children }: ViewPaneProps) {
  return (
    <div className={cn(mode === 'table' && 'hidden', 'print:block', className)} style={style}>
      {children}
    </div>
  )
}

/** Table pane governed by a ViewModeToggle — hidden in Graph mode, but always shown when printing so exports keep the data. */
export function TablePane({ mode, className, style, children }: ViewPaneProps) {
  return (
    <div className={cn(mode === 'graph' && 'hidden', 'print:block', className)} style={style}>
      {children}
    </div>
  )
}

/** Picks a background icon from the tile's label so every summary tile gets the same watermark treatment as the dashboard cards. */
const TILE_ICONS: Array<[RegExp, LucideIcon]> = [
  [/inactive/i, UserX],
  [/active/i, UserCheck],
  [/employees? (paid|covered|affected)|^employees$|total employees/i, Users],
  [/philhealth/i, HeartPulse],
  [/pag-?ibig/i, Home],
  [/sss/i, ShieldCheck],
  [/tax/i, Receipt],
  [/loan/i, HandCoins],
  [/recurring|monthly/i, Repeat],
  [/scheduled|one-time/i, CalendarClock],
  [/cost|company/i, Building2],
  [/remit|statutory|contribution|share/i, Landmark],
  [/deduction|other/i, Banknote],
  [/gross|net|pay|compensation/i, Wallet],
]

export function StatTile({ label, value, icon }: { label: string; value: string; icon?: LucideIcon }) {
  const Icon = icon ?? TILE_ICONS.find(([pattern]) => pattern.test(label))?.[1] ?? FileText
  return (
    <div className="stat-tile relative isolate overflow-hidden rounded-xl border border-border bg-card p-4 shadow-soft">
      <Icon aria-hidden="true" className="pointer-events-none absolute -right-3 -top-3 -z-10 size-20 text-primary/10" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 font-display text-lg font-semibold tracking-tight">{value}</p>
    </div>
  )
}
