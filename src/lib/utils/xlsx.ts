/**
 * Minimal, dependency-free .xlsx writer for report exports — a single styled worksheet packaged
 * as an uncompressed (STORE) zip. Supports exactly what the report exports need: title rows,
 * a dark header row, typed number/currency/percent cells, zebra rows, a double-underlined totals
 * row, frozen header, padded column widths, and print setup (margins, orientation, page numbers).
 */

export type XlsxColumnType = 'text' | 'currency' | 'number' | 'integer' | 'percent'

export type XlsxCell = string | number | null | undefined

export interface XlsxSheetSpec {
  sheetName: string
  /** Rows 1–3 of the sheet (company, report title, filter metadata); row 4 is left blank. */
  companyName: string
  title: string
  metaLine: string
  header: string[]
  columnTypes: XlsxColumnType[]
  body: XlsxCell[][]
  footer?: XlsxCell[]
  orientation?: 'portrait' | 'landscape'
}

// ---------- Styles (cellXfs indexes) ----------

const NUMFMT_CURRENCY = 164
const NUMFMT_NUMBER = 165
const NUMFMT_INTEGER = 166
const NUMFMT_PERCENT = 167

const TYPE_ORDER: XlsxColumnType[] = ['text', 'currency', 'number', 'integer', 'percent']
const XF_COMPANY = 1
const XF_TITLE = 2
const XF_META = 3
const XF_HEADER_LEFT = 4
const XF_HEADER_RIGHT = 5
const XF_BODY_BASE = 6 // + type index (5 types)
const XF_ZEBRA_BASE = 11
const XF_TOTAL_BASE = 16

const NUMFMT_FOR_TYPE: Record<XlsxColumnType, number> = {
  text: 0,
  currency: NUMFMT_CURRENCY,
  number: NUMFMT_NUMBER,
  integer: NUMFMT_INTEGER,
  percent: NUMFMT_PERCENT,
}

function bodyXfs(fillId: number, borderId: number, fontId: number): string {
  return TYPE_ORDER.map((type) => {
    const numFmtId = NUMFMT_FOR_TYPE[type]
    const horizontal = type === 'text' ? 'left' : 'right'
    return `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${horizontal}" vertical="center"${type === 'text' ? ' wrapText="1"' : ''}/></xf>`
  }).join('')
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4">
<numFmt numFmtId="${NUMFMT_CURRENCY}" formatCode="&quot;₱&quot;#,##0.00;\\-&quot;₱&quot;#,##0.00"/>
<numFmt numFmtId="${NUMFMT_NUMBER}" formatCode="#,##0.00"/>
<numFmt numFmtId="${NUMFMT_INTEGER}" formatCode="#,##0"/>
<numFmt numFmtId="${NUMFMT_PERCENT}" formatCode="0.0%"/>
</numFmts>
<fonts count="6">
<font><sz val="10"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="14"/><color rgb="FF111827"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="12"/><color rgb="FF111827"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="9"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FF111827"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="4">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF1F2937"/></left><right style="thin"><color rgb="FF1F2937"/></right><top style="thin"><color rgb="FF1F2937"/></top><bottom style="thin"><color rgb="FF1F2937"/></bottom><diagonal/></border>
<border><left style="thin"><color rgb="FFE5E7EB"/></left><right style="thin"><color rgb="FFE5E7EB"/></right><top style="thin"><color rgb="FFE5E7EB"/></top><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border>
<border><left style="thin"><color rgb="FFE5E7EB"/></left><right style="thin"><color rgb="FFE5E7EB"/></right><top style="thin"><color rgb="FF1F2937"/></top><bottom style="double"><color rgb="FF1F2937"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="21">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>
${bodyXfs(0, 2, 0)}
${bodyXfs(3, 2, 0)}
${bodyXfs(4, 3, 5)}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

// ---------- Worksheet ----------

function escapeXml(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function columnLetter(index: number): string {
  let n = index + 1
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

function cellXml(ref: string, value: XlsxCell, styleId: number): string {
  if (value === null || value === undefined || value === '') return `<c r="${ref}" s="${styleId}"/>`
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${styleId}"><v>${value}</v></c>`
  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`
}

/** Display width (in characters) of a value once Excel applies the column's number format. */
function displayLength(value: XlsxCell, type: XlsxColumnType): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value !== 'number') return Math.max(...String(value).split('\n').map((l) => l.length))
  const abs = Math.abs(value)
  const sign = value < 0 ? 1 : 0
  if (type === 'percent') return (abs * 100).toFixed(1).length + 1 + sign
  const decimals = type === 'integer' ? 0 : 2
  const grouped = abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return grouped.length + sign + (type === 'currency' ? 1 : 0)
}

function worksheetXml(spec: XlsxSheetSpec): string {
  const { header, columnTypes, body, footer } = spec
  const colCount = header.length
  const headerRow = 5
  const firstBodyRow = headerRow + 1

  // Padded widths from header + every data cell (title rows are excluded so they don't bloat column A).
  const widths = header.map((h, i) => {
    const type = columnTypes[i] ?? 'text'
    let max = h.length + 2 // header is bold + may carry a filter-style gap
    for (const row of footer ? [...body, footer] : body) max = Math.max(max, displayLength(row[i], type))
    return Math.min(Math.max(max + 3, 10), 60)
  })

  const rows: string[] = []
  rows.push(`<row r="1" ht="22" customHeight="1">${cellXml('A1', spec.companyName, XF_COMPANY)}</row>`)
  rows.push(`<row r="2" ht="18" customHeight="1">${cellXml('A2', spec.title, XF_TITLE)}</row>`)
  rows.push(`<row r="3">${cellXml('A3', spec.metaLine, XF_META)}</row>`)
  rows.push(`<row r="4"/>`)
  rows.push(
    `<row r="${headerRow}" ht="20" customHeight="1">${header
      .map((h, i) => cellXml(`${columnLetter(i)}${headerRow}`, h, (columnTypes[i] ?? 'text') === 'text' ? XF_HEADER_LEFT : XF_HEADER_RIGHT))
      .join('')}</row>`,
  )
  body.forEach((row, r) => {
    const rowNumber = firstBodyRow + r
    const base = r % 2 === 1 ? XF_ZEBRA_BASE : XF_BODY_BASE
    const cells = Array.from({ length: colCount }, (_, i) => cellXml(`${columnLetter(i)}${rowNumber}`, row[i], base + TYPE_ORDER.indexOf(columnTypes[i] ?? 'text')))
    rows.push(`<row r="${rowNumber}">${cells.join('')}</row>`)
  })
  let lastRow = firstBodyRow + body.length - 1
  if (footer) {
    lastRow += 1
    const cells = Array.from({ length: colCount }, (_, i) =>
      cellXml(`${columnLetter(i)}${lastRow}`, footer[i], XF_TOTAL_BASE + TYPE_ORDER.indexOf(columnTypes[i] ?? 'text')),
    )
    rows.push(`<row r="${lastRow}" ht="18" customHeight="1">${cells.join('')}</row>`)
  }

  const lastCol = columnLetter(Math.max(colCount - 1, 0))
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
  const orientation = spec.orientation ?? (colCount > 7 ? 'landscape' : 'portrait')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${lastCol}${Math.max(lastRow, headerRow)}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${headerRow}" topLeftCell="A${firstBodyRow}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${firstBodyRow}" sqref="A${firstBodyRow}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rows.join('')}</sheetData>
<printOptions horizontalCentered="1"/>
<pageMargins left="0.5" right="0.5" top="0.5" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="1" orientation="${orientation}" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;L&amp;8Confidential — for internal use only&amp;R&amp;8Page &amp;P of &amp;N</oddFooter></headerFooter>
</worksheet>`
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Report'
}

function workbookFiles(spec: XlsxSheetSpec): { name: string; content: string }[] {
  const sheetName = escapeXml(sanitizeSheetName(spec.sheetName))
  const headerRow = 5
  return [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'${sheetName.replace(/'/g, "''")}'!$${headerRow}:$${headerRow}</definedName></definedNames>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: 'xl/styles.xml', content: STYLES_XML },
    { name: 'xl/worksheets/sheet1.xml', content: worksheetXml(spec) },
  ]
}

// ---------- Zip (STORE) ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function zipStore(files: { name: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder()
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const data = encoder.encode(file.content)
    const crc = crc32(data)

    const local = new Uint8Array(30 + nameBytes.length + data.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true) // UTF-8 names
    lv.setUint16(8, 0, true) // STORE
    lv.setUint16(10, dosTime, true)
    lv.setUint16(12, dosDate, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)
    local.set(data, 30 + nameBytes.length)
    locals.push(local)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, dosTime, true)
    cv.setUint16(14, dosDate, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centrals.push(central)

    offset += local.length
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + centralSize + end.length)
  let pos = 0
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

export function buildXlsx(spec: XlsxSheetSpec): Blob {
  const bytes = zipStore(workbookFiles(spec))
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
