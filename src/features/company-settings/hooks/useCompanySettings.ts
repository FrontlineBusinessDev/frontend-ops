import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getCompany, getHolidays } from '@/lib/services/companyService'
import { getComplianceDeadlines } from '@/lib/services/complianceService'
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
  ComplianceDeadline,
  CompensationType,
  DeductionConfig,
  EarningConfig,
  Employee,
  Holiday,
  PayrollGroup,
  PayrollRules,
} from '@/types/domain'

export function useCompanySettings() {
  const { user } = useSession()
  const [company, setCompany] = useState<Company | null | undefined>(undefined)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [payrollGroups, setPayrollGroups] = useState<PayrollGroup[]>([])
  const [compensationTypes, setCompensationTypes] = useState<CompensationType[]>([])
  const [earningConfigs, setEarningConfigs] = useState<EarningConfig[]>([])
  const [deductionConfigs, setDeductionConfigs] = useState<DeductionConfig[]>([])
  const [payrollRules, setPayrollRules] = useState<PayrollRules | undefined>(undefined)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [complianceDeadlines, setComplianceDeadlines] = useState<ComplianceDeadline[]>([])

  const refetch = useCallback(() => {
    getCompany(user).then((result) => setCompany(result ?? null))
    getHolidays(user).then(setHolidays)
    getPayrollGroups(user).then(setPayrollGroups)
    getCompensationTypes(user).then(setCompensationTypes)
    getEarningConfigs(user).then(setEarningConfigs)
    getDeductionConfigs(user).then(setDeductionConfigs)
    getPayrollRules(user).then(setPayrollRules)
    getEmployees(user).then(setEmployees)
    getComplianceDeadlines(user).then(setComplianceDeadlines)
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    company,
    holidays,
    payrollGroups,
    compensationTypes,
    earningConfigs,
    deductionConfigs,
    payrollRules,
    employees,
    complianceDeadlines,
    isLoading: company === undefined,
    refetch,
  }
}
