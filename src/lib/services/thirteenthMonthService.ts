import { getEmployees } from '@/lib/services/employeeService'
import { marginalTaxRateFor } from '@/lib/services/payrollService'
import { monthlyEquivalentFor } from '@/lib/payroll/rateBasis'
import { db } from '@/mock-data'
import type { Employee, SessionUser, ThirteenthMonthLine, ThirteenthMonthRun, ThirteenthMonthSelection } from '@/types/domain'

export async function getThirteenthMonthRuns(session: SessionUser): Promise<ThirteenthMonthRun[]> {
  return db.thirteenthMonthRuns.filter((r) => r.companyId === session.companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getThirteenthMonthLines(session: SessionUser, runId: string): Promise<ThirteenthMonthLine[]> {
  return db.thirteenthMonthLines.filter((l) => l.companyId === session.companyId && l.runId === runId)
}

// ---------- Calculation rules ----------

/** 13th Month Pay (plus other benefits) is non-taxable up to this amount per year; only the excess is withheld. */
export const THIRTEENTH_MONTH_TAX_EXEMPT_CEILING = 90_000
/** Working days per month and hours per day used to turn the monthly basic into daily/hourly deduction rates (same basis as payroll's 11 working days per half-month). */
const WORKING_DAYS_PER_MONTH = 22
const HOURS_PER_DAY = 8

export interface Coverage {
  start: string
  end: string
}

/**
 * The calendar year the 13th Month Pay covers (Labor Code basis) — January 1 to December 31, as
 * before. The cutoff/generation date only stamps the batch; it doesn't shorten anyone's coverage.
 * Resigned/separated employees are clamped to their last day by `activeWindowFor`.
 */
export function coverageFor(year: number): Coverage {
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

/** The part of the coverage window the employee was actually employed, or null if none. */
export function activeWindowFor(employee: Employee, coverage: Coverage): { from: string; to: string } | null {
  const from = employee.employment.dateHired > coverage.start ? employee.employment.dateHired : coverage.start
  const lastDay = employee.employment.dateSeparated && employee.employment.dateSeparated < coverage.end ? employee.employment.dateSeparated : coverage.end
  return from <= lastDay ? { from, to: lastDay } : null
}

/**
 * Eligible for this coverage window: currently active and hired by its end, or resigned/separated
 * with a recorded last day that falls in (or after) the window — i.e. they worked any portion of it.
 * Inactive/archived employees without a separation date are excluded (their active period is unknown).
 */
export function isEligibleForThirteenthMonth(employee: Employee, coverage: Coverage): boolean {
  if (employee.employment.status !== 'active' && !employee.employment.dateSeparated) return false
  return activeWindowFor(employee, coverage) !== null
}

export function isSeparated(employee: Employee): boolean {
  return !!employee.employment.dateSeparated || employee.employment.status !== 'active'
}

function parseDate(key: string): Date {
  return new Date(`${key}T00:00:00`)
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** One month of 13th-Month-eligible basic salary within the employee's active window. */
export interface MonthlyBasicEarning {
  key: string
  /** e.g. "April 2026" */
  label: string
  /** "Full month" or e.g. "Apr 1 – 28 · 28 of 30 days" */
  detail: string
  /** Share of the month employed (1 = full month). */
  fraction: number
  amount: number
}

/**
 * Basic salary earned in each month of the active window. Full months earn the monthly basic;
 * partial months (hire or separation month) earn it pro-rated by calendar days employed.
 * Their sum is the 13th Month "Basic salary earned".
 */
export function basicEarningsByMonth(employee: Employee, from: string, to: string): MonthlyBasicEarning[] {
  const monthlyBasic = monthlyEquivalentFor(employee)
  const start = parseDate(from)
  const end = parseDate(to)
  const months: MonthlyBasicEarning[] = []
  for (let y = start.getFullYear(), m = start.getMonth(); y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth()); m === 11 ? ((m = 0), y++) : m++) {
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const firstDay = y === start.getFullYear() && m === start.getMonth() ? start.getDate() : 1
    const lastDay = y === end.getFullYear() && m === end.getMonth() ? end.getDate() : daysInMonth
    const days = lastDay - firstDay + 1
    const fraction = days / daysInMonth
    months.push({
      key: `${y}-${m + 1}`,
      label: `${MONTH_NAMES[m]} ${y}`,
      detail: fraction === 1 ? 'Full month' : `${MONTH_SHORT[m]} ${firstDay} – ${lastDay} · ${days} of ${daysInMonth} days`,
      fraction,
      amount: Math.round(monthlyBasic * fraction),
    })
  }
  return months
}

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Whether an approved leave of a paid leave type covers `date` for this employee (so an absence that day is paid, not deducted). */
function coveredByPaidLeave(employeeId: string, date: string, companyId: string): boolean {
  const paidTypeIds = new Set(db.leaveTypes.filter((t) => t.companyId === companyId && t.isPaid !== false).map((t) => t.id))
  return db.leaveRequests.some(
    (r) => r.employeeId === employeeId && r.status === 'approved' && paidTypeIds.has(r.leaveTypeId) && r.dateFrom <= date && r.dateTo >= date,
  )
}

export interface ThirteenthMonthDeductions {
  /** Hourly / daily rates the deductions are charged at (monthly basic ÷ 22 working days, ÷ 8 hours). */
  hourlyRate: number
  dailyRate: number
  undertime: { hours: number; dates: string[]; amount: number }
  unpaidAbsences: { days: number; dates: string[]; amount: number }
}

/** Undertime and unpaid absences recorded in the active window, with the dates they happened. */
export function thirteenthMonthDeductionsFor(session: SessionUser, employee: Employee, from: string, to: string): ThirteenthMonthDeductions {
  const monthlyBasic = monthlyEquivalentFor(employee)
  const dailyRate = monthlyBasic / WORKING_DAYS_PER_MONTH
  const hourlyRate = dailyRate / HOURS_PER_DAY
  const records = db.attendanceRecords
    .filter((r) => r.employeeId === employee.id && r.date >= from && r.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Undertime: minutes short of the scheduled end time, on days marked undertime.
  let undertimeMinutes = 0
  const undertimeDates: string[] = []
  for (const r of records) {
    if (r.status !== 'undertime' || !r.timeOut) continue
    const schedule = db.schedules.find((s) => s.id === r.scheduleId)
    if (!schedule) continue
    const short = Math.max(0, minutesOf(schedule.endTime) - minutesOf(r.timeOut))
    if (short > 0) {
      undertimeMinutes += short
      undertimeDates.push(r.date)
    }
  }
  const undertimeHours = Math.round((undertimeMinutes / 60) * 100) / 100

  // Unpaid absences: absent days not covered by an approved paid leave.
  const absenceDates = records.filter((r) => r.status === 'absent' && !coveredByPaidLeave(employee.id, r.date, session.companyId)).map((r) => r.date)

  return {
    hourlyRate,
    dailyRate,
    undertime: { hours: undertimeHours, dates: undertimeDates, amount: Math.round(undertimeHours * hourlyRate) },
    unpaidAbsences: { days: absenceDates.length, dates: absenceDates, amount: Math.round(absenceDates.length * dailyRate) },
  }
}

/** One employee's 13th Month computation for the coverage window (not saved). */
export function computeThirteenthMonthLine(
  session: SessionUser,
  employee: Employee,
  coverage: Coverage,
  runId: string,
): ThirteenthMonthLine | null {
  const window = activeWindowFor(employee, coverage)
  if (!window) return null

  const months = basicEarningsByMonth(employee, window.from, window.to)
  const monthsCredited = Math.round(months.reduce((sum, m) => sum + m.fraction, 0) * 100) / 100
  const grossBasicEarned = months.reduce((sum, m) => sum + m.amount, 0)

  const deductions = thirteenthMonthDeductionsFor(session, employee, window.from, window.to)
  const undertimeDeduction = deductions.undertime.amount
  const absenceDeduction = deductions.unpaidAbsences.amount

  const annualBasicEarned = Math.max(0, grossBasicEarned - undertimeDeduction - absenceDeduction)
  const thirteenthMonthPay = Math.round(annualBasicEarned / 12)
  const taxableExcess = Math.max(0, thirteenthMonthPay - THIRTEENTH_MONTH_TAX_EXEMPT_CEILING)
  const withholdingTax = taxableExcess > 0 ? Math.round(taxableExcess * marginalTaxRateFor(session, employee)) : 0

  return {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    runId,
    employeeId: employee.id,
    activeFrom: window.from,
    activeTo: window.to,
    separated: isSeparated(employee),
    monthsCredited,
    grossBasicEarned,
    undertimeHours: deductions.undertime.hours,
    undertimeDeduction,
    unpaidAbsenceDays: deductions.unpaidAbsences.days,
    absenceDeduction,
    annualBasicEarned,
    thirteenthMonthPay,
    taxableExcess,
    withholdingTax,
    netPay: thirteenthMonthPay - withholdingTax,
  }
}

// ---------- Targeting ----------

/** Narrows eligible employees to the batch's selection (specific employees, one payroll group, one department, or all). */
export function applySelection(employees: Employee[], selection: ThirteenthMonthSelection): Employee[] {
  // Resigned/separated employees get their own batch; every other mode covers active employees only.
  if (selection.mode === 'separated') {
    const separated = employees.filter(isSeparated)
    const ids = new Set(selection.employeeIds ?? [])
    return ids.size > 0 ? separated.filter((e) => ids.has(e.id)) : separated
  }
  const active = employees.filter((e) => !isSeparated(e))
  if (selection.mode === 'employees') {
    const ids = new Set(selection.employeeIds ?? [])
    return active.filter((e) => ids.has(e.id))
  }
  if (selection.mode === 'payroll_group') {
    const group = db.payrollGroups.find((g) => g.id === selection.payrollGroupId)
    const ids = new Set(group?.employeeIds ?? [])
    return active.filter((e) => ids.has(e.id))
  }
  if (selection.mode === 'department') return active.filter((e) => e.employment.department === selection.department)
  return active
}

export function selectionKey(selection: ThirteenthMonthSelection | undefined): string {
  if (!selection || selection.mode === 'all') return 'all'
  if (selection.mode === 'employees') return `employees:${[...(selection.employeeIds ?? [])].sort().join(',')}`
  if (selection.mode === 'payroll_group') return `payroll_group:${selection.payrollGroupId ?? ''}`
  if (selection.mode === 'separated') return `separated:${[...(selection.employeeIds ?? [])].sort().join(',')}`
  return `department:${selection.department ?? ''}`
}

/** Employees already paid 13th Month Pay for `year` in a finalized batch — never paid twice. */
function alreadyPaidEmployeeIds(companyId: string, year: number): Set<string> {
  const finalizedRunIds = new Set(db.thirteenthMonthRuns.filter((r) => r.companyId === companyId && r.year === year && r.status === 'finalized').map((r) => r.id))
  return new Set(db.thirteenthMonthLines.filter((l) => finalizedRunIds.has(l.runId)).map((l) => l.employeeId))
}

export interface GenerateThirteenthMonthInput {
  year: number
  generationDate: string
  payoutPeriodLabel: string
  selection: ThirteenthMonthSelection
}

export interface ThirteenthMonthPreview {
  coverage: Coverage
  /** Every employee eligible for the coverage window (the pool the selection pickers draw from). */
  eligible: Employee[]
  /** Eligible employees matched by the selection who will be included. */
  included: Employee[]
  /** Matched by the selection but already paid in a finalized batch this year. */
  skippedAlreadyPaid: Employee[]
}

/** What a batch with these settings would cover — used by the UI to preview counts before generating. */
export async function previewThirteenthMonthBatch(session: SessionUser, input: GenerateThirteenthMonthInput): Promise<ThirteenthMonthPreview> {
  const coverage = coverageFor(input.year)
  const employees = await getEmployees(session)
  const eligible = employees.filter((e) => isEligibleForThirteenthMonth(e, coverage))
  const matched = applySelection(eligible, input.selection)
  const paid = alreadyPaidEmployeeIds(session.companyId, input.year)
  return {
    coverage,
    eligible,
    included: matched.filter((e) => !paid.has(e.id)),
    skippedAlreadyPaid: matched.filter((e) => paid.has(e.id)),
  }
}

/**
 * Generates a draft 13th Month batch for the selected employees. Each line is a standalone 13th
 * Month payslip: Total Basic Salary Earned in the employee's active window (pro-rated by day for
 * mid-year hires and resigned/separated employees), less undertime and unpaid absences, ÷ 12.
 * Regenerating with the same year + selection replaces that draft; finalized batches are kept.
 */
export async function generateThirteenthMonthRun(
  session: SessionUser,
  input: GenerateThirteenthMonthInput,
): Promise<{ run: ThirteenthMonthRun; lines: ThirteenthMonthLine[]; skippedAlreadyPaid: number }> {
  const preview = await previewThirteenthMonthBatch(session, input)

  const run: ThirteenthMonthRun = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    year: input.year,
    generationDate: input.generationDate,
    payoutPeriodLabel: input.payoutPeriodLabel,
    selection: input.selection,
    coverageStart: preview.coverage.start,
    coverageEnd: preview.coverage.end,
    status: 'draft',
    createdAt: new Date().toISOString(),
  }

  const lines = preview.included
    .map((employee) => computeThirteenthMonthLine(session, employee, preview.coverage, run.id))
    .filter((l): l is ThirteenthMonthLine => l !== null)

  const key = selectionKey(input.selection)
  const oldDraftIds = new Set(
    db.thirteenthMonthRuns
      .filter((r) => r.companyId === session.companyId && r.year === input.year && r.status === 'draft' && selectionKey(r.selection) === key)
      .map((r) => r.id),
  )
  db.thirteenthMonthRuns = db.thirteenthMonthRuns.filter((r) => !oldDraftIds.has(r.id))
  db.thirteenthMonthLines = db.thirteenthMonthLines.filter((l) => !oldDraftIds.has(l.runId))

  db.thirteenthMonthRuns.unshift(run)
  db.thirteenthMonthLines.push(...lines)

  return { run, lines, skippedAlreadyPaid: preview.skippedAlreadyPaid.length }
}

/** Finalizing issues the batch's standalone 13th Month payslips and locks it. */
export async function finalizeThirteenthMonthRun(session: SessionUser, runId: string): Promise<void> {
  const run = db.thirteenthMonthRuns.find((r) => r.id === runId && r.companyId === session.companyId)
  if (!run || run.status !== 'draft') return
  run.status = 'finalized'
  run.finalizedAt = new Date().toISOString()
}
