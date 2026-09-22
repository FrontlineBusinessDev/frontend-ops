import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MobileDemoBar } from '@/components/layout/MobileDemoBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

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
      <div className="flex min-w-0 flex-1 flex-col print:flex-none">
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 scroll-smooth overflow-y-auto px-4 pb-24 pt-6 sm:px-6 md:py-6 lg:px-8 lg:py-8 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
      <MobileDemoBar />
    </div>
  )
}
