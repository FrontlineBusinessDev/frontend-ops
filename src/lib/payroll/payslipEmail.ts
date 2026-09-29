import { formatDate } from '@/lib/utils/format'
import type { Company, Employee, PayslipEmailKind } from '@/types/domain'

export const PAYSLIP_EMAIL_KIND_LABEL: Record<PayslipEmailKind, string> = {
  payroll: 'Payslip',
  thirteenth_month: '13th Month Pay Payslip',
  bonus: 'Bonus / Incentive Payslip',
}

/** Payslip notifications are sent by the platform's payroll mailer on the company's behalf. */
export const PAYSLIP_EMAIL_SENDER = { name: 'FBS Payroll', address: 'noreply@fbspayroll.com', tagline: 'Simple. Accurate. On Time.' }

export interface PayslipEmailContent {
  senderName: string
  senderAddress: string
  to?: string
  subject: string
  employeeFirstName: string
  /** e.g. "Your payslip for September 2026 is ready!" */
  headline: string
  /** Informational paragraph summarizing the processed pay period. */
  summary: string
  payPeriod: string
  payDate: string
  /** Absolute link behind the "View Payslip" button. */
  ctaUrl: string
  companyName: string
  attachmentName: string
}

function slug(value: string) {
  return value.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const longDate = (iso: string) => formatDate(iso, { month: 'long' })

/** "Sep 1, 2026 – Sep 30, 2026" */
export function formatPayPeriod(start: string, end: string) {
  return `${formatDate(start)} – ${formatDate(end)}`
}

/** "September 1 – September 30, 2026" (the year once when both dates share it). */
function longRange(start: string, end: string) {
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return sameYear ? `${formatDate(start, { month: 'long', year: undefined })} – ${longDate(end)}` : `${longDate(start)} – ${longDate(end)}`
}

/** "September 2026" when the period sits in one month, otherwise the period's own label. */
function monthYearOf(start: string, end: string, fallback: string) {
  return start.slice(0, 7) === end.slice(0, 7) ? formatDate(start, { month: 'long', day: undefined }) : fallback
}

/**
 * The payslip notification email — shared by the preview modal and the send action so the previewed
 * content is exactly what gets dispatched. Every field is bound to the selected employee and run.
 */
export function buildPayslipEmail(params: {
  kind: PayslipEmailKind
  company: Company | undefined
  employee: Employee
  /** Payroll period label, 13th Month payout label, or bonus name + period — used in the subject and file name. */
  label: string
  periodStart?: string
  periodEnd?: string
  /** Shown instead of a date range when the pay period has no dates (e.g. a bonus tagged to a period label). */
  periodText?: string
  payDate?: string
  /** App path of the payslip, turned into an absolute link for the email. */
  ctaPath: string
  /** Bonus name, for the bonus headline. */
  bonusName?: string
}): PayslipEmailContent {
  const { kind, company, employee, label, periodStart, periodEnd, periodText, payDate, ctaPath, bonusName } = params
  const companyName = company?.name ?? 'your company'
  const hasRange = !!periodStart && !!periodEnd
  const payPeriod = hasRange ? formatPayPeriod(periodStart, periodEnd) : (periodText ?? label)
  const payDateText = payDate ? formatDate(payDate) : periodText ? `With the ${periodText} payout` : '—'
  const rangeText = hasRange ? longRange(periodStart, periodEnd) : (periodText ?? label)

  let subject: string
  let headline: string
  let summary: string
  if (kind === 'payroll') {
    const monthYear = hasRange ? monthYearOf(periodStart, periodEnd, label) : label
    subject = `Your payslip for ${monthYear} is ready — ${companyName}`
    headline = `Your payslip for ${monthYear} is ready!`
    summary = `We've processed your payroll for the period of ${rangeText}. You can now view and download your payslip using the button below.`
  } else if (kind === 'thirteenth_month') {
    const year = periodEnd?.slice(0, 4) ?? label
    subject = `Your 13th Month Pay payslip for ${year} is ready — ${companyName}`
    headline = `Your 13th Month Pay for ${year} is ready!`
    summary = `We've processed your 13th Month Pay covering ${rangeText}. It's issued on its own payslip, separate from your regular payroll — view and download it using the button below.`
  } else {
    const name = bonusName ?? 'bonus'
    subject = `Your ${name} payslip is ready — ${companyName}`
    headline = `Your ${name} payslip is ready!`
    summary = `We've processed your ${name} for ${rangeText}. It's issued on a separate payslip, apart from your regular payroll — view and download it using the button below.`
  }

  return {
    senderName: PAYSLIP_EMAIL_SENDER.name,
    senderAddress: PAYSLIP_EMAIL_SENDER.address,
    to: employee.personal.personalEmail,
    subject,
    employeeFirstName: employee.personal.firstName,
    headline,
    summary,
    payPeriod,
    payDate: payDateText,
    ctaUrl: `${typeof window === 'undefined' ? '' : window.location.origin}${ctaPath}`,
    companyName,
    attachmentName: `${slug(PAYSLIP_EMAIL_KIND_LABEL[kind])}_${employee.employeeNumber}_${slug(label)}.pdf`,
  }
}
