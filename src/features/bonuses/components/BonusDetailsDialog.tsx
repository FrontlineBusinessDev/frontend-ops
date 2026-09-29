import { Check, FileText, Pencil, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { BonusPayslipDocument } from '@/features/bonuses/BonusPayslipPage'
import { usePayrollPeriods } from '@/features/payroll/hooks/usePayroll'
import { BulkEmailToolbar, RowCheckbox, SelectAllCheckbox } from '@/features/payslips/components/email/BulkEmailPayslips'
import { EmailStatusBadge } from '@/features/payslips/components/email/EmailStatusBadge'
import { PayslipEmailActions } from '@/features/payslips/components/email/PayslipEmailActions'
import { usePayslipEmails } from '@/features/payslips/hooks/usePayslipEmails'
import { usePayslipSelection } from '@/features/payslips/hooks/usePayslipSelection'
import { BONUS_PAYOUT_MODE_LABEL, bonusPayoutMode, resolveBonusRecipients } from '@/lib/payroll/bonusMatching'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { buildPayslipEmail } from '@/lib/payroll/payslipEmail'
import { decideBonus, submitBonusForApproval } from '@/lib/services/bonusService'
import { computeSeparateBonusPayslip } from '@/lib/services/payrollService'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { BonusIncentive, Employee } from '@/types/domain'

const BONUS_TYPE_LABEL: Record<BonusIncentive['bonusType'], string> = {
  fixed_amount: 'Fixed Amount',
  percentage: 'Percentage',
  performance_based: 'Performance-Based',
  output_based: 'Output-Based',
}

const TARGET_TYPE_LABEL: Record<BonusIncentive['targetType'], string> = {
  employee: 'Individual Employee',
  department: 'Employee Group / Department',
  company: 'All Employees (Company-wide)',
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  )
}

export function BonusDetailsDialog({
  bonus,
  employees,
  canManage,
  onClose,
  onChanged,
  onEdit,
}: {
  bonus: BonusIncentive | null
  employees: Employee[]
  canManage: boolean
  onClose: () => void
  onChanged: () => void
  /** Opens the edit form for a Draft / Pending Approval bonus. */
  onEdit: (bonus: BonusIncentive) => void
}) {
  const { user } = useSession()
  const { company } = useTenant()
  const { periods } = usePayrollPeriods()
  const { notify } = useToast()

  const recipients = bonus ? resolveBonusRecipients(bonus, employees) : []
  const totalPayout = bonus ? recipients.length * bonus.amount : 0
  const isSeparate = bonus ? bonusPayoutMode(bonus) === 'separate_payslip' : false
  const separatePayslips =
    bonus && isSeparate && bonus.status === 'approved' ? recipients.map((e) => computeSeparateBonusPayslip(user, bonus, e)).filter((p) => p !== undefined) : []
  const emails = usePayslipEmails('bonus', bonus?.id)
  const payslipSelection = usePayslipSelection(separatePayslips.map((p) => p.employee.id))
  const emailLabel = bonus ? `${bonus.name} (${bonus.periodLabel})` : ''
  // The bonus pays out with the payroll period it's tagged to — use that run's dates when it exists.
  const payoutPeriod = bonus ? periods.find((p) => p.label.trim().toLowerCase() === bonus.periodLabel.trim().toLowerCase()) : undefined
  const emailFor = (p: (typeof separatePayslips)[number]) =>
    buildPayslipEmail({
      kind: 'bonus',
      company,
      employee: p.employee,
      label: emailLabel,
      bonusName: bonus?.name,
      periodStart: payoutPeriod?.startDate,
      periodEnd: payoutPeriod?.endDate,
      periodText: bonus?.periodLabel,
      payDate: payoutPeriod?.payDate,
      ctaPath: '/ess/payslips',
    })
  const sendEmails = (employeeIds: string[]) =>
    emails.send(
      separatePayslips
        .filter((p) => employeeIds.includes(p.employee.id))
        .map((p) => ({ employeeId: p.employee.id, employeeName: `${p.employee.personal.firstName} ${p.employee.personal.lastName}`, subject: emailFor(p).subject })),
    )

  async function handleDecision(decision: 'approved' | 'rejected') {
    if (!bonus) return
    await decideBonus(user, bonus.id, decision)
    notify({ title: `Bonus ${decision === 'approved' ? 'approved' : 'rejected'}`, tone: decision === 'approved' ? 'success' : 'default' })
    onChanged()
    onClose()
  }

  async function handleSubmit() {
    if (!bonus) return
    await submitBonusForApproval(user, bonus.id)
    notify({ title: 'Submitted for approval', tone: 'success' })
    onChanged()
    onClose()
  }

  return (
    <Dialog open={!!bonus} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={separatePayslips.length > 0 ? 'max-w-3xl' : 'max-w-xl'}>
        {bonus && (
          <>
            <DialogTitle className="flex items-center gap-2">
              {bonus.name}
              <StatusBadge status={bonus.status} />
            </DialogTitle>
            <DialogDescription>Non-regular earning configuration and approval status.</DialogDescription>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <Field label="Bonus Type" value={BONUS_TYPE_LABEL[bonus.bonusType]} />
              <Field label="Target Recipient" value={TARGET_TYPE_LABEL[bonus.targetType]} />
              <Field
                label="Recipients"
                value={
                  bonus.targetType === 'employee'
                    ? recipients[0]
                      ? `${recipients[0].personal.firstName} ${recipients[0].personal.lastName}`
                      : 'Unassigned'
                    : `${recipients.length} employee${recipients.length === 1 ? '' : 's'}`
                }
              />
              <Field label={bonus.bonusType === 'percentage' ? 'Rate' : 'Amount (each)'} value={bonus.bonusType === 'percentage' ? `${bonus.amount}%` : formatCurrency(bonus.amount)} />
              <Field label="Effective Payroll Period" value={bonus.periodLabel} />
              <Field label="Frequency" value={bonus.frequency === 'one_time' ? 'One-time' : 'Recurring'} />
              <Field label="Taxability" value={<Badge tone={bonus.taxable ? 'warning' : 'success'}>{bonus.taxable ? 'Taxable' : 'Non-Taxable'}</Badge>} />
              <Field label="Payslip Generation" value={<Badge tone={isSeparate ? 'brand' : 'neutral'}>{BONUS_PAYOUT_MODE_LABEL[bonusPayoutMode(bonus)]}</Badge>} />
              {bonus.bonusType !== 'percentage' && recipients.length > 1 && (
                <Field label="Estimated Total Payout" value={formatCurrency(totalPayout)} />
              )}
              {bonus.decidedBy && (
                <Field label={bonus.status === 'rejected' ? 'Rejected By' : 'Approved By'} value={`${bonus.decidedBy} · ${bonus.decidedAt ? formatDate(bonus.decidedAt) : ''}`} />
              )}
              {bonus.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Notes / Justification</p>
                  <p className="mt-0.5 text-sm">{bonus.notes}</p>
                </div>
              )}
            </div>

            {isSeparate && bonus.status !== 'approved' && bonus.status !== 'rejected' && (
              <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                This bonus won't be added to the regular payroll payslip. A separate payslip is generated for each recipient once it's approved.
              </p>
            )}

            {separatePayslips.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Separate Bonus Payslips · {bonus.periodLabel}</p>
                <div className="mt-2">
                  <BulkEmailToolbar
                    candidates={separatePayslips.map((p) => ({
                      employeeId: p.employee.id,
                      employeeName: `${p.employee.personal.firstName} ${p.employee.personal.lastName}`,
                      hasEmail: !!p.employee.personal.personalEmail,
                      status: emails.statusFor(p.employee.id),
                    }))}
                    selectedIds={payslipSelection.selected}
                    canSend={canManage}
                    disabledReason="You do not have permission to send payslips."
                    isSending={emails.isSending}
                    onSend={sendEmails}
                    onSent={payslipSelection.clear}
                  />
                </div>
                <div className="mt-2 flex items-center gap-3 px-3 text-xs text-muted-foreground">
                  <SelectAllCheckbox state={payslipSelection.headerState} onChange={payslipSelection.toggleAll} />
                  Select all
                </div>
                <div className="mt-1 max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                  {separatePayslips.map((p) => (
                    <div key={p.employee.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                      <RowCheckbox
                        checked={payslipSelection.selected.has(p.employee.id)}
                        onChange={(c) => payslipSelection.toggle(p.employee.id, c)}
                        label={`${p.employee.personal.firstName} ${p.employee.personal.lastName}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {p.employee.personal.firstName} {p.employee.personal.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Net {formatCurrency(p.netPay)}
                          {p.withholdingTax > 0 && ` · Tax ${formatCurrency(p.withholdingTax)}`}
                        </p>
                      </div>
                      <EmailStatusBadge status={emails.statusFor(p.employee.id)} record={emails.records[p.employee.id]} />
                      <div className="flex items-center gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/bonuses/${bonus.id}/payslips/${p.employee.id}`} aria-label="View Payslip" title="View Payslip">
                            <FileText className="size-3.5" />
                          </Link>
                        </Button>
                        <PayslipEmailActions
                          compact
                          email={emailFor(p)}
                          status={emails.statusFor(p.employee.id)}
                          record={emails.records[p.employee.id]}
                          canSend={canManage}
                          disabledReason="You do not have permission to send payslips."
                          onSend={() => sendEmails([p.employee.id])}
                          renderPayslip={() => <BonusPayslipDocument company={company} bonus={bonus} employee={p.employee} payslip={p} />}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              {canManage && (bonus.status === 'draft' || bonus.status === 'pending') && (
                <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => onEdit(bonus)}>
                  Edit
                </Button>
              )}
              {canManage && bonus.status === 'draft' && <Button onClick={handleSubmit}>Submit for Approval</Button>}
              {canManage && bonus.status === 'pending' && (
                <>
                  <Button variant="destructive" icon={<X className="size-4" />} onClick={() => handleDecision('rejected')}>
                    Reject
                  </Button>
                  <Button icon={<Check className="size-4" />} onClick={() => handleDecision('approved')}>
                    Approve
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
