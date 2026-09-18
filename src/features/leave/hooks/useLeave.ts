import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getLeaveRequests, getLeaveTypes } from '@/lib/services/leaveService'
import type { LeaveRequest, LeaveType } from '@/types/domain'

export function useLeaveTypes() {
  const { user } = useSession()
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])

  const refetch = useCallback(() => {
    getLeaveTypes(user).then(setLeaveTypes)
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { leaveTypes, refetch }
}

export function useLeaveRequests() {
  const { user } = useSession()
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null)

  const refetch = useCallback(() => {
    getLeaveRequests(user).then(setRequests)
  }, [user])

  useEffect(() => {
    setRequests(null)
    refetch()
  }, [refetch])

  return { requests: requests ?? [], isLoading: requests === null, refetch }
}
