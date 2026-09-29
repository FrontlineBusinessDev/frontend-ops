import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MobileDemoBar } from '@/components/layout/MobileDemoBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ADMIN_NAV } from '@/components/layout/navConfig'
import { CardThemeContext } from '@/components/ui/cardTheme'
import { useSession } from '@/hooks/useSession'

const COLLAPSE_STORAGE_KEY = 'fbs-ops-sidebar-collapsed'

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { user } = useSession()
  const isEssRoute = location.pathname.startsWith('/ess')
  const softCards = user.role === 'company_admin' && !isEssRoute
  // Each page's cards carry that page's sidebar icon as their corner watermark.
  const pageIcon = ADMIN_NAV.flatMap((g) => g.items).find(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  )?.icon

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      // localStorage may be unavailable (private browsing, etc.) — collapse preference just won't persist.
    }
  }, [collapsed])

  // Close the mobile drawer whenever navigation happens (link click, back/forward, etc.).
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background print:h-auto print:overflow-visible">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col print:w-full print:flex-none">
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        {/* data-portal scopes admin-only layout rules in globals.css (sticky table headers, pinned dialog actions).
            data-card-theme="soft" opts the Company Admin's pages into the pastel card theme (also in globals.css). */}
        <main
          data-portal={isEssRoute ? 'ess' : 'admin'}
          data-card-theme={softCards ? 'soft' : undefined}
          className="flex-1 scroll-smooth overflow-y-auto px-4 pb-24 pt-6 sm:px-6 md:py-6 lg:px-8 lg:py-8 print:overflow-visible print:p-0"
        >
          <CardThemeContext.Provider value={{ soft: softCards, watermark: pageIcon }}>
            <Outlet />
          </CardThemeContext.Provider>
        </main>
      </div>
      <MobileDemoBar />
    </div>
  )
}
