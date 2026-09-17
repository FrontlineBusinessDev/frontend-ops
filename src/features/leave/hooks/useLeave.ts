import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getLeaveRequests, getLeaveTypes } from '@/lib/services/leaveService'
import type { LeaveRequest, LeaveType } from '@/types/domain'

export function useLeaveTypes() {
  const { user } = useSession()
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])

  useEffect(() => {
    getLeaveTypes(user).then(setLeaveTypes)
  }, [user])

  return leaveTypes
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
