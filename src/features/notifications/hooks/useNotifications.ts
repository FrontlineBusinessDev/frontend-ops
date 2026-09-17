import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getNotifications } from '@/lib/services/notificationService'
import type { AppNotification } from '@/lib/services/notificationService'

export function useNotifications() {
  const { user } = useSession()
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    let cancelled = false
    getNotifications(user).then((result) => {
      if (!cancelled) setNotifications(result)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  return notifications
}
