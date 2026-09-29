import type { DeductionConfig, LoanRecord, PayrollFrequency, PayrollGroup, PayrollPeriod, Schedule } from '@/types/domain'

/** Which Payroll Settings deduction entry governs each loan type's collection schedule. */
export const LOAN_CONFIG_NAME: Record<LoanRecord['type'], string> = {
  sss_salary_loan: 'SSS Salary Loan',
  sss_calamity_loan: 'SSS Salary Loan',
  pagibig_multipurpose_loan: 'Pag-IBIG Loan',
  pagibig_calamity_loan: 'Pag-IBIG Loan',
  pagibig_mp2: 'Pag-IBIG Loan',
  company_loan: 'Company Loan',
  other_deduction: 'Late/Undertime Adjustment',
}

/**
 * How often a payroll run pays, and where a given period sits within its month. Shared by the
 * payroll engine, the computation breakdown, and the payslip so every monthly amount (statutory
 * contributions, tax, loans) is split the same way everywhere.
 *
 * Monthly contribution split per pay frequency:
 *  - Monthly: ÷ 1 (full contribution each payroll)
 *  - Semi-monthly: ÷ 2
 *  - Weekly: ÷ 4 (a 5th pay week in a month collects nothing — the month is already complete)
 *  - Daily: ÷ standard working days in the month — 22 for a 5-day work schedule, 26 for a 6-day one
 *  - Bi-weekly / custom (dynamic fallback): ÷ the number of pay periods that actually occur in that month
 */
export interface PaySchedule {
  frequency: PayrollFrequency
  /** Average pay periods per month, used to size basic pay/allowances — 52/12 weekly, 26/12 bi-weekly, 2 semi-monthly, 1 monthly, working days for daily. */
  periodsPerMonth: number
  /** How many pay periods this month's contributions/deductions are split across (the divisor). */
  periodsPerCycle: number
  /** 1-based position of this period within its month (the first cutoff, when it covers several). */
  cutoffIndex: number
  /** Every cutoff of the month this run covers — more than one when an All Employees run spans several of the employee's pay periods. */
  cutoffsCovered?: number[]
}

/** Standard working days per month for a work schedule: 26 for 6-day weeks, 22 otherwise. */
export function workingDaysPerMonthFor(workSchedule: Pick<Schedule, 'daysOfWeek'> | undefined): number {
  return (workSchedule?.daysOfWeek.length ?? 5) >= 6 ? 26 : 22
}

const AVERAGE_PERIODS_PER_MONTH: Record<Exclude<PayrollFrequency, 'custom' | 'daily'>, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semi_monthly: 2,
  monthly: 1,
}

/** The standard split divisor for a frequency, when no specific period is in view (e.g. the contributions overview). */
export function periodsPerCycleForFrequency(frequency: PayrollFrequency, periodsPerMonth: number, workingDaysPerMonth = 22): number {
  if (frequency === 'monthly') return 1
  if (frequency === 'semi_monthly') return 2
  if (frequency === 'weekly') return 4
  if (frequency === 'daily') return workingDaysPerMonth
  if (frequency === 'biweekly') return 2
  return Math.max(1, Math.round(periodsPerMonth))
}

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 86_400_000) + 1
}

/** A run's frequency comes from its Payroll Group; runs without one are inferred from the period's length. */
export function frequencyForPeriod(period: PayrollPeriod, group: PayrollGroup | undefined): PayrollFrequency {
  if (group) return group.frequency
  const days = daysBetween(period.startDate, period.endDate)
  if (days <= 1) return 'daily'
  if (days <= 9) return 'weekly'
  if (days <= 14) return 'biweekly'
  if (days <= 17) return 'semi_monthly'
  return 'monthly'
}

/** Average pay periods per month for a frequency (custom groups use their configured count, default 2). */
export function periodsPerMonthFor(frequency: PayrollFrequency, group?: PayrollGroup, workSchedule?: Pick<Schedule, 'daysOfWeek'>): number {
  if (frequency === 'custom') return group?.periodsPerMonth ?? 2
  if (frequency === 'daily') return workingDaysPerMonthFor(workSchedule)
  return AVERAGE_PERIODS_PER_MONTH[frequency]
}

/**
 * Dynamic fallback: how many fixed-length pay periods (repeating every `stepDays` from this period's
 * start) begin in this period's month, and which of them this one is. Gives 2 or 3 for bi-weekly.
 */
function periodsOccurringInMonth(startDate: string, stepDays: number): { count: number; index: number } {
  const start = parseDate(startDate)
  const day = start.getDate()
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const step = Math.max(1, stepDays)
  const earliest = ((day - 1) % step) + 1
  return { count: Math.floor((daysInMonth - earliest) / step) + 1, index: Math.floor((day - earliest) / step) + 1 }
}

/** 1-based working-day number of `date` within its month, per the work schedule's days of week. */
function workingDayIndex(date: string, workSchedule: Pick<Schedule, 'daysOfWeek'> | undefined): number {
  const target = parseDate(date)
  const workDays = new Set(workSchedule?.daysOfWeek ?? [1, 2, 3, 4, 5])
  let count = 0
  for (let d = 1; d <= target.getDate(); d++) {
    if (workDays.has(new Date(target.getFullYear(), target.getMonth(), d).getDay())) count++
  }
  return Math.max(count, 1)
}

/** Typical length in days of one pay period, used to tell whether a run spans several of an employee's cutoffs. */
function typicalPeriodDays(frequency: PayrollFrequency, group: PayrollGroup | undefined): number {
  switch (frequency) {
    case 'daily':
      return 1
    case 'weekly':
      return 7
    case 'biweekly':
      return 14
    case 'semi_monthly':
      return 15
    case 'monthly':
      return 28
    default:
      return Math.floor(30 / Math.max(1, group?.periodsPerMonth ?? 2))
  }
}

/** Where `date` sits in its month for a frequency: the month's split divisor and the 1-based cutoff number. */
function cutoffAt(
  frequency: PayrollFrequency,
  date: string,
  ctx: { group: PayrollGroup | undefined; workSchedule: Pick<Schedule, 'daysOfWeek'> | undefined; anchorDate: string; periodDays: number },
): { count: number; index: number } {
  const day = parseDate(date).getDate()
  switch (frequency) {
    case 'monthly':
      return { count: 1, index: 1 }
    case 'semi_monthly':
      return { count: 2, index: day <= 15 ? 1 : 2 }
    case 'weekly':
      // Split ÷ 4; the 5th pay week of a long month is index 5 and collects nothing.
      return { count: 4, index: Math.min(Math.ceil(day / 7), 5) }
    case 'daily':
      return { count: workingDaysPerMonthFor(ctx.workSchedule), index: workingDayIndex(date, ctx.workSchedule) }
    case 'biweekly':
      return periodsOccurringAt(ctx.anchorDate, date, 14)
    default:
      // Custom: the group's configured periods per month, else count the periods of this length in the month.
      if (ctx.group?.periodsPerMonth) {
        const count = Math.max(1, Math.round(ctx.group.periodsPerMonth))
        return { count, index: Math.min(Math.max(Math.ceil((day / 31) * count), 1), count) }
      }
      return periodsOccurringAt(ctx.anchorDate, date, ctx.periodDays)
  }
}

/** periodsOccurringInMonth, locating `date` against the cycle anchored at `anchorDate` (same month). */
function periodsOccurringAt(anchorDate: string, date: string, stepDays: number): { count: number; index: number } {
  const anchor = periodsOccurringInMonth(anchorDate, stepDays)
  const step = Math.max(1, stepDays)
  const offset = Math.floor((parseDate(date).getDate() - parseDate(anchorDate).getDate()) / step)
  return { count: anchor.count, index: Math.min(anchor.index + Math.max(offset, 0), anchor.count) }
}

/**
 * The schedule a payroll line is computed on.
 *  - A run for a Payroll Group uses that group's frequency.
 *  - An "All Employees" run uses each employee's OWN group frequency. When the run spans several of
 *    that employee's cutoffs (e.g. a Sep 1–30 run for a semi-monthly employee), the line covers each of
 *    those cutoffs — cutoff 1 + cutoff 2 — rather than silently switching the employee to monthly.
 *  - Employees with no group (or runs shorter than one of their pay periods) follow the run's length.
 */
export function payScheduleFor(
  period: PayrollPeriod,
  group: PayrollGroup | undefined,
  workSchedule?: Pick<Schedule, 'daysOfWeek'>,
  employeeGroup?: PayrollGroup,
): PaySchedule {
  const runDays = daysBetween(period.startDate, period.endDate)
  const useEmployeeGroup = !group && !!employeeGroup && runDays >= typicalPeriodDays(employeeGroup.frequency, employeeGroup)
  const effectiveGroup = group ?? (useEmployeeGroup ? employeeGroup : undefined)
  const frequency = frequencyForPeriod(period, effectiveGroup)
  const periodsPerMonth = periodsPerMonthFor(frequency, effectiveGroup, workSchedule)
  const ctx = { group: effectiveGroup, workSchedule, anchorDate: period.startDate, periodDays: runDays }
  const first = cutoffAt(frequency, period.startDate, ctx)

  // Cutoffs of this month the run covers (a run is clamped to the month it starts in).
  const start = parseDate(period.startDate)
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  const endIso = parseDate(period.endDate) > monthEnd ? `${period.startDate.slice(0, 8)}${String(monthEnd.getDate()).padStart(2, '0')}` : period.endDate
  const last = cutoffAt(frequency, endIso, ctx)
  const cutoffsCovered: number[] = []
  if (useEmployeeGroup) for (let i = first.index; i <= Math.max(first.index, last.index); i++) cutoffsCovered.push(i)
  else cutoffsCovered.push(first.index)

  return { frequency, periodsPerMonth, periodsPerCycle: first.count, cutoffIndex: first.index, cutoffsCovered }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

type AllocationConfig = Pick<DeductionConfig, 'allocationMethod' | 'specificCutoffPeriod' | 'customSplitPercentages'> | undefined

function allocateOne(monthlyAmount: number, n: number, cutoffIndex: number, config: AllocationConfig): number {
  const method = config?.allocationMethod ?? 'equal_split'
  if (n <= 1) return round2(monthlyAmount)
  if (method === 'specific_cutoff') return cutoffIndex === Math.min(config?.specificCutoffPeriod ?? n, n) ? round2(monthlyAmount) : 0
  if (method === 'custom') {
    const pct = config?.customSplitPercentages?.[cutoffIndex - 1] ?? 0
    return round2(monthlyAmount * (pct / 100))
  }
  if (cutoffIndex > n) return 0
  const share = Math.floor((monthlyAmount / n) * 100) / 100
  return cutoffIndex < n ? share : round2(monthlyAmount - share * (n - 1))
}

function coveredCutoffs(schedule: Pick<PaySchedule, 'cutoffIndex' | 'cutoffsCovered'>): number[] {
  return schedule.cutoffsCovered?.length ? schedule.cutoffsCovered : [schedule.cutoffIndex]
}

/**
 * The share of a monthly amount collected this period, per the Payroll Settings allocation method:
 *  - equal split: monthly ÷ the frequency's divisor; every cutoff but the last is floored to the centavo
 *    and the last takes the remainder, so the month always adds back to the exact monthly total. Extra
 *    periods past the divisor (a 5th pay week, a 23rd working day) collect nothing;
 *  - specific cutoff: the whole monthly amount on the configured cutoff, nothing on the others;
 *  - custom: the configured percentage for this cutoff.
 * A run covering several cutoffs collects the sum of each covered cutoff's share.
 */
export function allocateMonthly(monthlyAmount: number, schedule: PaySchedule, config: AllocationConfig): number {
  return round2(coveredCutoffs(schedule).reduce((sum, i) => sum + allocateOne(monthlyAmount, schedule.periodsPerCycle, i, config), 0))
}

/** The divisor rule for a frequency, in words. */
export function splitRuleLabel(schedule: Pick<PaySchedule, 'frequency' | 'periodsPerCycle'>): string {
  switch (schedule.frequency) {
    case 'monthly':
      return 'monthly payroll'
    case 'semi_monthly':
      return 'semi-monthly'
    case 'weekly':
      return 'weekly'
    case 'daily':
      return `daily, ${schedule.periodsPerCycle} working days/month`
    default:
      return `${schedule.periodsPerCycle} pay periods this month`
  }
}

/** "cutoff 2 of 2" or "cutoffs 1–2 of 2". */
export function cutoffLabel(schedule: Pick<PaySchedule, 'cutoffIndex' | 'cutoffsCovered' | 'periodsPerCycle'>): string {
  const covered = coveredCutoffs(schedule)
  return covered.length > 1 ? `cutoffs ${covered[0]}–${covered[covered.length - 1]} of ${schedule.periodsPerCycle}` : `cutoff ${covered[0]} of ${schedule.periodsPerCycle}`
}

export function describeAllocation(monthlyAmount: number, current: number, schedule: PaySchedule, method: DeductionConfig['allocationMethod'] | undefined): string {
  const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const n = schedule.periodsPerCycle
  const covered = coveredCutoffs(schedule)
  if (n <= 1) return `${fmt(monthlyAmount)} monthly, deducted in full (monthly payroll)`
  if (covered.length > 1) {
    const parts = covered.map((i) => fmt(allocateOne(monthlyAmount, n, i, { allocationMethod: method ?? 'equal_split' })))
    return `${fmt(monthlyAmount)} monthly ÷ ${n} (${splitRuleLabel(schedule)}) — this run covers ${cutoffLabel(schedule)}: ${parts.join(' + ')} = ${fmt(current)}`
  }
  if (method === 'specific_cutoff') return `${fmt(monthlyAmount)} monthly, collected on one cutoff — this is cutoff ${schedule.cutoffIndex}: ${fmt(current)}`
  if (method === 'custom') return `${fmt(monthlyAmount)} monthly, custom split — cutoff ${schedule.cutoffIndex}: ${fmt(current)}`
  if (schedule.cutoffIndex > n) return `${fmt(monthlyAmount)} monthly ÷ ${n} (${splitRuleLabel(schedule)}) — already fully collected in the month's first ${n} pay periods`
  return `${fmt(monthlyAmount)} monthly ÷ ${n} (${splitRuleLabel(schedule)}) = ${fmt(current)} — pay period ${schedule.cutoffIndex} of ${n}`
}
