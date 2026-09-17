import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getCompany, getHolidays, getSchedules } from '@/lib/services/companyService'
import type { Company, Holiday, Schedule } from '@/types/domain'

export function useCompanySettings() {
  const { user } = useSession()
  const [company, setCompany] = useState<Company | null | undefined>(undefined)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])

  const refetch = useCallback(() => {
    getCompany(user).then((result) => setCompany(result ?? null))
    getSchedules(user).then(setSchedules)
    getHolidays(user).then(setHolidays)
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { company, schedules, holidays, isLoading: company === undefined, refetch }
}
