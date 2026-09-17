import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getActivityLog, getUsers } from '@/lib/services/userService'
import type { ActivityLogEntry, SessionUser } from '@/types/domain'

export function useUsers() {
  const { user } = useSession()
  const [users, setUsers] = useState<SessionUser[] | null>(null)

  const refetch = useCallback(() => {
    getUsers(user).then(setUsers)
  }, [user])

  useEffect(() => {
    setUsers(null)
    refetch()
  }, [refetch])

  return { users: users ?? [], isLoading: users === null, refetch }
}

export function useActivityLog() {
  const { user } = useSession()
  const [log, setLog] = useState<ActivityLogEntry[]>([])

  useEffect(() => {
    getActivityLog(user).then(setLog)
  }, [user])

  return log
}
