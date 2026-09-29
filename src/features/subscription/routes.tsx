import { Check, Layers, Mail, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSubscriptionUsage } from '@/features/subscription/hooks/useSubscription'
import { useSession } from '@/hooks/useSession'
import { usePermission } from '@/hooks/usePermission'
import { PLAN_DETAILS, PLAN_ORDER, estimateMonthlyBill, formatEmployeeLimit, formatPlanBasePrice } from '@/lib/plans'
import { upgradePlan } from '@/lib/services/subscriptionService'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { PlanTier } from '@/types/domain'

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {used} {limit !== null ? `/ ${limit}` : '(unlimited)'}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: limit ? `${pct}%` : '100%' }} />
      </div>
    </div>
  )
}

function ChangePlanDialog({
  targetPlan,
  direction,
  onChanged,
}: {
  targetPlan: PlanTier
  direction: 'upgrade' | 'downgrade'
  onChanged: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()

  async function onConfirm() {
    await upgradePlan(user, targetPlan)
    notify({ title: `${direction === 'upgrade' ? 'Upgraded' : 'Downgraded'} to ${PLAN_DETAILS[targetPlan].label} Plan`, tone: 'success' })
    onChanged()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant={direction === 'upgrade' ? 'primary' : 'secondary'}>
          {direction === 'upgrade' ? 'Upgrade Plan' : 'Downgrade Plan'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>
          {direction === 'upgrade' ? 'Upgrade' : 'Downgrade'} to {PLAN_DETAILS[targetPlan].label} Plan
        </DialogTitle>
        <DialogDescription>
          {formatPlanBasePrice(PLAN_DETAILS[targetPlan])} · {formatEmployeeLimit(targetPlan)} included. This is a demo {direction} — no payment is collected.
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <Button size="sm" onClick={onConfirm}>
            Confirm {direction === 'upgrade' ? 'Upgrade' : 'Downgrade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SubscriptionPage() {
  const { usage, isLoading, refetch } = useSubscriptionUsage()
  const canManage = usePermission('subscription.manage')

  if (isLoading || !usage) return <Skeleton className="h-96" />

  const currentPlan = PLAN_DETAILS[usage.planTier]
  const currentIndex = PLAN_ORDER.indexOf(usage.planTier)
  const bill = estimateMonthlyBill(usage.planTier, usage.employeeCount)

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription & Plan Management" description="Current plan, usage, and available upgrades." />

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Badge tone="brand" className="mb-2">
              Current Plan
            </Badge>
            <p className="font-display text-2xl font-semibold">{currentPlan.label}</p>
            <p className="text-sm text-muted-foreground">
              {formatPlanBasePrice(currentPlan)} · {formatEmployeeLimit(usage.planTier)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <p>
                Billing interval <span className="font-medium capitalize text-foreground">{usage.billingInterval}</span>
              </p>
              <p>
                Next renewal{' '}
                <span className="font-medium text-foreground">{usage.nextRenewalDate ? formatDate(usage.nextRenewalDate) : '—'}</span>
              </p>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
              {bill ? (
                <>
                  <p className="text-muted-foreground">Estimated monthly bill</p>
                  <p className="mt-0.5 font-display text-lg font-semibold text-foreground">{formatCurrency(bill.total)}</p>
                  <p className="text-muted-foreground">
                    Base {formatCurrency(bill.base)}
                    {bill.extraEmployees > 0
                      ? ` + ${bill.extraEmployees} additional employee(s) × ${formatCurrency(currentPlan.additionalEmployeePricePhp ?? 0)} = ${formatCurrency(bill.addOn)}`
                      : ` · ${usage.employeeCount} of ${currentPlan.employeeLimit} included employees used`}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Custom pricing — billed per your Enterprise agreement.</p>
              )}
            </div>
          </div>
          <div className="grid w-full max-w-sm gap-3 sm:w-72">
            <UsageBar label="Employees" used={usage.employeeCount} limit={usage.employeeLimit} />
            <UsageBar label="Users" used={usage.userCount} limit={usage.userLimit} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((tier, idx) => {
          const details = PLAN_DETAILS[tier]
          const isCurrent = tier === usage.planTier
          return (
            <Card key={tier} className={isCurrent ? 'flex flex-col border-primary/40 p-6' : 'flex flex-col p-6'}>
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold">{details.label}</p>
                {isCurrent && <Badge tone="success">Current</Badge>}
              </div>
              <p className="mt-1 min-h-8 text-xs text-muted-foreground">{details.targetAudience}</p>

              <div className="mt-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Base price</p>
                <p className="font-display text-2xl font-semibold tracking-tight">
                  {details.monthlyPricePhp !== null ? formatCurrency(details.monthlyPricePhp) : details.startingPricePhp ? `${formatCurrency(details.startingPricePhp)}+` : 'Custom'}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                {/* Same height on every card so the limits boxes line up. */}
                <p className="min-h-8 text-xs text-muted-foreground">{details.monthlyPricePhp === null ? 'Depends on complexity — custom pricing' : ' '}</p>
              </div>

              <div className="mt-4 space-y-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs">
                <p className="flex items-center gap-2">
                  <Users className="size-3.5 shrink-0 text-primary" />
                  <span className="font-medium">{formatEmployeeLimit(tier)}</span>
                </p>
                <p className="flex items-center gap-2">
                  <UserPlus className="size-3.5 shrink-0 text-primary" />
                  {details.additionalEmployeePricePhp !== null ? (
                    <span>
                      <span className="font-medium">{formatCurrency(details.additionalEmployeePricePhp)}</span>
                      <span className="text-muted-foreground">/month per additional employee</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Additional employees: custom pricing</span>
                  )}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="size-3.5 shrink-0 text-primary" />
                  {details.userLimit !== null ? `${details.userLimit} admin user seats` : 'Unlimited admin user seats'}
                </p>
              </div>

              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {details.includesTier && (
                  <li className="flex items-start gap-2 font-medium">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    All {PLAN_DETAILS[details.includesTier].label} features
                  </li>
                )}
                {details.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <Button size="sm" variant="secondary" disabled>
                    Current Plan
                  </Button>
                ) : tier === 'enterprise' ? (
                  <Button asChild size="sm" icon={<Mail className="size-3.5" />}>
                    <a href="mailto:sales@frontlinebusiness.com.ph?subject=Enterprise%20Plan%20Inquiry">Contact Sales</a>
                  </Button>
                ) : canManage ? (
                  <ChangePlanDialog targetPlan={tier} direction={idx > currentIndex ? 'upgrade' : 'downgrade'} onChanged={refetch} />
                ) : (
                  <Button size="sm" variant="secondary" disabled>
                    {idx < currentIndex ? 'Included' : 'Not available'}
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
