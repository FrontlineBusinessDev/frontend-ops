import { buildXlsx, downloadBlob, type XlsxCell, type XlsxColumnType } from '@/lib/utils/xlsx'

/** What a report hands to "Export to Excel": the table exactly as exported (first row = header). */
export interface ExcelExport {
  filename: string
  rows: XlsxCell[][]
  /** Explicit summary row, styled bold with a double bottom border. */
  footer?: XlsxCell[]
  /** Append a TOTAL row summing every currency / decimal column (ignored when `footer` is given). */
  sumFooter?: boolean
  /** Per-column overrides, by header label, for columns the heuristics can't classify. */
  columnTypes?: Record<string, XlsxColumnType>
}

export interface ReportMetaItem {
  label: string
  value: string
}

export type PaperSize = 'letter' | 'a4'
export type PageOrientation = 'portrait' | 'landscape'

export const CONFIDENTIALITY_NOTE = 'Confidential — contains payroll information for internal use only.'

// ---------- Column typing ----------

const NUMERIC_PATTERN = /^\(?-?\s?₱?\s?-?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?\)?%?$/
const CURRENCY_HEADER = /(pay|share|amount|tax|deduction|contribution|cost|balance|principal|debit|credit|remittance|allowance|compensation|salary|wage|premium|earning|expense|\bee\b|\ber\b|\btotal\b|php|₱)/i
const NON_CURRENCY_HEADER = /(hour|hrs|day|count|employees|headcount|qty|quantity|units|rate %|%|percent|number|no\.|\bid\b)/i

function parseNumeric(value: XlsxCell): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw || !/\d/.test(raw) || !NUMERIC_PATTERN.test(raw)) return null
  // Keep zero-padded codes (e.g. "0012") as text — they're identifiers, not quantities.
  if (/^0\d/.test(raw)) return null
  const negative = raw.startsWith('(') || raw.includes('-')
  const isPercent = raw.endsWith('%')
  const n = Number(raw.replace(/[()₱,%\s-]/g, ''))
  if (!Number.isFinite(n)) return null
  const signed = negative ? -n : n
  return isPercent ? signed / 100 : signed
}

const IDENTIFIER_HEADER = /(\bid\b|\bno\.?$|number|code|\btin\b)/i

function inferColumnType(header: string, cells: XlsxCell[]): XlsxColumnType {
  if (IDENTIFIER_HEADER.test(header)) return 'text'
  const filled = cells.filter((c) => c !== null && c !== undefined && c !== '')
  if (filled.length === 0 || filled.some((c) => parseNumeric(c) === null)) return 'text'
  if (filled.some((c) => typeof c === 'string' && c.trim().endsWith('%'))) return 'percent'
  const hasPeso = filled.some((c) => typeof c === 'string' && c.includes('₱'))
  if (hasPeso || (CURRENCY_HEADER.test(header) && !NON_CURRENCY_HEADER.test(header))) return 'currency'
  return filled.every((c) => Number.isInteger(parseNumeric(c))) ? 'integer' : 'number'
}

function coerce(value: XlsxCell, type: XlsxColumnType): XlsxCell {
  if (type === 'text') return value === null || value === undefined ? '' : String(value)
  const n = parseNumeric(value)
  return n === null ? value : n
}

const TOTAL_LABEL = /^(grand\s+)?totals?$/i

/** Minimal RFC-4180 CSV parser — for reports whose export source is an existing CSV builder. */
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function stripExtension(value: string): string {
  return value.replace(/\.(csv|xlsx)$/i, '')
}

export function formatExportDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatGeneratedAt(date: Date): string {
  return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export function downloadReportWorkbook({
  companyName,
  title,
  meta,
  generatedBy,
  data,
}: {
  companyName: string
  title: string
  meta: ReportMetaItem[]
  generatedBy?: string
  data: ExcelExport
}) {
  const [headerRow = [], ...rest] = data.rows
  const header = headerRow.map((h) => String(h ?? ''))

  // A trailing "Total" row supplied inside `rows` is promoted to the styled summary row.
  let body = rest
  let footer = data.footer
  const last = body[body.length - 1]
  if (!footer && last && last.slice(0, 2).some((c) => typeof c === 'string' && TOTAL_LABEL.test(c.trim()))) {
    footer = last
    body = body.slice(0, -1)
  }

  const columnTypes = header.map((h, i) => data.columnTypes?.[h] ?? inferColumnType(h, body.map((r) => r[i])))
  const typedBody = body.map((r) => header.map((_, i) => coerce(r[i], columnTypes[i])))
  let typedFooter = footer ? header.map((_, i) => coerce(footer![i], columnTypes[i])) : undefined

  if (!typedFooter && data.sumFooter && typedBody.length > 0) {
    typedFooter = header.map((_, i) => {
      if (i === 0) return 'TOTAL'
      if (columnTypes[i] !== 'currency' && columnTypes[i] !== 'number') return ''
      const sum = typedBody.reduce<number>((s, r) => s + (typeof r[i] === 'number' ? (r[i] as number) : 0), 0)
      return Math.round(sum * 100) / 100
    })
  }

  const now = new Date()
  const metaParts = [...meta.map((m) => `${m.label}: ${m.value}`), `Exported on: ${formatExportDate(now)}`]
  if (generatedBy) metaParts.push(`Exported by: ${generatedBy}`)

  const blob = buildXlsx({
    sheetName: title,
    companyName,
    title,
    metaLine: metaParts.join('  |  '),
    header,
    columnTypes,
    body: typedBody,
    footer: typedFooter,
  })
  downloadBlob(`${stripExtension(data.filename)}.xlsx`, blob)
}

// ---------- PDF (print) ----------

let activeSetupCleanup: (() => void) | null = null

/**
 * Injects the report page setup (Letter/A4, 0.5in / 12.7mm margins, confidentiality note and
 * "Page X of Y" in every page footer) for one print job only, so the global @page rule other
 * printouts (payslips) rely on is untouched. Reports always print on a light page, even in
 * dark mode. Returns a cleanup that restores everything; calling it twice is harmless.
 */
export function installReportPrintSetup({ paper, orientation }: { paper: PaperSize; orientation: PageOrientation }): () => void {
  activeSetupCleanup?.()

  const size = paper === 'a4' ? 'A4' : 'letter'
  const margin = paper === 'a4' ? '12.7mm' : '0.5in'
  const footerFont = 'font-size: 7.5pt; color: #6b7280; font-family: Inter, system-ui, sans-serif;'

  const style = document.createElement('style')
  style.setAttribute('data-report-print', '')
  style.textContent = `
@page {
  size: ${size} ${orientation};
  margin: ${margin};
  @bottom-left { content: "${CONFIDENTIALITY_NOTE}"; ${footerFont} }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); ${footerFont} }
}`
  document.head.appendChild(style)

  const root = document.documentElement
  const wasDark = root.classList.contains('dark')
  if (wasDark) root.classList.remove('dark')

  const cleanup = () => {
    if (activeSetupCleanup !== cleanup) return
    activeSetupCleanup = null
    style.remove()
    if (wasDark) root.classList.add('dark')
  }
  activeSetupCleanup = cleanup
  return cleanup
}

export function isReportPrintSetupActive(): boolean {
  return activeSetupCleanup !== null
}

/** "Export to PDF": print the current report through the browser's Save-as-PDF with the report page setup. */
export function printReport(options: { paper: PaperSize; orientation: PageOrientation }) {
  const cleanup = installReportPrintSetup(options)
  // Let the page setup + light theme apply before the print dialog snapshots the page.
  requestAnimationFrame(() => {
    window.print()
    // print() blocks until the dialog closes; afterprint isn't fired reliably everywhere.
    cleanup()
  })
}
