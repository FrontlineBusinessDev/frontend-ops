import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, FlaskConical, Sparkles } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { useActivePlanTier } from '@/hooks/useActivePlanTier'
import { useDemoPlanStore } from '@/lib/demo/demoPlanStore'
import { PLAN_DETAILS, PLAN_ORDER } from '@/lib/plans'
import { cn } from '@/lib/utils/cn'

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  hr_admin: 'HR Admin',
  payroll_admin: 'Payroll Admin',
  manager: 'Manager',
  employee: 'Employee',
}

/**
 * Demo Portal tier-preview switcher — shared between the desktop Topbar (>=768px) and the mobile
 * fixed bottom nav (<768px), so the dropdown content/logic exists in exactly one place.
 * `side` flips the popover to open upward when the trigger sits in a bottom bar.
 */
export function TierSwitcherDropdown({ triggerClassName, side = 'bottom' }: { triggerClassName?: string; side?: 'top' | 'bottom' }) {
  const { company } = useTenant()
  const { tier: activeTier, isPreview } = useActivePlanTier()
  const setPreviewTier = useDemoPlanStore((s) => s.setPreviewTier)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium',
          isPreview ? 'border-warning/40 bg-warning/5 text-warning' : 'border-accent/40 bg-accent/5 text-accent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          triggerClassName,
        )}
      >
        <Sparkles className="size-3.5 shrink-0" />
        <span className="truncate">{isPreview ? `Previewing: ${PLAN_DETAILS[activeTier].label}` : 'Demo Portal Preview'}</span>
        <ChevronDown className="size-3.5 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          side={side}
          sideOffset={6}
          className="z-50 w-72 rounded-xl border border-border bg-card p-1 shadow-soft-lg"
        >
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preview navigation for a plan tier
          </p>
          <DropdownMenu.Item
            onSelect={() => setPreviewTier(null)}
            className={cn(
              'flex cursor-pointer flex-col rounded-lg px-2.5 py-2 text-sm outline-none',
              'data-[highlighted]:bg-muted',
              !isPreview && 'bg-muted',
            )}
          >
            <span className="font-medium">Use real plan ({PLAN_DETAILS[company?.planTier ?? 'basic'].label})</span>
            <span className="text-xs text-muted-foreground">Exit demo preview</span>
          </DropdownMenu.Item>
          {PLAN_ORDER.map((tier) => (
            <DropdownMenu.Item
              key={tier}
              onSelect={() => setPreviewTier(tier)}
              className={cn(
                'flex cursor-pointer flex-col rounded-lg px-2.5 py-2 text-sm outline-none',
                'data-[highlighted]:bg-muted',
                isPreview && tier === activeTier && 'bg-muted',
              )}
            >
              <span className="font-medium">{PLAN_DETAILS[tier].label}</span>
              <span className="text-xs text-muted-foreground">
                {PLAN_DETAILS[tier].targetAudience} · Up to {PLAN_DETAILS[tier].employeeLimit ?? '150+'} employees
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/**
 * Demo role/company switcher — shared between the desktop Topbar (>=768px) and the mobile fixed
 * bottom nav (<768px). `side` flips the popover to open upward when the trigger sits in a bottom bar.
 */
export function RoleSwitcherDropdown({ triggerClassName, side = 'bottom' }: { triggerClassName?: string; side?: 'top' | 'bottom' }) {
  const { user, availableUsers, setCurrentUserId } = useSession()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          triggerClassName,
        )}
      >
        <FlaskConical className="size-3.5 shrink-0" />
        <span className="truncate">Demo: {ROLE_LABELS[user.role]}</span>
        <ChevronDown className="size-3.5 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          side={side}
          sideOffset={6}
          className="z-50 w-64 rounded-xl border border-border bg-card p-1 shadow-soft-lg"
        >
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Switch role / company</p>
          {availableUsers.map((u) => (
            <DropdownMenu.Item
              key={u.id}
              onSelect={() => setCurrentUserId(u.id)}
              className={cn(
                'flex cursor-pointer flex-col rounded-lg px-2.5 py-2 text-sm outline-none',
                'data-[highlighted]:bg-muted',
                u.id === user.id && 'bg-muted',
              )}
            >
              <span className="font-medium">{u.name}</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[u.role]}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
