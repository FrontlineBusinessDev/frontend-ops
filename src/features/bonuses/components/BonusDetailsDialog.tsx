import { Check, X } from 'lucide-react'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { resolveBonusRecipients } from '@/lib/payroll/bonusMatching'
import { useSession } from '@/hooks/useSession'
import { decideBonus, submitBonusForApproval } from '@/lib/services/bonusService'
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
}: {
  bonus: BonusIncentive | null
  employees: Employee[]
  canManage: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()

  const recipients = bonus ? resolveBonusRecipients(bonus, employees) : []
  const totalPayout = bonus ? recipients.length * bonus.amount : 0

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
      <DialogContent className="max-w-xl">
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

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
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
