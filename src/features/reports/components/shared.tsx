import { BarChart3, Download, FileText, Rows3, SquareStack, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
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

/** Wraps a selected report's view: title/description, an Export to Excel/CSV + PDF action pair, and print-hidden chrome around the printable content. */
export function ReportViewShell({
  title,
  description,
  onExportCsv,
  children,
}: {
  title: string
  description?: string
  onExportCsv?: () => void
  children: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="font-display text-base font-semibold tracking-tight">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onExportCsv && (
            <Button size="sm" variant="secondary" icon={<Download className="size-3.5" />} onClick={onExportCsv}>
              Export to Excel
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={<FileText className="size-3.5" />} onClick={() => window.print()}>
            Export to PDF
          </Button>
        </div>
      </div>
      <p className="mb-3 hidden font-display text-base font-semibold tracking-tight print:block">{title}</p>
      {children}
    </Card>
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

export function StatTile({ label, value, icon: Icon }: { label: string; value: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
      </div>
      <p className="mt-1 font-display text-lg font-semibold tracking-tight">{value}</p>
    </div>
  )
}
