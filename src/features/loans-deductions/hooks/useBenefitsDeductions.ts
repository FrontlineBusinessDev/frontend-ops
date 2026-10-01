import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getEmployeeBenefits, getEmployeeDeductions } from '@/lib/services/benefitsService'
import { getLoanTypes } from '@/lib/services/loanTypeService'
import { getDeductionConfigs } from '@/lib/services/payrollSettingsService'
import type { DeductionConfig, EmployeeBenefit, EmployeeDeduction, LoanTypeConfig } from '@/types/domain'

export function useEmployeeBenefits() {
  const { user } = useSession()
  const [benefits, setBenefits] = useState<EmployeeBenefit[] | null>(null)

  const refetch = useCallback(() => {
    getEmployeeBenefits(user).then(setBenefits)
  }, [user])

  useEffect(() => {
    setBenefits(null)
    refetch()
  }, [refetch])

  return { benefits: benefits ?? [], isLoading: benefits === null, refetch }
}

export function useEmployeeDeductions() {
  const { user } = useSession()
  const [deductions, setDeductions] = useState<EmployeeDeduction[] | null>(null)

  const refetch = useCallback(() => {
    getEmployeeDeductions(user).then(setDeductions)
  }, [user])

  useEffect(() => {
    setDeductions(null)
    refetch()
  }, [refetch])

  return { deductions: deductions ?? [], isLoading: deductions === null, refetch }
}

/** The company's Payroll Settings deduction entries (how each loan type / deduction is split across pay runs). */
export function useDeductionConfigs() {
  const { user } = useSession()
  const [configs, setConfigs] = useState<DeductionConfig[]>([])
  useEffect(() => {
    getDeductionConfigs(user).then(setConfigs)
  }, [user])
  return configs
}

/** The company's loan types — the single list behind the Loan Types tab, the Add Loan modal, loan cards and schedules. */
export function useLoanTypes() {
  const { user } = useSession()
  const [types, setTypes] = useState<LoanTypeConfig[]>([])

  const refetch = useCallback(() => {
    getLoanTypes(user).then(setTypes)
  }, [user])

  useEffect(() => {
    refetch()
  }, [refetch])

  /** A loan type's label by key, falling back to the loan's own label for types that no longer exist. */
  const labelFor = useCallback((key: string, fallback?: string) => types.find((t) => t.key === key)?.label ?? fallback ?? key, [types])

  return { types, labelFor, refetch }
}
