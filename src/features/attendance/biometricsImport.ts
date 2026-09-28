import type { Employee } from '@/types/domain'

export const BIOMETRICS_COLUMNS = ['Employee ID', 'Date', 'Time In', 'Time Out', 'Log Type'] as const

export interface BiometricsPreviewRow {
  line: number
  employeeNumber: string
  employeeId?: string
  employeeName?: string
  date: string
  timeIn: string | null
  timeOut: string | null
  logType: string
  error?: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const LOG_TYPES = ['Fingerprint', 'Face', 'RFID Card']

/** One representative day per employee: on-time, late, undertime, and a missing punch-out. */
const SAMPLE_PATTERNS: { timeIn: string; timeOut: string }[] = [
  { timeIn: '08:55', timeOut: '18:03' },
  { timeIn: '09:22', timeOut: '18:10' },
  { timeIn: '08:48', timeOut: '16:35' },
  { timeIn: '08:59', timeOut: '18:01' },
  { timeIn: '09:05', timeOut: '' },
  { timeIn: '08:51', timeOut: '18:07' },
]

export function buildSampleBiometricsRows(employees: Employee[], date: string): string[][] {
  const active = employees.filter((e) => e.employment.status === 'active').slice(0, SAMPLE_PATTERNS.length)
  return active.map((e, i) => [e.employeeNumber, date, SAMPLE_PATTERNS[i].timeIn, SAMPLE_PATTERNS[i].timeOut, LOG_TYPES[i % LOG_TYPES.length]])
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

/** Accepts "8:05" as well as "08:05" — biometric exports often drop the leading zero. */
function normalizeTime(value: string): string {
  return /^\d:\d{2}$/.test(value) ? `0${value}` : value
}

export function parseBiometricsCsv(text: string, employees: Employee[]): { rows: BiometricsPreviewRow[]; headerError?: string } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { rows: [], headerError: 'The file is empty.' }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const indexOf = (col: string) => header.indexOf(col.toLowerCase())
  const missing = BIOMETRICS_COLUMNS.filter((c) => c !== 'Log Type' && indexOf(c) === -1)
  if (missing.length > 0) return { rows: [], headerError: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.` }

  const byNumber = new Map(employees.map((e) => [e.employeeNumber.toLowerCase(), e]))
  const rows = lines.slice(1).map((line, i): BiometricsPreviewRow => {
    const cells = splitCsvLine(line)
    const get = (col: string) => cells[indexOf(col)] ?? ''
    const employeeNumber = get('Employee ID')
    const date = get('Date')
    const timeIn = normalizeTime(get('Time In'))
    const timeOut = normalizeTime(get('Time Out'))
    const employee = byNumber.get(employeeNumber.toLowerCase())

    let error: string | undefined
    if (!employeeNumber) error = 'Missing Employee ID'
    else if (!employee) error = 'Employee ID not found'
    else if (!DATE_RE.test(date)) error = 'Date must be YYYY-MM-DD'
    else if (!timeIn) error = 'Missing Time In'
    else if (!TIME_RE.test(timeIn)) error = 'Time In must be HH:MM'
    else if (timeOut && !TIME_RE.test(timeOut)) error = 'Time Out must be HH:MM'

    return {
      line: i + 2,
      employeeNumber,
      employeeId: employee?.id,
      employeeName: employee ? `${employee.personal.firstName} ${employee.personal.lastName}` : undefined,
      date,
      timeIn: timeIn || null,
      timeOut: timeOut || null,
      logType: indexOf('Log Type') === -1 ? '' : get('Log Type'),
      error,
    }
  })
  return { rows }
}
