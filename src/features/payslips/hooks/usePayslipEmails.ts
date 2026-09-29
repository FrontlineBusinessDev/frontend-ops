import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { getPayslipEmails, sendPayslipEmail } from '@/lib/services/payslipEmailService'
import type { PayslipEmailKind, PayslipEmailRecord, PayslipEmailStatus } from '@/types/domain'

export interface PayslipEmailTarget {
  employeeId: string
  employeeName: string
  subject: string
}

/** How many emails go out at once during a bulk send. */
const CONCURRENCY = 3

/**
 * Dispatch state for the payslip emails of one payroll period / 13th Month run / bonus: per-employee
 * status (Unsent → Sending… → Sent / Failed), single and bulk sending, and completion toasts.
 */
export function usePayslipEmails(kind: PayslipEmailKind, sourceId: string | undefined) {
  const { user } = useSession()
  const { notify } = useToast()
  const [records, setRecords] = useState<Record<string, PayslipEmailRecord>>({})
  const [sending, setSending] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!sourceId) return
    let cancelled = false
    getPayslipEmails(user, kind, sourceId).then((list) => {
      if (!cancelled) setRecords(Object.fromEntries(list.map((r) => [r.employeeId, r])))
    })
    return () => {
      cancelled = true
    }
  }, [user, kind, sourceId])

  const statusFor = useCallback(
    (employeeId: string): PayslipEmailStatus => (sending.has(employeeId) ? 'sending' : (records[employeeId]?.status ?? 'unsent')),
    [records, sending],
  )

  const send = useCallback(
    async (targets: PayslipEmailTarget[]) => {
      if (!sourceId || targets.length === 0) return
      setSending((prev) => new Set([...prev, ...targets.map((t) => t.employeeId)]))

      const results: PayslipEmailRecord[] = []
      const queue = [...targets]
      const worker = async () => {
        for (let target = queue.shift(); target; target = queue.shift()) {
          const record = await sendPayslipEmail(user, { kind, sourceId, employeeId: target.employeeId, subject: target.subject })
          results.push(record)
          setRecords((prev) => ({ ...prev, [record.employeeId]: record }))
          setSending((prev) => {
            const next = new Set(prev)
            next.delete(record.employeeId)
            return next
          })
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker))

      const sent = results.filter((r) => r.status === 'sent')
      const failed = results.filter((r) => r.status === 'failed')
      if (targets.length === 1) {
        const [record] = results
        const name = targets[0].employeeName
        if (record?.status === 'sent') notify({ title: 'Payslip emailed', description: `Sent to ${name} (${record.recipient}).`, tone: 'success' })
        else notify({ title: 'Payslip email failed', description: `${name}: ${record?.error ?? 'Unknown error'}`, tone: 'danger' })
        return
      }
      notify({
        title: failed.length === 0 ? 'Bulk email complete' : sent.length === 0 ? 'Bulk email failed' : 'Bulk email finished with errors',
        description: `${sent.length} of ${results.length} payslip${results.length === 1 ? '' : 's'} sent${failed.length ? ` · ${failed.length} failed — see the Email Status column` : ''}.`,
        tone: failed.length === 0 ? 'success' : sent.length === 0 ? 'danger' : 'default',
      })
    },
    [user, kind, sourceId, notify],
  )

  const counts = (employeeIds: string[]) =>
    employeeIds.reduce(
      (acc, id) => {
        acc[statusFor(id)] += 1
        return acc
      },
      { unsent: 0, sending: 0, sent: 0, failed: 0 } as Record<PayslipEmailStatus, number>,
    )

  return { records, statusFor, send, counts, isSending: sending.size > 0 }
}
