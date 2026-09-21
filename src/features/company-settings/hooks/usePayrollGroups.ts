import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getCompensationTypes, getPayrollGroups } from '@/lib/services/payrollSettingsService'
import type { CompensationType, PayrollGroup } from '@/types/domain'

/** Shared by the Employee profile's Payroll Information section and Payroll Run creation — both need to look up a company's Payroll Groups and Compensation Types without duplicating that data locally. */
export function usePayrollGroups() {
  const { user } = useSession()
  const [groups, setGroups] = useState<PayrollGroup[]>([])
  const [compensationTypes, setCompensationTypes] = useState<CompensationType[]>([])

  const refetch = useCallback(() => {
    getPayrollGroups(user).then(setGroups)
    getCompensationTypes(user).then(setCompensationTypes)
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { groups, compensationTypes, refetch }
}
