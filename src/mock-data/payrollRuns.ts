import { approvePayroll, createPayrollPeriod, finalizePayroll, runPayroll } from '@/lib/services/payrollService'
import { db } from '@/mock-data'
import type { CompensationApproval, OvertimeRecord, OvertimeType, PayrollPeriodStatus, SessionUser } from '@/types/domain'

/**
 * Sample payroll run history for the demo company (Frontline), so Payroll Runs and every payroll-
 * driven Basic/Advanced report render with real data out of the box.
 *
 * Runs are produced by the actual payroll engine (createPayrollPeriod → runPayroll → approvePayroll
 * → finalizePayroll), never hand-written figures — so every line's earnings, statutory shares, tax,
 * loans and net pay follow the same business rules as a run an admin processes in the UI, and
 * finalized runs post their loan repayments. Dates are relative to today: the two months before last
 * are fully paid, and last month shows every status (Completed, Approved, In Review, Draft).
 */

const COMPANY_ID = 'co_frontline'
const GROUP = {
  monthly: 'pg_fl_monthly_admin',
  semiMonthly: 'pg_fl_semi_monthly_regular',
  weeklyProduction: 'pg_fl_weekly_production',
  weeklyDaily: 'pg_fl_weekly_daily',
} as const

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface SampleRun {
  id: string
  groupId: string
  label: string
  startDate: Date
  endDate: Date
  payDate: Date
  status: PayrollPeriodStatus
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const lastDayOf = (year: number, month: number) => new Date(year, month + 1, 0)

/** "Sep 16 – 30, 2026", or "Sep 28 – Oct 4, 2026" across months — the Create Period dialog's label style. */
function rangeLabel(start: Date, end: Date): string {
  const endPart = start.getMonth() === end.getMonth() ? `${end.getDate()}` : `${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`
  return `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${endPart}, ${end.getFullYear()}`
}

/** Monday of the week containing `d`. */
function mondayOf(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7))
}

/** Last Monday–Sunday week that ends inside the month. */
function lastFullWeek(year: number, month: number): Date {
  const monday = mondayOf(lastDayOf(year, month))
  return addDays(monday, 6) <= lastDayOf(year, month) ? monday : addDays(monday, -7)
}

function semiMonthlyRuns(year: number, month: number, status1: PayrollPeriodStatus, status2: PayrollPeriodStatus, key: string): SampleRun[] {
  const mid = new Date(year, month, 15)
  const end = lastDayOf(year, month)
  return [
    { id: `pr_fl_${key}_semi_1`, groupId: GROUP.semiMonthly, label: rangeLabel(new Date(year, month, 1), mid), startDate: new Date(year, month, 1), endDate: mid, payDate: mid, status: status1 },
    { id: `pr_fl_${key}_semi_2`, groupId: GROUP.semiMonthly, label: rangeLabel(new Date(year, month, 16), end), startDate: new Date(year, month, 16), endDate: end, payDate: end, status: status2 },
  ]
}

function monthlyRun(year: number, month: number, status: PayrollPeriodStatus, key: string): SampleRun {
  const end = lastDayOf(year, month)
  // "September 2026" — also the period label approved "Include in Regular Payroll" bonuses are tagged with.
  return { id: `pr_fl_${key}_monthly`, groupId: GROUP.monthly, label: `${MONTHS_LONG[month]} ${year}`, startDate: new Date(year, month, 1), endDate: end, payDate: end, status }
}

function weeklyRun(monday: Date, groupId: string, status: PayrollPeriodStatus, id: string): SampleRun {
  const sunday = addDays(monday, 6)
  return { id, groupId, label: rangeLabel(monday, sunday), startDate: monday, endDate: sunday, payDate: addDays(sunday, 5), status }
}

/** The run schedule: months M-2 and M-1 fully completed, month M (last month) with mixed statuses. */
export function samplePayrollRunSchedule(today = new Date()): SampleRun[] {
  const m = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const months = [-2, -1, 0].map((offset) => {
    const d = new Date(m.getFullYear(), m.getMonth() + offset, 1)
    return { year: d.getFullYear(), month: d.getMonth(), key: `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}` }
  })
  const [older, previous, latest] = months

  const latestLastWeek = lastFullWeek(latest.year, latest.month)

  // Weekly groups run every week of the sample period (Monday – Sunday), so anything dated inside it — a
  // one-time deduction, an allowance, a loan installment — lands in a run and on a payslip.
  const firstOfRange = new Date(older.year, older.month, 1)
  const firstMonday = addDays(firstOfRange, (8 - firstOfRange.getDay()) % 7)
  const weekly: SampleRun[] = []
  for (let monday = firstMonday; monday <= latestLastWeek; monday = addDays(monday, 7)) {
    const isLast = iso(monday) === iso(latestLastWeek)
    weekly.push(
      weeklyRun(monday, GROUP.weeklyProduction, isLast ? 'approved' : 'finalized', `pr_fl_wk_${iso(monday)}_prod`),
      weeklyRun(monday, GROUP.weeklyDaily, isLast ? 'review' : 'finalized', `pr_fl_wk_${iso(monday)}_daily`),
    )
  }

  return [
    ...semiMonthlyRuns(older.year, older.month, 'finalized', 'finalized', older.key),
    monthlyRun(older.year, older.month, 'finalized', older.key),

    ...semiMonthlyRuns(previous.year, previous.month, 'finalized', 'finalized', previous.key),
    monthlyRun(previous.year, previous.month, 'finalized', previous.key),

    ...semiMonthlyRuns(latest.year, latest.month, 'finalized', 'review', latest.key),
    monthlyRun(latest.year, latest.month, 'approved', latest.key),

    ...weekly,
    weeklyRun(addDays(latestLastWeek, 7), GROUP.weeklyDaily, 'draft', `pr_fl_wk_${iso(addDays(latestLastWeek, 7))}_daily`),
  ]
}

const OT_TYPES: { type: OvertimeType; multiplier: number; startTime: string; endTime: string; hours: number }[] = [
  { type: 'regular', multiplier: 1.25, startTime: '18:00', endTime: '21:00', hours: 3 },
  { type: 'regular', multiplier: 1.25, startTime: '18:00', endTime: '20:30', hours: 2.5 },
  { type: 'night_diff', multiplier: 1.1, startTime: '22:00', endTime: '02:00', hours: 4 },
  { type: 'regular', multiplier: 1.25, startTime: '17:30', endTime: '21:30', hours: 4 },
  { type: 'night_diff', multiplier: 1.1, startTime: '22:00', endTime: '01:00', hours: 3 },
  { type: 'rest_day_holiday', multiplier: 1.3, startTime: '08:00', endTime: '16:00', hours: 8 },
]
const OT_REASONS = ['Month-end closing', 'Peak season order fulfillment', 'Inventory count', 'Client escalation coverage', 'Backlog clearance', 'Payroll cut-off processing']

/**
 * Approved overtime / night differential for the sample runs' older pay periods (the live OT generator
 * only covers the last 14 days), so historical runs carry realistic OT pay and the OT reports have history.
 */
function historicalOvertime(runs: SampleRun[], today: Date): OvertimeRecord[] {
  const cutoff = iso(addDays(today, -15))
  const records: OvertimeRecord[] = []
  const employees = db.employees.filter((e) => e.companyId === COMPANY_ID && e.employment.status === 'active')
  for (const run of runs) {
    if (iso(run.endDate) > cutoff) continue
    const group = db.payrollGroups.find((g) => g.id === run.groupId)
    const spanDays = Math.round((run.endDate.getTime() - run.startDate.getTime()) / 86_400_000) + 1
    employees
      .filter((e) => group?.employeeIds.includes(e.id))
      .forEach((employee, index) => {
        // Roughly 3 in 5 employees log OT in a cutoff; longer (monthly) periods log a second entry.
        const seed = index * 7 + run.startDate.getDate() + run.startDate.getMonth() * 3
        if (seed % 5 >= 3) return
        const entries = spanDays > 20 ? 2 : 1
        for (let i = 0; i < entries; i++) {
          const pattern = OT_TYPES[(seed + i * 2) % OT_TYPES.length]
          let date = addDays(run.startDate, (seed * 3 + i * 9) % spanDays)
          if (pattern.type !== 'rest_day_holiday' && (date.getDay() === 0 || date.getDay() === 6)) date = addDays(date, date.getDay() === 0 ? 1 : 2)
          if (date > run.endDate) date = run.endDate
          const day = iso(date)
          records.push({
            id: `${employee.id}_hist_ot_${run.id}_${i + 1}`,
            companyId: COMPANY_ID,
            employeeId: employee.id,
            date: day,
            startTime: pattern.startTime,
            endTime: pattern.endTime,
            hours: pattern.hours,
            type: pattern.type,
            multiplier: pattern.multiplier,
            status: 'approved',
            reason: OT_REASONS[(seed + i) % OT_REASONS.length],
            requestedAt: `${day}T17:00:00.000Z`,
            decidedBy: 'Andrea Villareal',
            decidedAt: `${day}T20:00:00.000Z`,
          })
        }
      })
  }
  return records
}

const HOURS_PATTERN = [8, 8, 8, 7.5, 8, 8, 8, 6, 8, 8, 8]

/**
 * Approved timecards (hourly) and output submissions (piece-rate) for the weekdays before the live
 * work-log generator's ~24-workday window, so older runs pay hourly/output employees from a full
 * period of approved logs instead of a partial one.
 */
function historicalWorkLogs(runs: SampleRun[]): CompensationApproval[] {
  const earliest = iso(runs.reduce((min, r) => (r.startDate < min ? r.startDate : min), runs[0].startDate))
  const logs: CompensationApproval[] = []
  db.employees
    .filter((e) => e.companyId === COMPANY_ID && e.employment.status === 'active' && (e.compensation.payType === 'hourly' || e.compensation.payType === 'output_based'))
    .forEach((employee, employeeIndex) => {
      const existing = db.compensationApprovals.filter((a) => a.employeeId === employee.id).map((a) => a.workDate)
      const firstLiveDate = existing.length ? existing.reduce((min, d) => (d < min ? d : min)) : iso(new Date())
      const isHourly = employee.compensation.payType === 'hourly'
      const unitLabel = isHourly ? 'hrs' : (employee.compensation.outputUnit ?? 'Per Unit')
      const rate = employee.compensation.basicPay
      for (let d = new Date(`${earliest}T00:00:00`), i = 0; iso(d) < firstLiveDate; d = addDays(d, 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) continue
        const seed = employeeIndex * 7 + i++
        const quantity = isHourly ? HOURS_PATTERN[seed % HOURS_PATTERN.length] : unitLabel === 'Per Task' ? 18 + ((seed * 5) % 13) : 40 + ((seed * 7) % 21)
        const workDate = iso(d)
        logs.push({
          id: `${employee.id}_hist_compappr_${workDate}`,
          companyId: COMPANY_ID,
          employeeId: employee.id,
          type: isHourly ? 'hourly' : 'output',
          workDate,
          quantity,
          unitLabel,
          rate,
          amount: Math.round(quantity * rate * 100) / 100,
          description: isHourly ? 'Regular timecard hours' : 'Daily quota output',
          status: 'approved',
          submittedAt: `${workDate}T10:15:00.000Z`,
          decidedBy: 'Payroll Team',
          decidedAt: `${workDate}T23:00:00.000Z`,
        })
      }
    })
  return logs
}

/**
 * The loan generator writes its own repayment history up to today. The sample runs now post those
 * installments themselves (from each loan's start date), so history dated inside the sample period is
 * rolled back and the balance restored — otherwise the same installment would show twice.
 */
function reconcileLoansWithSampleRuns(runs: SampleRun[]) {
  const earliest = iso(runs.reduce((min, r) => (r.startDate < min ? r.startDate : min), runs[0].startDate))
  for (const loan of db.loans.filter((l) => l.companyId === COMPANY_ID)) {
    const history = loan.repaymentHistory ?? []
    const rolledBack = history.filter((h) => h.date >= earliest)
    if (rolledBack.length === 0) continue
    loan.repaymentHistory = history.filter((h) => h.date < earliest)
    loan.balance = Math.min(loan.principal, Math.round((loan.balance + rolledBack.reduce((sum, h) => sum + h.amount, 0)) * 100) / 100)
    if (loan.status === 'completed' && loan.balance > 0) loan.status = 'active'
  }
}

let seeded = false

/** Creates and processes the sample runs once per page load (the mock db resets on reload). */
export async function seedSamplePayrollRuns(today = new Date()): Promise<void> {
  if (seeded || db.payrollPeriods.some((p) => p.companyId === COMPANY_ID)) return
  seeded = true

  const admin = db.users.find((u) => u.id === 'u_fl_admin')
  if (!admin) return
  const session = admin as SessionUser

  const runs = samplePayrollRunSchedule(today)
  reconcileLoansWithSampleRuns(runs)
  db.overtimeRecords.push(...historicalOvertime(runs, today))
  db.compensationApprovals.push(...historicalWorkLogs(runs))

  // Oldest first, so finalized runs post loan repayments in pay-date order.
  for (const run of [...runs].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())) {
    const period = await createPayrollPeriod(session, {
      label: run.label,
      startDate: iso(run.startDate),
      endDate: iso(run.endDate),
      payDate: iso(run.payDate),
      payrollGroupId: run.groupId,
    })
    period.id = run.id
    await runPayroll(session, period.id)
    if (run.status === 'draft') {
      // A prepared draft: lines computed for preview, not yet submitted for review.
      period.status = 'draft'
      continue
    }
    if (run.status === 'approved' || run.status === 'finalized') await approvePayroll(session, period.id)
    if (run.status === 'finalized') await finalizePayroll(session, period.id)
  }
}
