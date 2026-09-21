import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getThirteenthMonthLines, getThirteenthMonthRuns } from '@/lib/services/thirteenthMonthService'
import type { ThirteenthMonthLine, ThirteenthMonthRun } from '@/types/domain'

export function useThirteenthMonthRuns() {
  const { user } = useSession()
  const [runs, setRuns] = useState<ThirteenthMonthRun[] | null>(null)

  const refetch = useCallback(() => {
    getThirteenthMonthRuns(user).then(setRuns)
  }, [user])

  useEffect(() => {
    setRuns(null)
    refetch()
  }, [refetch])

  return { runs: runs ?? [], isLoading: runs === null, refetch }
}

export function useThirteenthMonthLines(runId: string | undefined) {
  const { user } = useSession()
  const [lines, setLines] = useState<ThirteenthMonthLine[] | null>(null)

  const refetch = useCallback(() => {
    if (!runId) {
      setLines([])
      return
    }
    getThirteenthMonthLines(user, runId).then(setLines)
  }, [user, runId])

  useEffect(() => {
    setLines(null)
    refetch()
  }, [refetch])

  return { lines: lines ?? [], isLoading: lines === null, refetch }
}
