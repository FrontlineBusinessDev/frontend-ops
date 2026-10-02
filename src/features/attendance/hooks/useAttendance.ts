import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  getAttendanceAdjustments,
  getApprovedLeavesInRange,
  getAttendanceForDate,
  getEmployeeIdsOnLeaveForDate,
  getEmployeeIdsWithPendingAdjustmentForDate,
  getSchedules,
} from '@/lib/services/attendanceService'
import type { RosterContext } from '@/lib/schedule/roster'
import { getRosterContext } from '@/lib/services/scheduleService'
import type { ApprovedLeave } from '@/features/attendance/leaveStatus'
import type { AttendanceAdjustment, AttendanceRecord, ShiftTemplate } from '@/types/domain'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function useDailyAttendance(date: string = todayKey()) {
  const { user } = useSession()
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null)
  const [schedules, setSchedules] = useState<ShiftTemplate[]>([])
  const [rosterCtx, setRosterCtx] = useState<RosterContext>({ templates: [], assignments: [] })

  const refetch = useCallback(() => {
    getAttendanceForDate(user, date).then(setRecords)
    getSchedules(user).then(setSchedules)
    getRosterContext(user, date, date).then(setRosterCtx)
  }, [user, date])

  useEffect(() => {
    setRecords(null)
    refetch()
  }, [refetch])

  return { records: records ?? [], schedules, rosterCtx, isLoading: records === null, refetch }
}

/** Powers the "On Leave" / "Pending Adjustment" status filter options on the Daily Attendance tab. */
export function useDateStatusSets(date: string) {
  const { user } = useSession()
  const [onLeaveIds, setOnLeaveIds] = useState<Set<string>>(new Set())
  const [pendingAdjustmentIds, setPendingAdjustmentIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    getEmployeeIdsOnLeaveForDate(user, date).then(setOnLeaveIds)
    getEmployeeIdsWithPendingAdjustmentForDate(user, date).then(setPendingAdjustmentIds)
  }, [user, date])

  return { onLeaveIds, pendingAdjustmentIds }
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

/** Approved leaves covering `date` (with leave type) — drives the "On Leave" status override on the daily table. */
export function useApprovedLeavesForDate(date: string) {
  const { user } = useSession()
  const [leaves, setLeaves] = useState<ApprovedLeave[]>([])

  const refetch = useCallback(() => {
    getApprovedLeavesInRange(user, date, date).then(setLeaves)
  }, [user, date])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { leaves, refetch }
}
