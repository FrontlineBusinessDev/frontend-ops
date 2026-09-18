import { Building2, ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { usePermission } from '@/hooks/usePermission'
import { ADMIN_NAV, EMPLOYEE_NAV, MANAGER_NAV, SUPER_ADMIN_NAV } from '@/components/layout/navConfig'
import type { NavGroup } from '@/components/layout/navConfig'
import { cn } from '@/lib/utils/cn'

export interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

function useNavGroups(): NavGroup[] {
  const { user } = useSession()

  if (user.role === 'employee') return EMPLOYEE_NAV
  if (user.role === 'manager') return MANAGER_NAV
  if (user.role === 'super_admin') return SUPER_ADMIN_NAV
  return ADMIN_NAV
}

function NavItemLink({ item, collapsed, onNavigate }: { item: NavGroup['items'][number]; collapsed: boolean; onNavigate?: () => void }) {
  const { user } = useSession()
  const hasCapability = usePermission(item.capability ?? 'dashboard.view')
  if (item.capability && !hasCapability) return null

  // Company Admin gets a bolder "pill" active state (per its dashboard redesign); other
  // roles keep the existing subtle highlight untouched.
  const isCompanyAdmin = user.role === 'company_admin'

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors duration-150',
          'hover:bg-sidebar-active hover:text-sidebar-foreground',
          collapsed && 'justify-center px-0',
          isActive &&
            (isCompanyAdmin
              ? 'bg-primary text-primary-foreground shadow-soft hover:bg-primary'
              : 'bg-sidebar-active text-sidebar-foreground'),
        )
      }
    >
      <item.icon className="size-4 shrink-0" />
      <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
    </NavLink>
  )
}

function SidebarNav({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {groups.map((group, idx) => (
        <div key={group.label ?? idx} className="flex flex-col gap-1">
          {group.label && !collapsed && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">{group.label}</p>
          )}
          {group.items.map((item) => (
            <NavItemLink key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  )
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 px-2 pb-6', collapsed && 'justify-center px-0')}>
      <img src="/favicon.svg" alt="" className="size-7 shrink-0" />
      {!collapsed && <span className="font-display text-sm font-semibold tracking-tight text-sidebar-foreground">FBS OPS</span>}
    </div>
  )
}

function SidebarTagline({ collapsed }: { collapsed: boolean }) {
  const { user } = useSession()
  if (user.role !== 'company_admin' || collapsed) return null

  return (
    <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-white/5 px-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
        <Building2 className="size-4" />
      </div>
      <p className="text-[11px] leading-snug text-sidebar-muted">Building better workplaces together.</p>
    </div>
  )
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const groups = useNavGroups()

  return (
    <>
      {/* Desktop persistent sidebar — collapsible to an icon-only rail. */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar py-5 lg:flex',
          'transition-[width] duration-200 ease-[var(--ease-editorial)]',
          collapsed ? 'w-16 px-2' : 'w-64 px-3',
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <SidebarNav groups={groups} collapsed={collapsed} />
        <SidebarTagline collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted transition-colors duration-150',
            'hover:bg-sidebar-active hover:text-sidebar-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? <ChevronsRight className="size-4 shrink-0" /> : <ChevronsLeft className="size-4 shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      {/* Mobile/tablet off-canvas drawer — always full width/labels, opened via the Topbar menu button. */}
      <div className="lg:hidden">
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
            mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={onCloseMobile}
          aria-hidden="true"
        />
        <aside
          className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar px-3 py-5 shadow-soft-lg transition-transform duration-300 ease-[var(--ease-editorial)]"
          style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          <div className="flex items-center justify-between pb-6">
            <div className="flex items-center gap-2 px-2">
              <img src="/favicon.svg" alt="" className="size-7 shrink-0" />
              <span className="font-display text-sm font-semibold tracking-tight text-sidebar-foreground">FBS OPS</span>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="flex size-8 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <SidebarNav groups={groups} collapsed={false} onNavigate={onCloseMobile} />
          <SidebarTagline collapsed={false} />
        </aside>
      </div>
    </>
  )
}
