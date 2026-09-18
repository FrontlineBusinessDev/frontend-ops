import { Building2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { usePermission } from '@/hooks/usePermission'
import { ADMIN_NAV, EMPLOYEE_NAV, MANAGER_NAV, SUPER_ADMIN_NAV } from '@/components/layout/navConfig'
import type { NavGroup } from '@/components/layout/navConfig'
import { cn } from '@/lib/utils/cn'

function useNavGroups(): NavGroup[] {
  const { user } = useSession()

  if (user.role === 'employee') return EMPLOYEE_NAV
  if (user.role === 'manager') return MANAGER_NAV
  if (user.role === 'super_admin') return SUPER_ADMIN_NAV
  return ADMIN_NAV
}

function NavItemLink({ item }: { item: NavGroup['items'][number] }) {
  const { user } = useSession()
  const hasCapability = usePermission(item.capability ?? 'dashboard.view')
  if (item.capability && !hasCapability) return null

  // Company Admin gets a bolder "pill" active state (per its dashboard redesign); other
  // roles keep the existing subtle highlight untouched.
  const isCompanyAdmin = user.role === 'company_admin'

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors duration-150',
          'hover:bg-sidebar-active hover:text-sidebar-foreground',
          isActive &&
            (isCompanyAdmin
              ? 'bg-primary text-primary-foreground shadow-soft hover:bg-primary'
              : 'bg-sidebar-active text-sidebar-foreground'),
        )
      }
    >
      <item.icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  const { user } = useSession()
  const groups = useNavGroups()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
      <div className="flex items-center gap-2 px-2 pb-6">
        <img src="/favicon.svg" alt="" className="size-7" />
        <span className="font-display text-sm font-semibold tracking-tight text-sidebar-foreground">FBS OPS</span>
      </div>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {groups.map((group, idx) => (
          <div key={group.label ?? idx} className="flex flex-col gap-1">
            {group.label && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <NavItemLink key={item.path} item={item} />
            ))}
          </div>
        ))}
      </nav>
      {user.role === 'company_admin' && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-white/5 px-3 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Building2 className="size-4" />
          </div>
          <p className="text-[11px] leading-snug text-sidebar-muted">Building better workplaces together.</p>
        </div>
      )}
    </aside>
  )
}
