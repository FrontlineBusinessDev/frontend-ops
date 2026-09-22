import type { Employee, LoanRecord, PayrollLine, PayrollPeriod } from '@/types/domain'

export interface SamplePayslip {
  period: PayrollPeriod
  line: PayrollLine
  otHours: number
}

const SAMPLE_PERIODS = [
  { id: 'sample_period_1', label: 'August 1–15, 2026', startDate: '2026-08-01', endDate: '2026-08-15', payDate: '2026-08-20', otHours: 3 },
  { id: 'sample_period_2', label: 'August 16–31, 2026', startDate: '2026-08-16', endDate: '2026-08-31', payDate: '2026-09-05', otHours: 0 },
  { id: 'sample_period_3', label: 'September 1–15, 2026', startDate: '2026-09-01', endDate: '2026-09-15', payDate: '2026-09-20', otHours: 5.5 },
] as const

/**
 * Illustrative payslip history shown only while this employee has no real finalized payroll
 * lines yet (payroll periods/lines reset every full reload in this mock app). Purely
 * presentational — never written to `db`, so it can't affect Payroll Runs, Reports, or any
 * other portal that reads real payroll data.
 */
export function buildSamplePayslips(employee: Employee, companyId: string): SamplePayslip[] {
  const monthly = employee.compensation.basicPay > 0 ? employee.compensation.basicPay : 30000
  const semiMonthlyBasic = Math.round(monthly / 2)
  const sssEmployeeShare = Math.round((monthly * 0.045) / 2)
  const philhealthEmployeeShare = Math.round((monthly * 0.02) / 2)
  const pagibigEmployeeShare = 100
  const withholdingTax = Math.round((Math.max(0, monthly - 20000) * 0.05) / 2)

  return SAMPLE_PERIODS.map((p) => {
    const overtimePay = Math.round((semiMonthlyBasic / 130) * p.otHours * 1.25)
    const grossPay = semiMonthlyBasic + overtimePay
    const totalDeductions = sssEmployeeShare + philhealthEmployeeShare + pagibigEmployeeShare + withholdingTax
    const netPay = grossPay - totalDeductions

    const period: PayrollPeriod = {
      id: p.id,
      companyId,
      label: p.label,
      startDate: p.startDate,
      endDate: p.endDate,
      payDate: p.payDate,
      status: 'finalized',
    }

    const line: PayrollLine = {
      id: `${p.id}_line_${employee.id}`,
      companyId,
      periodId: p.id,
      employeeId: employee.id,
      basicPay: semiMonthlyBasic,
      earnings:
        overtimePay > 0
          ? [{ label: 'Basic Pay', amount: semiMonthlyBasic }, { label: 'Overtime', amount: overtimePay }]
          : [{ label: 'Basic Pay', amount: semiMonthlyBasic }],
      grossPay,
      absentDays: 0,
      loanDeductions: [],
      otherDeductions: [],
      sssEmployeeShare,
      sssEmployerShare: sssEmployeeShare,
      philhealthEmployeeShare,
      philhealthEmployerShare: philhealthEmployeeShare,
      pagibigEmployeeShare,
      pagibigEmployerShare: pagibigEmployeeShare,
      withholdingTax,
      totalDeductions,
      netPay,
    }

    return { period, line, otHours: p.otHours }
  })
}

export type SampleAttendanceStatus = 'present' | 'late' | 'on_leave' | 'overtime'

export interface SampleAttendanceRow {
  id: string
  date: string
  timeIn: string | null
  timeOut: string | null
  hoursWorked: string
  status: SampleAttendanceStatus
}

const ATTENDANCE_SHAPE: Record<SampleAttendanceStatus, { timeIn: string | null; timeOut: string | null; hoursWorked: string }> = {
  present: { timeIn: '08:57', timeOut: '18:05', hoursWorked: '8.1 hrs' },
  late: { timeIn: '09:24', timeOut: '18:02', hoursWorked: '7.6 hrs' },
  on_leave: { timeIn: null, timeOut: null, hoursWorked: '—' },
  overtime: { timeIn: '08:55', timeOut: '20:10', hoursWorked: '10.2 hrs' },
}

/** Realistic two-week attendance log shown only while this employee has no real recorded days yet. */
export function buildSampleAttendance(): SampleAttendanceRow[] {
  const pattern: SampleAttendanceStatus[] = ['present', 'present', 'late', 'present', 'on_leave', 'present', 'overtime', 'present', 'late', 'present']
  const today = new Date()
  const rows: SampleAttendanceRow[] = []

  let cursor = 0
  while (rows.length < pattern.length) {
    const d = new Date(today)
    d.setDate(today.getDate() - cursor)
    cursor++
    if (d.getDay() === 0 || d.getDay() === 6) continue

    const status = pattern[rows.length]
    const dateKey = d.toISOString().slice(0, 10)
    rows.push({ id: `sample_att_${dateKey}`, date: dateKey, status, ...ATTENDANCE_SHAPE[status] })
  }

  return rows
}

/** Sample loan/deduction records shown only while this employee has no real loans on file. */
export function buildSampleLoans(employeeId: string, companyId: string): LoanRecord[] {
  return [
    {
      id: 'sample_loan_sss',
      companyId,
      employeeId,
      type: 'sss_salary_loan',
      label: 'SSS Salary Loan',
      principal: 24000,
      balance: 14000,
      monthlyDeduction: 1000,
      startDate: '2025-11-01',
      status: 'active',
    },
    {
      id: 'sample_loan_pagibig',
      companyId,
      employeeId,
      type: 'pagibig_calamity_loan',
      label: 'Pag-IBIG Calamity Loan',
      principal: 15000,
      balance: 6250,
      monthlyDeduction: 625,
      startDate: '2026-02-01',
      status: 'active',
    },
    {
      id: 'sample_loan_company',
      companyId,
      employeeId,
      type: 'company_loan',
      label: 'Company Emergency Loan',
      principal: 10000,
      balance: 0,
      monthlyDeduction: 500,
      startDate: '2025-06-01',
      status: 'completed',
    },
  ]
}
