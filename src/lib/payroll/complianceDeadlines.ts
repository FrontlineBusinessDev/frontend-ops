import type { ComplianceDeadline } from '@/types/domain'

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const COMPLIANCE_CATEGORY_OPTIONS: { value: ComplianceDeadline['category']; label: string }[] = [
  { value: 'SSS', label: 'SSS' },
  { value: 'PhilHealth', label: 'PhilHealth' },
  { value: 'Pag-IBIG', label: 'Pag-IBIG' },
  { value: 'BIR', label: 'BIR' },
  { value: 'Payroll', label: 'Payroll' },
  { value: 'Other', label: 'Other' },
]

export const COMPLIANCE_FREQUENCY_OPTIONS: { value: ComplianceDeadline['frequency']; label: string }[] = [
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
  { value: 'one_time', label: 'One time' },
]

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** `day` of the given month, clamped to that month's length (day 31 in a 30-day month → the 30th). */
function clampedDate(year: number, month: number, day: number): Date {
  return new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()))
}

export const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The next occurrence of a deadline on or after `today`, or undefined for a one-time date already past. */
export function nextDueDate(deadline: ComplianceDeadline, today = new Date()): Date | undefined {
  const base = startOfDay(today)
  if (deadline.frequency === 'one_time') {
    if (!deadline.dueDate) return undefined
    const due = new Date(`${deadline.dueDate}T00:00:00`)
    return due >= base ? due : undefined
  }
  if (deadline.frequency === 'monthly') {
    const thisMonth = clampedDate(base.getFullYear(), base.getMonth(), deadline.dueDay ?? 1)
    return thisMonth >= base ? thisMonth : clampedDate(base.getFullYear(), base.getMonth() + 1, deadline.dueDay ?? 1)
  }
  const thisYear = clampedDate(base.getFullYear(), deadline.dueMonth ?? 0, deadline.dueDay ?? 1)
  return thisYear >= base ? thisYear : clampedDate(base.getFullYear() + 1, deadline.dueMonth ?? 0, deadline.dueDay ?? 1)
}

/** Whole days from `today` to `due` (0 = today). */
export function daysUntil(due: Date, today = new Date()): number {
  return Math.round((startOfDay(due).getTime() - startOfDay(today).getTime()) / 86_400_000)
}

/** The month a monthly remittance covers — the month before the due date ("Remit the September SSS premiums" due in October). */
export function coveredMonthName(due: Date): string {
  return MONTH_NAMES[(due.getMonth() + 11) % 12]
}

/** Fills the `{period}` token in a deadline's description with the month it covers. */
export function describeDeadline(deadline: ComplianceDeadline, due: Date): string {
  return deadline.description.replace('{period}', coveredMonthName(due))
}

/** "Every month on the 10th", "Every year on Jan 31", "Mar 5, 2027". */
export function scheduleLabel(deadline: ComplianceDeadline): string {
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
  }
  if (deadline.frequency === 'monthly') return `Every month on the ${ordinal(deadline.dueDay ?? 1)}`
  if (deadline.frequency === 'yearly') return `Every year on ${MONTH_NAMES[deadline.dueMonth ?? 0].slice(0, 3)} ${deadline.dueDay ?? 1}`
  return deadline.dueDate ? new Date(`${deadline.dueDate}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
}
