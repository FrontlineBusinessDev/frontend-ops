import { ArrowUp, Building2, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActivePlanTier } from '@/hooks/useActivePlanTier'
import { usePermission } from '@/hooks/usePermission'
import { PLAN_DETAILS, PLAN_ORDER } from '@/lib/plans'
import type { PlanTier } from '@/types/domain'

/** Sidebar footer widget shown to Company Admins in place of the old static tagline — a compact
 * plan/usage summary with upgrade CTAs to the next tier(s), mirroring the full Subscription page
 * (`src/features/subscription/routes.tsx`) without duplicating its upgrade-confirmation logic;
 * CTAs just deep-link there. Follows the Demo Portal Preview tier when one is selected, so the
 * plan name, limits and upgrade options match the navigation being previewed. */
export function SidebarPlanWidget() {
  const { tier, isPreview } = useActivePlanTier()
  const canManage = usePermission('subscription.manage')

  const currentIndex = PLAN_ORDER.indexOf(tier)
  const nextTiers = PLAN_ORDER.slice(currentIndex + 1) as PlanTier[]
  const currentPlan = PLAN_DETAILS[tier]

  const limitsSummary = [
    currentPlan.employeeLimit === null ? 'Unlimited employees' : `${currentPlan.employeeLimit} employees`,
    currentPlan.userLimit === null ? 'Unlimited users' : `${currentPlan.userLimit} users`,
  ].join(' · ')

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-sidebar-border bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Building2 className="size-3.5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sidebar-muted/70">{isPreview ? 'Previewing Plan' : 'Current Plan'}</p>
            <p className="text-sm font-semibold text-sidebar-foreground">{currentPlan.label}</p>
          </div>
        </div>
        {isPreview && (
          <span className="rounded-md border border-dashed border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
            Demo
          </span>
        )}
      </div>

      <p className="text-[11px] leading-snug text-sidebar-muted">
        {currentPlan.employeeLimit === null && currentPlan.userLimit === null ? limitsSummary : `Limit: ${limitsSummary}`}
      </p>

      {canManage && nextTiers.length > 0 && (
        <div className="space-y-1.5">
          <Link
            to="/subscription"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            <ArrowUp className="size-3.5" />
            Upgrade to {PLAN_DETAILS[nextTiers[0]].label}
          </Link>
          {nextTiers[1] && (
            <Link
              to="/subscription"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-active"
            >
              <ArrowUp className="size-3.5" />
              Upgrade to {PLAN_DETAILS[nextTiers[1]].label}
            </Link>
          )}
        </div>
      )}

      <Link
        to="/subscription"
        className="flex items-center gap-1.5 text-[11px] text-sidebar-muted transition-colors hover:text-sidebar-foreground"
      >
        <HelpCircle className="size-3 shrink-0" />
        Need help? View Subscription
      </Link>
    </div>
  )
}
