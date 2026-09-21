import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  getAllPayrollLines,
  getAttendanceSummary,
  getEmployeeMasterlist,
  getLeaveSummary,
  getPayrollRegister,
  type AttendanceSummaryRow,
  type LeaveSummaryRow,
  type PayrollLineWithContext,
  type PayrollRegisterReport,
} from '@/lib/services/reportService'
import { getPayrollPeriods } from '@/lib/services/payrollService'
import type { Employee, PayrollPeriod } from '@/types/domain'

export function usePayrollPeriodOptions() {
  const { user } = useSession()
  const [periods, setPeriods] = useState<PayrollPeriod[] | null>(null)

  useEffect(() => {
    setPeriods(null)
    getPayrollPeriods(user).then(setPeriods)
  }, [user])

  return { periods: periods ?? [], isLoading: periods === null }
}

export function usePayrollRegister(periodId: string | undefined) {
  const { user } = useSession()
  const [report, setReport] = useState<PayrollRegisterReport | null>(null)

  const refetch = useCallback(() => {
    getPayrollRegister(user, periodId).then(setReport)
  }, [user, periodId])

  useEffect(() => {
    setReport(null)
    refetch()
  }, [refetch])

  return { report, isLoading: report === null }
}

export function useAttendanceSummary() {
  const { user } = useSession()
  const [rows, setRows] = useState<AttendanceSummaryRow[] | null>(null)

  useEffect(() => {
    setRows(null)
    getAttendanceSummary(user).then(setRows)
  }, [user])

  return { rows: rows ?? [], isLoading: rows === null }
}

export function useLeaveSummary() {
  const { user } = useSession()
  const [rows, setRows] = useState<LeaveSummaryRow[] | null>(null)

  useEffect(() => {
    setRows(null)
    getLeaveSummary(user).then(setRows)
  }, [user])

  return { rows: rows ?? [], isLoading: rows === null }
}

export function useEmployeeMasterlist() {
  const { user } = useSession()
  const [employees, setEmployees] = useState<Employee[] | null>(null)

  useEffect(() => {
    setEmployees(null)
    getEmployeeMasterlist(user).then(setEmployees)
  }, [user])

  return { employees: employees ?? [], isLoading: employees === null }
}

/** Every payroll line ever run, joined with period + employee — powers Payroll Summary, statutory/BIR, and Advanced Analytics reports. */
export function useAllPayrollLines() {
  const { user } = useSession()
  const [rows, setRows] = useState<PayrollLineWithContext[] | null>(null)

  useEffect(() => {
    setRows(null)
    getAllPayrollLines(user).then(setRows)
  }, [user])

  return { rows: rows ?? [], isLoading: rows === null }
}
