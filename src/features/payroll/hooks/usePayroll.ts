import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getPayrollLines, getPayrollPeriods } from '@/lib/services/payrollService'
import type { PayrollLine, PayrollPeriod } from '@/types/domain'

export function usePayrollPeriods() {
  const { user } = useSession()
  const [periods, setPeriods] = useState<PayrollPeriod[] | null>(null)

  const refetch = useCallback(() => {
    getPayrollPeriods(user).then(setPeriods)
  }, [user])

  useEffect(() => {
    setPeriods(null)
    refetch()
  }, [refetch])

  return { periods: periods ?? [], isLoading: periods === null, refetch }
}

export function usePayrollLines(periodId: string | undefined) {
  const { user } = useSession()
  const [lines, setLines] = useState<PayrollLine[] | null>(null)

  const refetch = useCallback(() => {
    if (!periodId) return
    getPayrollLines(user, periodId).then(setLines)
  }, [user, periodId])

  useEffect(() => {
    setLines(null)
    refetch()
  }, [refetch])

  return { lines: lines ?? [], isLoading: lines === null, refetch }
}
