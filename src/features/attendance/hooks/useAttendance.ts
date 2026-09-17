import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getAttendanceAdjustments, getAttendanceForDate, getSchedules } from '@/lib/services/attendanceService'
import type { AttendanceAdjustment, AttendanceRecord, Schedule } from '@/types/domain'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function useDailyAttendance(date: string = todayKey()) {
  const { user } = useSession()
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])

  useEffect(() => {
    setRecords(null)
    getAttendanceForDate(user, date).then(setRecords)
    getSchedules(user).then(setSchedules)
  }, [user, date])

  return { records: records ?? [], schedules, isLoading: records === null }
}

export function useAttendanceAdjustments() {
  const { user } = useSession()
  const [adjustments, setAdjustments] = useState<AttendanceAdjustment[] | null>(null)

  const refetch = useCallback(() => {
    getAttendanceAdjustments(user).then(setAdjustments)
  }, [user])

  useEffect(() => {
    setAdjustments(null)
    refetch()
  }, [refetch])

  return { adjustments: adjustments ?? [], isLoading: adjustments === null, refetch }
}
