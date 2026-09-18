import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getAdminDashboardOverview, getDashboardStats, getHeadcountTrend } from '@/lib/services/dashboardService'
import type { AdminDashboardOverview, DashboardStats } from '@/lib/services/dashboardService'

export function useDashboardData() {
  const { user } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    let cancelled = false
    getDashboardStats(user).then((result) => {
      if (!cancelled) setStats(result)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const trend = getHeadcountTrend(user)

  return { stats, trend, isLoading: stats === null }
}

export function useAdminDashboardOverview() {
  const { user } = useSession()
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null)

  useEffect(() => {
    let cancelled = false
    setOverview(null)
    getAdminDashboardOverview(user).then((result) => {
      if (!cancelled) setOverview(result)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  return { overview, isLoading: overview === null }
}
