import type { AttendanceRecord, Employee } from '@/types/domain'

/*
 * Biometrics import — parses raw punch logs from a ZKTeco ZK3969 (and compatible ZKTeco terminals) and
 * the legacy FBS daily template into one daily time-in / time-out record per employee per day.
 *
 * Supported layouts (auto-detected):
 *  1. USB "attlog" (.dat) — headerless, one punch per line, tab/space separated:
 *       <User ID> <YYYY-MM-DD HH:MM:SS> <Device ID> <In/Out State> <Verify Mode> <Work Code>
 *  2. USB "GLog" (.txt, often UTF-16) — tab separated with a header:
 *       No  Mchn  EnNo  Name  Mode  IOMd  DateTime
 *  3. CSV / delimited export (ZKTime / ZKBio software, or a hand-made sheet) — header names are matched
 *     by alias: User ID / AC-No. / EnNo / PIN, Date-Time (or separate Date + Time), Verify Mode, In/Out
 *     State, Device ID. Comma, semicolon, or tab delimited.
 *  4. Legacy FBS daily template — Employee ID, Date, Time In, Time Out, Log Type.
 *
 * Invalid lines (missing fields, malformed timestamps, unmapped IDs) are reported per line and skipped;
 * every valid line still imports. Exact duplicate punches and repeated taps within a minute are ignored.
 */

export type BiometricsFormat = 'zk_attlog' | 'zk_glog' | 'zk_csv' | 'generic_csv' | 'fbs_daily'

export const FORMAT_LABEL: Record<BiometricsFormat, string> = {
  zk_attlog: 'ZKTeco ZK3969 · USB attendance log (attlog .dat)',
  zk_glog: 'ZKTeco ZK3969 · USB GLog export (.txt)',
  zk_csv: 'ZKTeco ZK3969 · CSV / software export',
  generic_csv: 'Generic biometrics CSV (other device models)',
  fbs_daily: 'FBS daily template (CSV)',
}

export const FORMAT_MAPPING: Record<BiometricsFormat, string> = {
  zk_attlog: 'Col 1 User ID · Col 2 Date-Time · Col 3 Device ID · Col 4 In/Out State · Col 5 Verify Mode · Col 6 Work Code',
  zk_glog: 'EnNo → User ID · DateTime → Timestamp · Mode → Verify Mode · IOMd → In/Out State · Mchn → Device ID',
  zk_csv: 'Header columns matched by name (User ID / AC-No. / EnNo / PIN, Date-Time or Date + Time, Verify Mode, In/Out State, Device ID)',
  generic_csv: 'Header columns matched by name or mapped manually (Employee_ID / Badge_No, DateTime or Date + Time, State, Verify, Device)',
  fbs_daily: 'Employee ID · Date · Time In · Time Out · Log Type',
}

export type PunchState = 'check_in' | 'check_out' | 'break_out' | 'break_in' | 'ot_in' | 'ot_out'

export const PUNCH_STATE_LABEL: Record<PunchState, string> = {
  check_in: 'Check-In',
  check_out: 'Check-Out',
  break_out: 'Break-Out',
  break_in: 'Break-In',
  ot_in: 'OT-In',
  ot_out: 'OT-Out',
}

/** ZKTeco In/Out state codes (IOMd / "Status" / "State"). */
const STATE_CODES: Record<string, PunchState> = { '0': 'check_in', '1': 'check_out', '2': 'break_out', '3': 'break_in', '4': 'ot_in', '5': 'ot_out' }

/** ZKTeco verification mode codes. */
const VERIFY_CODES: Record<string, string> = {
  '0': 'Password',
  '1': 'Fingerprint',
  '2': 'Card',
  '3': 'Password',
  '4': 'Card',
  '9': 'Fingerprint + Password',
  '11': 'Card + Fingerprint',
  '15': 'Face',
  '25': 'Palm',
}

export interface ImportIssue {
  line: number
  raw: string
  message: string
  severity: 'error' | 'warning'
}

export interface ParsedPunch {
  line: number
  deviceUserId: string
  employeeId: string
  employeeNumber: string
  employeeName: string
  date: string
  /** HH:MM:SS */
  time: string
  state: PunchState | null
  verifyMode: string
  deviceId: string
}

export interface DailyImportRecord {
  key: string
  employeeId: string
  employeeNumber: string
  deviceUserId: string
  employeeName: string
  date: string
  /** HH:MM (seconds dropped — attendance stores minutes). */
  timeIn: string | null
  timeOut: string | null
  punchCount: number
  verifyModes: string[]
  deviceIds: string[]
  notes: string[]
  /** create / update an attendance record, skip because identical, or skip because unusable. */
  action: 'create' | 'update' | 'unchanged' | 'skip'
  previous?: { timeIn: string | null; timeOut: string | null }
}

/** Column index per field for header-based files (-1 = not in the file). */
export interface ColumnMapping {
  userId: number
  /** Combined date-time column — or use date + time. */
  timestamp: number
  date: number
  time: number
  state: number
  verify: number
  device: number
}

export const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string; required?: boolean; hint?: string }[] = [
  { key: 'userId', label: 'User / Employee ID', required: true },
  { key: 'timestamp', label: 'Date-Time (combined)', hint: 'Or map Date and Time separately' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'state', label: 'In/Out State' },
  { key: 'verify', label: 'Verification Mode' },
  { key: 'device', label: 'Device ID' },
]

export const EMPTY_MAPPING: ColumnMapping = { userId: -1, timestamp: -1, date: -1, time: -1, state: -1, verify: -1, device: -1 }

export interface BiometricsParseResult {
  format?: BiometricsFormat
  headerError?: string
  /** Header-based punch files: original header titles, the first data row, and the mapping that was applied. */
  columns?: { headers: string[]; sample: string[]; mapping: ColumnMapping; mappedManually: boolean }
  records: DailyImportRecord[]
  issues: ImportIssue[]
  stats: { lines: number; punches: number; duplicates: number; invalid: number; unmapped: number }
}

// ---------------------------------------------------------------- text helpers

/** Device exports are UTF-8/ASCII (attlog) or UTF-16LE with BOM (GLog .txt) — decode either. */
export function decodeBiometricsFile(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  // UTF-16LE without BOM: every other byte is NUL for ASCII content.
  if (bytes.length > 3 && bytes[1] === 0 && bytes[3] === 0) return new TextDecoder('utf-16le').decode(bytes)
  return new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '')
}

function splitDelimited(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') inQuotes = false
      else current += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === delimiter) {
      cells.push(current.trim())
      current = ''
    } else current += ch
  }
  cells.push(current.trim())
  return cells
}

function detectDelimiter(headerLine: string): string {
  const counts = [',', ';', '\t'].map((d) => ({ d, n: headerLine.split(d).length - 1 }))
  return counts.sort((a, b) => b.n - a.n)[0].n > 0 ? counts[0].d : ','
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || y < 2000 || y > 2100) return false
  return d <= new Date(y, m, 0).getDate()
}

/** Parses a date part: YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY (or DD/MM/YYYY when the first number > 12). */
function parseDatePart(raw: string): string | null {
  const s = raw.trim()
  let y: number, m: number, d: number
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (match) {
    ;[y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  } else {
    match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
    if (!match) return null
    const a = Number(match[1])
    const b = Number(match[2])
    y = Number(match[3])
    if (a > 12) [d, m] = [a, b]
    else [m, d] = [a, b]
  }
  return isRealDate(y, m, d) ? `${y}-${pad2(m)}-${pad2(d)}` : null
}

/** Parses a time part: H:MM, HH:MM:SS, with optional AM/PM. Returns HH:MM:SS. */
function parseTimePart(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/)
  if (!match) return null
  let h = Number(match[1])
  const min = Number(match[2])
  const sec = Number(match[3] ?? 0)
  const meridiem = match[4]?.toUpperCase()
  if (meridiem) {
    if (h < 1 || h > 12) return null
    if (meridiem === 'PM' && h !== 12) h += 12
    if (meridiem === 'AM' && h === 12) h = 0
  }
  if (h > 23 || min > 59 || sec > 59) return null
  return `${pad2(h)}:${pad2(min)}:${pad2(sec)}`
}

/** "2026-09-28 08:55:12", "2026/09/28  08:55:12", "9/28/2026 8:55 AM", "2026-09-28T08:55:12". */
function parseTimestamp(raw: string): { date: string; time: string } | null {
  const s = raw.trim().replace('T', ' ').replace(/\s+/g, ' ')
  const space = s.indexOf(' ')
  if (space < 0) return null
  const date = parseDatePart(s.slice(0, space))
  const time = parseTimePart(s.slice(space + 1))
  return date && time ? { date, time } : null
}

function parseState(raw: string | undefined): PunchState | null | 'invalid' {
  const v = (raw ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (!v) return null
  if (STATE_CODES[v]) return STATE_CODES[v]
  if (['c/in', 'checkin', 'in', 'i', 'timein', 'clockin'].includes(v)) return 'check_in'
  if (['c/out', 'checkout', 'out', 'o', 'timeout', 'clockout'].includes(v)) return 'check_out'
  if (['breakout', 'break/out'].includes(v)) return 'break_out'
  if (['breakin', 'break/in'].includes(v)) return 'break_in'
  if (['overtimein', 'otin', 'ot/in'].includes(v)) return 'ot_in'
  if (['overtimeout', 'otout', 'ot/out'].includes(v)) return 'ot_out'
  return 'invalid'
}

function parseVerify(raw: string | undefined): string {
  const v = (raw ?? '').trim()
  if (!v) return ''
  if (VERIFY_CODES[v]) return VERIFY_CODES[v]
  const lower = v.toLowerCase()
  if (['fp', 'finger', 'fingerprint'].includes(lower)) return 'Fingerprint'
  if (['face', 'facial'].includes(lower)) return 'Face'
  if (['card', 'rfid', 'rfid card', 'id card'].includes(lower)) return 'Card'
  if (['pw', 'pwd', 'password', 'pin'].includes(lower)) return 'Password'
  if (lower === 'palm') return 'Palm'
  return /^\d+$/.test(v) ? `Mode ${v}` : v
}

// ---------------------------------------------------------------- employee mapping

interface EmployeeMatcher {
  match: (deviceUserId: string) => { employee?: Employee; error?: string }
}

/**
 * Device User IDs are numeric PINs ("2", "00000002"); FBS employee IDs look like "FR-0002". A PIN maps to
 * the employee whose ID matches exactly, or whose numeric part equals the PIN (leading zeros ignored).
 */
function buildEmployeeMatcher(employees: Employee[]): EmployeeMatcher {
  const byNumber = new Map(employees.map((e) => [e.employeeNumber.toLowerCase(), e]))
  const byDigits = new Map<string, Employee[]>()
  for (const e of employees) {
    const digits = e.employeeNumber.replace(/\D/g, '').replace(/^0+/, '')
    if (!digits) continue
    byDigits.set(digits, [...(byDigits.get(digits) ?? []), e])
  }
  return {
    match(deviceUserId) {
      const id = deviceUserId.trim()
      const exact = byNumber.get(id.toLowerCase())
      if (exact) return { employee: exact }
      if (/^\d+$/.test(id)) {
        const candidates = byDigits.get(id.replace(/^0+/, '') || '0') ?? []
        if (candidates.length === 1) return { employee: candidates[0] }
        if (candidates.length > 1) return { error: `User ID ${id} matches more than one employee (${candidates.map((c) => c.employeeNumber).join(', ')})` }
      }
      return { error: `User ID ${id} isn't mapped to any employee` }
    },
  }
}

const fullName = (e: Employee) => `${e.personal.firstName} ${e.personal.lastName}`

// ---------------------------------------------------------------- column aliases (header-based formats)

const ALIASES = {
  userId: ['user id', 'userid', 'enno', 'en no', 'ac-no.', 'ac-no', 'ac no', 'acno', 'pin', 'employee id', 'employeeid', 'employee no', 'employee number', 'employee code', 'emp id', 'emp no', 'emp code', 'empcode', 'staff id', 'person id', 'badge no', 'badge no.', 'badge number', 'badgenumber', 'badge', 'bio id', 'biometric id', 'card no', 'id number', 'user no', 'user code', 'id', 'no.', 'no'],
  timestamp: ['timestamp', 'date/time', 'date-time', 'datetime', 'date time', 'log datetime', 'punch datetime', 'checktime', 'check time', 'attendance time', 'record time', 'time'],
  date: ['date', 'log date', 'punch date', 'attendance date', 'record date', 'work date'],
  timeOnly: ['time', 'log time', 'punch time', 'clock time'],
  verify: ['verification mode', 'verify mode', 'verifycode', 'verify code', 'verify type', 'verification', 'verify', 'mode'],
  state: ['in/out state', 'in/out', 'in out', 'inout', 'inout state', 'iomd', 'state', 'status', 'check type', 'checktype', 'punch state', 'punch type', 'direction', 'event'],
  device: ['device id', 'deviceid', 'device', 'device sn', 'device name', 'machine', 'machine id', 'mchn', 'machine no', 'terminal', 'terminal id', 'terminal sn', 'location id', 'serial no', 'sn'],
} as const

/** "Employee_ID" → "employee id", "  Badge   No " → "badge no" — so header titles match regardless of casing, underscores, or spacing. */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/_+/g, ' ').replace(/\s+/g, ' ').trim()
}

function findColumn(header: string[], aliases: readonly string[], exclude: number[] = []): number {
  for (const alias of aliases) {
    const idx = header.findIndex((h, i) => h === normalizeHeader(alias) && !exclude.includes(i))
    if (idx !== -1) return idx
  }
  return -1
}

// ---------------------------------------------------------------- main parser

export function parseBiometricsFile(
  text: string,
  employees: Employee[],
  existingRecords: AttendanceRecord[],
  options: { mapping?: ColumnMapping } = {},
): BiometricsParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const nonEmpty = lines.map((raw, i) => ({ raw, line: i + 1 })).filter((l) => l.raw.trim().length > 0)
  const empty: BiometricsParseResult = { records: [], issues: [], stats: { lines: 0, punches: 0, duplicates: 0, invalid: 0, unmapped: 0 } }
  if (nonEmpty.length === 0) return { ...empty, headerError: 'The file is empty.' }

  const matcher = buildEmployeeMatcher(employees)
  const issues: ImportIssue[] = []
  const first = nonEmpty[0].raw

  // Headerless attlog: first line starts with a user ID followed by a date-time.
  const ATTLOG_RE = /^\s*(\S+)\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\s*(.*)$/
  // Only numeric codes may follow the timestamp — a header row or CSV never matches. The first few lines are
  // checked so one garbled leading line doesn't hide the format.
  const looksLikeAttlog = !options.mapping && nonEmpty.slice(0, 5).some(({ raw }) => {
    const m = raw.match(ATTLOG_RE)
    return !!m && !/[a-z]/i.test(m[3]) && !raw.includes(',')
  })

  let format: BiometricsFormat
  let resultColumns: BiometricsParseResult['columns']
  let punches: ParsedPunch[] = []
  const dailyRows: { line: number; raw: string; employee: Employee; deviceUserId: string; date: string; timeIn: string; timeOut: string | null; verify: string }[] = []

  const addPunch = (line: number, raw: string, userIdRaw: string, ts: { date: string; time: string } | null, tsRaw: string, stateRaw: string | undefined, verifyRaw: string | undefined, deviceRaw: string | undefined) => {
    const userId = userIdRaw.trim()
    if (!userId) return issues.push({ line, raw, message: 'Missing User ID', severity: 'error' })
    if (!tsRaw.trim()) return issues.push({ line, raw, message: 'Missing timestamp', severity: 'error' })
    if (!ts) return issues.push({ line, raw, message: `Malformed timestamp "${tsRaw.trim()}" — expected e.g. 2026-09-28 08:55:12`, severity: 'error' })
    const state = parseState(stateRaw)
    if (state === 'invalid') return issues.push({ line, raw, message: `Unknown In/Out state "${stateRaw?.trim()}"`, severity: 'error' })
    const { employee, error } = matcher.match(userId)
    if (!employee) return issues.push({ line, raw, message: error ?? 'Unmapped User ID', severity: 'error' })
    if (employee.employment.status === 'archived') return issues.push({ line, raw, message: `${employee.employeeNumber} ${fullName(employee)} is archived`, severity: 'error' })
    punches.push({
      line,
      deviceUserId: userId,
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      employeeName: fullName(employee),
      date: ts.date,
      time: ts.time,
      state,
      verifyMode: parseVerify(verifyRaw),
      deviceId: (deviceRaw ?? '').trim(),
    })
  }

  if (looksLikeAttlog) {
    format = 'zk_attlog'
    for (const { raw, line } of nonEmpty) {
      const m = raw.match(ATTLOG_RE)
      if (!m) {
        // Distinguish "no timestamp at all" from a garbled one so the message is useful.
        const tabbed = raw.includes('\t')
        const cells = tabbed ? raw.split('\t').map((c) => c.trim()) : raw.trim().split(/\s+/)
        // Tab-separated: column 2 is the timestamp (empty → "Missing timestamp"). Otherwise take what follows the ID.
        const tsRaw = tabbed ? (cells[1] ?? '') : cells.slice(1, 3).join(' ')
        addPunch(line, raw, cells[0] ?? '', null, tsRaw, undefined, undefined, undefined)
        continue
      }
      const rest = m[3].trim() ? m[3].trim().split(/\s+/) : []
      const [device, state, verify] = rest
      addPunch(line, raw, m[1], parseTimestamp(m[2]), m[2], state, verify, device)
    }
  } else {
    const delimiter = detectDelimiter(first)
    const rawHeaders = splitDelimited(first, delimiter)
    const header = rawHeaders.map(normalizeHeader)
    const body = nonEmpty.slice(1)
    const sample = body[0] ? splitDelimited(body[0].raw, delimiter) : []

    const timeInCol = findColumn(header, ['time in', 'timein', 'in time'])
    const timeOutCol = findColumn(header, ['time out', 'timeout', 'out time'])

    if (!options.mapping && timeInCol !== -1 && timeOutCol !== -1) {
      // Legacy FBS daily template: one row per employee per day.
      format = 'fbs_daily'
      const idCol = findColumn(header, ALIASES.userId)
      const dateCol = findColumn(header, ALIASES.date)
      const logTypeCol = findColumn(header, ['log type', ...ALIASES.verify])
      const missing = [idCol === -1 && 'Employee ID', dateCol === -1 && 'Date'].filter(Boolean)
      if (missing.length) return { ...empty, format, headerError: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.` }
      for (const { raw, line } of body) {
        const cells = splitDelimited(raw, delimiter)
        const userId = cells[idCol] ?? ''
        const date = parseDatePart(cells[dateCol] ?? '')
        const timeIn = parseTimePart(cells[timeInCol] ?? '')
        const timeOutRaw = (cells[timeOutCol] ?? '').trim()
        const timeOut = timeOutRaw ? parseTimePart(timeOutRaw) : null
        if (!userId.trim()) {
          issues.push({ line, raw, message: 'Missing Employee ID', severity: 'error' })
          continue
        }
        if (!date) {
          issues.push({ line, raw, message: `Malformed date "${cells[dateCol] ?? ''}" — use YYYY-MM-DD`, severity: 'error' })
          continue
        }
        if (!timeIn) {
          issues.push({ line, raw, message: (cells[timeInCol] ?? '').trim() ? `Malformed Time In "${cells[timeInCol]}"` : 'Missing Time In', severity: 'error' })
          continue
        }
        if (timeOutRaw && !timeOut) {
          issues.push({ line, raw, message: `Malformed Time Out "${timeOutRaw}"`, severity: 'error' })
          continue
        }
        const { employee, error } = matcher.match(userId)
        if (!employee) {
          issues.push({ line, raw, message: error ?? 'Unmapped Employee ID', severity: 'error' })
          continue
        }
        dailyRows.push({ line, raw, employee, deviceUserId: userId.trim(), date, timeIn, timeOut, verify: parseVerify(cells[logTypeCol]) })
      }
    } else {
      let mapping: ColumnMapping
      if (options.mapping) {
        mapping = options.mapping
      } else {
        // Auto-detect from header titles.
        mapping = { ...EMPTY_MAPPING, userId: findColumn(header, ALIASES.userId) }
        mapping.timestamp = findColumn(header, ALIASES.timestamp.filter((a) => a !== 'time'))
        if (mapping.timestamp === -1) {
          mapping.date = findColumn(header, ALIASES.date)
          mapping.time = findColumn(header, ALIASES.timeOnly)
          // A lone "Time" column holding full date-times (ZKTime "No.,Name,AC-No.,Time,State").
          if (mapping.date === -1 && mapping.time !== -1) [mapping.timestamp, mapping.time] = [mapping.time, -1]
        }
        mapping.verify = findColumn(header, ALIASES.verify)
        mapping.state = findColumn(header, ALIASES.state)
        mapping.device = findColumn(header, ALIASES.device)
      }
      const { userId: idCol, timestamp: tsCol, date: dateCol, time: timeCol, verify: verifyCol, state: stateCol, device: deviceCol } = mapping
      // ZKTeco-specific header titles → ZK export; anything else (Employee_ID, Badge_No…) → generic.
      const ZK_HEADERS = ['user id', 'ac-no.', 'ac-no', 'enno', 'verification mode', 'verify code', 'verifycode', 'in/out state', 'iomd', 'mchn']
      format = header.includes('enno') && header.includes('iomd') ? 'zk_glog' : !options.mapping && header.some((h) => ZK_HEADERS.includes(h)) ? 'zk_csv' : 'generic_csv'
      const columns = { headers: rawHeaders, sample, mapping, mappedManually: !!options.mapping }

      const missing = [idCol === -1 && 'User ID', tsCol === -1 && (dateCol === -1 || timeCol === -1) && 'Date-Time (or Date + Time)'].filter(Boolean)
      if (missing.length) {
        return {
          ...empty,
          format,
          columns,
          headerError: `Couldn't find the ${missing.join(' and ')} column${missing.length > 1 ? 's' : ''}. Found: ${rawHeaders.filter(Boolean).join(', ') || 'no header'}. Map the columns below, or use a ZKTeco export (User ID / AC-No. / EnNo, Date-Time, Verify Mode, In/Out State, Device ID).`,
        }
      }
      resultColumns = columns
      for (const { raw, line } of body) {
        const cells = splitDelimited(raw, delimiter)
        if (tsCol === -1 && (cells[dateCol] ?? '').trim() && !(cells[timeCol] ?? '').trim()) {
          issues.push({ line, raw, message: 'Missing time', severity: 'error' })
          continue
        }
        if (tsCol === -1 && !(cells[dateCol] ?? '').trim() && (cells[timeCol] ?? '').trim()) {
          issues.push({ line, raw, message: 'Missing date', severity: 'error' })
          continue
        }
        const tsRaw = tsCol !== -1 ? (cells[tsCol] ?? '') : `${cells[dateCol] ?? ''} ${cells[timeCol] ?? ''}`.trim()
        addPunch(line, raw, cells[idCol] ?? '', tsRaw.trim() ? parseTimestamp(tsRaw) : null, tsRaw, stateCol === -1 ? undefined : cells[stateCol], verifyCol === -1 ? undefined : cells[verifyCol], deviceCol === -1 ? undefined : cells[deviceCol])
      }
    }
  }

  // ---- de-duplicate punches: exact repeats, and the same state tapped again within 60 seconds
  let duplicates = 0
  punches.sort((a, b) => a.employeeId.localeCompare(b.employeeId) || a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.line - b.line)
  const seconds = (t: string) => {
    const [h, m, s] = t.split(':').map(Number)
    return h * 3600 + m * 60 + s
  }
  punches = punches.filter((p, i) => {
    const prev = punches[i - 1]
    if (!prev || prev.employeeId !== p.employeeId || prev.date !== p.date) return true
    const exact = prev.time === p.time
    const doubleTap = seconds(p.time) - seconds(prev.time) < 60 && prev.state === p.state
    if (!exact && !doubleTap) return true
    duplicates++
    issues.push({
      line: p.line,
      raw: lines[p.line - 1] ?? '',
      message: exact ? `Duplicate punch (same as line ${prev.line}) — ignored` : `Repeated ${p.state ? PUNCH_STATE_LABEL[p.state] : 'punch'} within 1 minute of line ${prev.line} — ignored`,
      severity: 'warning',
    })
    return false
  })

  // ---- build daily records
  const existingByKey = new Map(existingRecords.map((r) => [`${r.employeeId}|${r.date}`, r]))
  const records: DailyImportRecord[] = []
  const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)

  if (format === 'fbs_daily') {
    const seen = new Map<string, number>()
    for (const row of dailyRows) {
      const key = `${row.employee.id}|${row.date}`
      if (seen.has(key)) {
        duplicates++
        issues.push({ line: row.line, raw: row.raw, message: `Duplicate row for ${row.employee.employeeNumber} on ${row.date} (line ${seen.get(key)} kept)`, severity: 'warning' })
        continue
      }
      seen.set(key, row.line)
      records.push({
        key,
        employeeId: row.employee.id,
        employeeNumber: row.employee.employeeNumber,
        deviceUserId: row.deviceUserId,
        employeeName: fullName(row.employee),
        date: row.date,
        timeIn: hhmm(row.timeIn),
        timeOut: hhmm(row.timeOut),
        punchCount: row.timeOut ? 2 : 1,
        verifyModes: row.verify ? [row.verify] : [],
        deviceIds: [],
        notes: row.timeOut ? [] : ['No time-out'],
        action: 'create',
      })
    }
  } else {
    const groups = new Map<string, ParsedPunch[]>()
    for (const p of punches) {
      const key = `${p.employeeId}|${p.date}`
      groups.set(key, [...(groups.get(key) ?? []), p])
    }
    for (const [key, group] of groups) {
      const sorted = [...group].sort((a, b) => a.time.localeCompare(b.time))
      const ins = sorted.filter((p) => p.state === 'check_in' || p.state === 'ot_in')
      const outs = sorted.filter((p) => p.state === 'check_out' || p.state === 'ot_out')
      const unknown = sorted.filter((p) => p.state === null)
      const breaks = sorted.filter((p) => p.state === 'break_out' || p.state === 'break_in').length
      const notes: string[] = []

      // Time in: first check-in; otherwise the first punch of the day that isn't a check-out.
      const firstIn = ins[0] ?? sorted.find((p) => p.state !== 'check_out' && p.state !== 'ot_out')
      // Time out: last check-out; otherwise (state not recorded) the last punch, if it comes after time in.
      let lastOut: ParsedPunch | undefined = outs[outs.length - 1]
      if (!lastOut && unknown.length && firstIn) {
        const last = sorted[sorted.length - 1]
        if (last !== firstIn && last.time > firstIn.time) lastOut = last
      }
      if (lastOut && firstIn && lastOut.time < firstIn.time) {
        notes.push('Check-out is earlier than check-in — check-out ignored')
        lastOut = undefined
      }
      if (!firstIn) notes.push('Only check-out punches — no time-in recorded')
      else if (!lastOut) notes.push('No check-out punch')
      if (breaks) notes.push(`${breaks} break punch${breaks === 1 ? '' : 'es'}`)
      if (!sorted.some((p) => p.state)) notes.push('In/Out state not recorded — first and last punch used')

      const p0 = sorted[0]
      records.push({
        key,
        employeeId: p0.employeeId,
        employeeNumber: p0.employeeNumber,
        deviceUserId: p0.deviceUserId,
        employeeName: p0.employeeName,
        date: p0.date,
        timeIn: hhmm(firstIn?.time ?? null),
        timeOut: hhmm(lastOut?.time ?? null),
        punchCount: sorted.length,
        verifyModes: [...new Set(sorted.map((p) => p.verifyMode).filter(Boolean))],
        deviceIds: [...new Set(sorted.map((p) => p.deviceId).filter(Boolean))],
        notes,
        action: firstIn ? 'create' : 'skip',
      })
    }
  }

  // ---- compare with what attendance already holds, so re-importing the same log is a no-op
  for (const r of records) {
    if (r.action === 'skip') continue
    const existing = existingByKey.get(r.key)
    if (!existing) continue
    r.previous = { timeIn: existing.timeIn ?? null, timeOut: existing.timeOut ?? null }
    r.action = existing.timeIn === r.timeIn && (existing.timeOut ?? null) === r.timeOut ? 'unchanged' : 'update'
  }

  records.sort((a, b) => a.date.localeCompare(b.date) || a.employeeNumber.localeCompare(b.employeeNumber))
  issues.sort((a, b) => a.line - b.line)
  const errors = issues.filter((i) => i.severity === 'error')
  return {
    format,
    columns: resultColumns,
    records,
    issues,
    stats: {
      lines: format === 'zk_attlog' ? nonEmpty.length : nonEmpty.length - 1,
      punches: format === 'fbs_daily' ? dailyRows.length : punches.length + duplicates,
      duplicates,
      invalid: errors.length,
      unmapped: errors.filter((i) => /isn't mapped|matches more than one/.test(i.message)).length,
    },
  }
}

// ---------------------------------------------------------------- sample data (mirrors a real ZK3969 USB export)

/** The device PIN for an employee: the numeric part of their employee ID without leading zeros ("FR-0006" → "6"). */
export function devicePinFor(employee: Employee): string {
  return employee.employeeNumber.replace(/\D/g, '').replace(/^0+/, '') || employee.employeeNumber
}

function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

interface SamplePunch {
  pin: string
  date: string
  time: string
  device: string
  state: string
  verify: string
}

/** Two days of punches for six employees — on time, late, undertime, breaks, a missed check-out — plus deliberate bad lines. */
function samplePunches(employees: Employee[], date: string): { punches: SamplePunch[]; bad: string[] } {
  const active = employees.filter((e) => e.employment.status === 'active').slice(0, 6)
  const days = [previousDay(date), date]
  const patterns: [string, string][][] = [
    // [time, state] per employee
    [['08:52:14', '0'], ['12:01:40', '2'], ['12:58:03', '3'], ['18:04:22', '1']],
    [['09:21:37', '0'], ['18:12:09', '1']],
    [['08:47:51', '0'], ['16:31:18', '1']],
    [['08:58:06', '0'], ['08:58:31', '0'], ['18:00:44', '1']], // double tap at check-in
    [['09:03:12', '0']], // forgot to check out
    [['08:55:29', '0'], ['18:30:02', '1'], ['19:00:15', '4'], ['21:02:47', '5']], // overtime
  ]
  const verifyModes = ['1', '15', '1', '4', '1', '15']
  const punches: SamplePunch[] = []
  days.forEach((day, d) =>
    active.forEach((e, i) => {
      const pattern = d === 0 ? patterns[(i + 2) % patterns.length] : patterns[i]
      pattern.forEach(([time, state]) => punches.push({ pin: devicePinFor(e), date: day, time, device: '1', state, verify: verifyModes[i] }))
    }),
  )
  return { punches, bad: ['9999', '2026-13-45 25:61:00', `${devicePinFor(active[0] ?? employees[0])}`] }
}

/** USB attlog (.dat): `<PIN>\t<YYYY-MM-DD HH:MM:SS>\t<Device>\t<State>\t<Verify>\t<WorkCode>` with right-aligned PINs. */
export function buildSampleAttlog(employees: Employee[], date: string): string {
  const { punches, bad } = samplePunches(employees, date)
  const line = (pin: string, ts: string, device: string, state: string, verify: string) => `${pin.padStart(9, ' ')}\t${ts}\t${device}\t${state}\t${verify}\t0`
  const out = punches.map((p) => line(p.pin, `${p.date} ${p.time}`, p.device, p.state, p.verify))
  // Deliberate problems for the validation demo: unmapped PIN, malformed timestamp, missing timestamp, exact duplicate.
  out.push(line(bad[0], `${date} 08:59:58`, '1', '0', '1'))
  out.push(line(bad[2], bad[1], '1', '0', '1'))
  out.push(`${bad[2].padStart(9, ' ')}\t\t1\t1\t1\t0`)
  if (punches[0]) out.push(line(punches[0].pin, `${punches[0].date} ${punches[0].time}`, punches[0].device, punches[0].state, punches[0].verify))
  return out.join('\r\n') + '\r\n'
}

/** CSV in the device/software export shape: User ID, Name, Timestamp, Verification Mode, In/Out State, Device ID. */
export function buildSampleZkCsv(employees: Employee[], date: string): string[][] {
  const { punches, bad } = samplePunches(employees, date)
  const byPin = new Map(employees.map((e) => [devicePinFor(e), e]))
  const VERIFY: Record<string, string> = { '1': 'Fingerprint', '15': 'Face', '4': 'Card' }
  const STATE: Record<string, string> = { '0': 'Check-In', '1': 'Check-Out', '2': 'Break-Out', '3': 'Break-In', '4': 'OT-In', '5': 'OT-Out' }
  const rows = punches.map((p) => {
    const e = byPin.get(p.pin)
    return [p.pin, e ? fullName(e) : '', `${p.date} ${p.time}`, VERIFY[p.verify] ?? p.verify, STATE[p.state] ?? p.state, p.device]
  })
  rows.push([bad[0], 'Unknown', `${date} 08:59:58`, 'Fingerprint', 'Check-In', '1'])
  rows.push([bad[2], '', bad[1], 'Fingerprint', 'Check-In', '1'])
  rows.push(['', '', `${date} 09:10:00`, 'Face', 'Check-In', '1'])
  return [['User ID', 'Name', 'Timestamp', 'Verification Mode', 'In/Out State', 'Device ID'], ...rows]
}
