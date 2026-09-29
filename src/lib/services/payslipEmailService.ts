import { db } from '@/mock-data'
import type { PayslipEmailKind, PayslipEmailRecord, SessionUser } from '@/types/domain'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Every dispatch record for one payroll period / 13th Month run / bonus. */
export async function getPayslipEmails(session: SessionUser, kind: PayslipEmailKind, sourceId: string): Promise<PayslipEmailRecord[]> {
  return db.payslipEmails.filter((r) => r.companyId === session.companyId && r.kind === kind && r.sourceId === sourceId)
}

export interface SendPayslipEmailInput {
  kind: PayslipEmailKind
  sourceId: string
  employeeId: string
  subject: string
}

/**
 * Sends one employee's payslip email (mock mail relay with realistic latency). Delivery fails when the
 * employee has no valid email address on file; the attempt is logged either way so the status persists.
 */
export async function sendPayslipEmail(session: SessionUser, input: SendPayslipEmailInput): Promise<PayslipEmailRecord> {
  await delay(450 + Math.random() * 700)
  const employee = db.employees.find((e) => e.id === input.employeeId && e.companyId === session.companyId)
  const recipient = employee?.personal.personalEmail?.trim()
  const now = new Date().toISOString()

  let record = db.payslipEmails.find(
    (r) => r.companyId === session.companyId && r.kind === input.kind && r.sourceId === input.sourceId && r.employeeId === input.employeeId,
  )
  if (!record) {
    record = {
      id: crypto.randomUUID(),
      companyId: session.companyId,
      kind: input.kind,
      sourceId: input.sourceId,
      employeeId: input.employeeId,
      subject: input.subject,
      status: 'unsent',
      attempts: 0,
    }
    db.payslipEmails.push(record)
  }

  record.subject = input.subject
  record.recipient = recipient
  record.attempts += 1
  record.lastAttemptAt = now
  if (!employee) {
    record.status = 'failed'
    record.error = 'Employee record not found'
  } else if (!recipient) {
    record.status = 'failed'
    record.error = 'No email address on file — add one to the employee profile'
  } else if (!EMAIL_PATTERN.test(recipient)) {
    record.status = 'failed'
    record.error = `Invalid email address: ${recipient}`
  } else {
    record.status = 'sent'
    record.sentAt = now
    record.sentBy = session.name
    record.error = undefined
  }
  return { ...record }
}
