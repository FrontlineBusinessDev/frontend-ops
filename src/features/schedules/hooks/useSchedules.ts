import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import type { RosterContext } from '@/lib/schedule/roster'
import { getRosterContext, getScheduleTeams, getShiftTemplates } from '@/lib/services/scheduleService'
import type { ScheduleTeam, ShiftTemplate } from '@/types/domain'

export function useShiftTemplates() {
  const { user } = useSession()
  const [templates, setTemplates] = useState<ShiftTemplate[] | null>(null)

  const refetch = useCallback(() => {
    getShiftTemplates(user).then(setTemplates)
  }, [user])

  useEffect(() => {
    setTemplates(null)
    refetch()
  }, [refetch])

  return { templates: templates ?? [], isLoading: templates === null, refetch }
}

/** Templates, day-level assignments and approved leaves for the dates shown (inclusive). */
export function useRoster(from: string, to: string) {
  const { user } = useSession()
  const [roster, setRoster] = useState<RosterContext | null>(null)

  const refetch = useCallback(() => {
    getRosterContext(user, from, to).then(setRoster)
  }, [user, from, to])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { roster: roster ?? { templates: [], assignments: [], leaves: [] }, isLoading: roster === null, refetch }
}

export function useScheduleTeams() {
  const { user } = useSession()
  const [teams, setTeams] = useState<ScheduleTeam[] | null>(null)

  const refetch = useCallback(() => {
    getScheduleTeams(user).then(setTeams)
  }, [user])

  useEffect(() => {
    setTeams(null)
    refetch()
  }, [refetch])

  return { teams: teams ?? [], isLoading: teams === null, refetch }
}
