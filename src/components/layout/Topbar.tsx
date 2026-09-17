import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, ChevronDown, FlaskConical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { cn } from '@/lib/utils/cn'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  hr_admin: 'HR Admin',
  payroll_admin: 'Payroll Admin',
  manager: 'Manager',
  employee: 'Employee',
}

export function Topbar() {
  const { user, availableUsers, setCurrentUserId } = useSession()
  const { company, activeBranch } = useTenant()
  const notifications = useNotifications()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/60 px-4 backdrop-blur-sm lg:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight">{company?.name}</p>
        {activeBranch && <p className="truncate text-xs text-muted-foreground">{activeBranch.name}</p>}
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <FlaskConical className="size-3.5" />
            Demo: {ROLE_LABELS[user.role]}
            <ChevronDown className="size-3.5" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 w-64 rounded-xl border border-border bg-card p-1 shadow-soft-lg"
            >
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Switch role / company
              </p>
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

        <Link
          to="/notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {notifications.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-danger" />
          )}
        </Link>

        <div className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2">
          <Avatar name={user.name} size="sm" />
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold leading-tight">{user.name}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
