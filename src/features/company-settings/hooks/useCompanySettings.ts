import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getCompany, getHolidays, getSchedules } from '@/lib/services/companyService'
import { getEmployees } from '@/lib/services/employeeService'
import {
  getCompensationTypes,
  getDeductionConfigs,
  getEarningConfigs,
  getPayrollGroups,
  getPayrollRules,
} from '@/lib/services/payrollSettingsService'
import type {
  Company,
  CompensationType,
  DeductionConfig,
  EarningConfig,
  Employee,
  Holiday,
  PayrollGroup,
  PayrollRules,
  Schedule,
} from '@/types/domain'

export function useCompanySettings() {
  const { user } = useSession()
  const [company, setCompany] = useState<Company | null | undefined>(undefined)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [payrollGroups, setPayrollGroups] = useState<PayrollGroup[]>([])
  const [compensationTypes, setCompensationTypes] = useState<CompensationType[]>([])
  const [earningConfigs, setEarningConfigs] = useState<EarningConfig[]>([])
  const [deductionConfigs, setDeductionConfigs] = useState<DeductionConfig[]>([])
  const [payrollRules, setPayrollRules] = useState<PayrollRules | undefined>(undefined)
  const [employees, setEmployees] = useState<Employee[]>([])

  const refetch = useCallback(() => {
    getCompany(user).then((result) => setCompany(result ?? null))
    getSchedules(user).then(setSchedules)
    getHolidays(user).then(setHolidays)
    getPayrollGroups(user).then(setPayrollGroups)
    getCompensationTypes(user).then(setCompensationTypes)
    getEarningConfigs(user).then(setEarningConfigs)
    getDeductionConfigs(user).then(setDeductionConfigs)
    getPayrollRules(user).then(setPayrollRules)
    getEmployees(user).then(setEmployees)
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    company,
    schedules,
    holidays,
    payrollGroups,
    compensationTypes,
    earningConfigs,
    deductionConfigs,
    payrollRules,
    employees,
    isLoading: company === undefined,
    refetch,
  }
}
