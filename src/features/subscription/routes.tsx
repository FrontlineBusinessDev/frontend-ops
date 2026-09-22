import { Check, Lock, Mail } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSubscriptionUsage } from '@/features/subscription/hooks/useSubscription'
import { useSession } from '@/hooks/useSession'
import { usePermission } from '@/hooks/usePermission'
import { FEATURE_LABELS, PLAN_DETAILS, PLAN_ORDER, formatPlanPrice, type PlanFeature } from '@/lib/plans'
import { upgradePlan } from '@/lib/services/subscriptionService'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils/format'
import type { PlanTier } from '@/types/domain'

const ALL_FEATURES: PlanFeature[] = [
  'attendance',
  'leave',
  'overtime_night_diff',
  'bonuses_incentives',
  'thirteenth_month',
  'loans_deductions',
  'ess',
  'multi_branch',
  'flexible_compensation',
  'advanced_reports',
  'api_integrations',
  'customization',
  'dedicated_support',
]

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
          {formatPlanPrice(PLAN_DETAILS[targetPlan].monthlyPricePhp)}. This is a demo {direction} — no payment is collected.
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
            <p className="text-sm text-muted-foreground">{formatPlanPrice(currentPlan.monthlyPricePhp)}</p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <p>
                Billing interval <span className="font-medium capitalize text-foreground">{usage.billingInterval}</span>
              </p>
              <p>
                Next renewal{' '}
                <span className="font-medium text-foreground">{usage.nextRenewalDate ? formatDate(usage.nextRenewalDate) : '—'}</span>
              </p>
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
            <Card key={tier} className={isCurrent ? 'border-primary/40 p-6' : 'p-6'}>
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-semibold">{details.label}</p>
                {isCurrent && <Badge tone="success">Current</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{details.targetAudience}</p>
              <p className="mt-2 text-sm font-medium">{formatPlanPrice(details.monthlyPricePhp)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Up to {details.employeeLimit ?? 'unlimited'} employees &middot; {details.userLimit ?? 'unlimited'} users
              </p>

              <ul className="mt-4 space-y-2 text-sm">
                {ALL_FEATURES.map((feature) => {
                  const included = details.features.includes(feature)
                  return (
                    <li key={feature} className={`flex items-center gap-2 ${included ? '' : 'text-muted-foreground'}`}>
                      {included ? <Check className="size-3.5 shrink-0 text-success" /> : <Lock className="size-3.5 shrink-0" />}
                      {FEATURE_LABELS[feature]}
                    </li>
                  )
                })}
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
