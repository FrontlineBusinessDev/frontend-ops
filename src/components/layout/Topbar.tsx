import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { LogOut, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ROLE_LABELS, RoleSwitcherDropdown, TierSwitcherDropdown } from '@/components/layout/DemoSwitchers'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { cn } from '@/lib/utils/cn'

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const { user, logout } = useSession()
  const { company, activeBranch } = useTenant()
  const navigate = useNavigate()

  function onLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/60 px-4 backdrop-blur-sm lg:px-6 print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <Menu className="size-4" />
          </button>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">{company?.name}</p>
          {activeBranch && <p className="truncate text-xs text-muted-foreground">{activeBranch.name}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Demo Portal tier preview + role switcher — desktop/tablet only (>=768px). On mobile
            these move to the fixed bottom nav (MobileDemoBar) to keep the header uncluttered. */}
        {user.role === 'company_admin' && (
          <div className="hidden md:block">
            <TierSwitcherDropdown />
          </div>
        )}
        <div className="hidden md:block">
          <RoleSwitcherDropdown />
        </div>

        <ThemeToggle />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className={cn(
              'flex items-center gap-2 rounded-lg py-1 pl-1 pr-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Avatar name={user.name} size="sm" />
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight">{user.name}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-44 rounded-xl border border-border bg-card p-1 shadow-soft-lg">
              <DropdownMenu.Item
                onSelect={onLogout}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-danger outline-none data-[highlighted]:bg-muted"
              >
                <LogOut className="size-3.5" />
                Log out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
