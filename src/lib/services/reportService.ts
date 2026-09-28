import { getEmployees } from '@/lib/services/employeeService'
import { getPayrollLines, getPayrollPeriods, previewPayrollLine } from '@/lib/services/payrollService'
import { db } from '@/mock-data'
import type { AttendanceStatus, Employee, PayrollLine, PayrollPeriod, SessionUser } from '@/types/domain'

export interface PayrollRegisterRow {
  employee: Employee
  grossPay: number
  totalDeductions: number
  netPay: number
  sssEmployeeShare: number
  philhealthEmployeeShare: number
  pagibigEmployeeShare: number
  withholdingTax: number
}

export interface PayrollRegisterReport {
  period: (typeof db.payrollPeriods)[number] | undefined
  rows: PayrollRegisterRow[]
  totals: {
    grossPay: number
    totalDeductions: number
    netPay: number
  }
}

export async function getPayrollRegister(session: SessionUser, periodId: string | undefined): Promise<PayrollRegisterReport> {
  const periods = await getPayrollPeriods(session)
  const period = periods.find((p) => p.id === periodId) ?? periods[0]
  if (!period) return { period: undefined, rows: [], totals: { grossPay: 0, totalDeductions: 0, netPay: 0 } }

  const [lines, employees] = await Promise.all([getPayrollLines(session, period.id), getEmployees(session)])
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const rows = lines
    .map((line): PayrollRegisterRow | null => {
      const employee = employeeById.get(line.employeeId)
      if (!employee) return null
      return {
        employee,
        grossPay: line.grossPay,
        totalDeductions: line.totalDeductions,
        netPay: line.netPay,
        sssEmployeeShare: line.sssEmployeeShare,
        philhealthEmployeeShare: line.philhealthEmployeeShare,
        pagibigEmployeeShare: line.pagibigEmployeeShare,
        withholdingTax: line.withholdingTax,
      }
    })
    .filter((row): row is PayrollRegisterRow => row !== null)
    .sort((a, b) => a.employee.personal.lastName.localeCompare(b.employee.personal.lastName))

  const totals = rows.reduce(
    (acc, row) => ({
      grossPay: acc.grossPay + row.grossPay,
      totalDeductions: acc.totalDeductions + row.totalDeductions,
      netPay: acc.netPay + row.netPay,
    }),
    { grossPay: 0, totalDeductions: 0, netPay: 0 },
  )

  return { period, rows, totals }
}

export interface AttendanceSummaryRow {
  employee: Employee
  present: number
  late: number
  undertime: number
  absent: number
}

export async function getAttendanceSummary(session: SessionUser): Promise<AttendanceSummaryRow[]> {
  const employees = await getEmployees(session)
  const employeeIds = new Set(employees.map((e) => e.id))
  const counts = new Map<string, Record<AttendanceStatus, number>>()

  for (const record of db.attendanceRecords) {
    if (record.companyId !== session.companyId || !employeeIds.has(record.employeeId)) continue
    const bucket = counts.get(record.employeeId) ?? { present: 0, late: 0, undertime: 0, absent: 0 }
    bucket[record.status] += 1
    counts.set(record.employeeId, bucket)
  }

  return employees
    .map((employee) => {
      const bucket = counts.get(employee.id) ?? { present: 0, late: 0, undertime: 0, absent: 0 }
      return { employee, ...bucket }
    })
    .sort((a, b) => a.employee.personal.lastName.localeCompare(b.employee.personal.lastName))
}

export interface LeaveSummaryRow {
  employee: Employee
  leaveTypeName: string
  daysTaken: number
}

export async function getLeaveSummary(session: SessionUser): Promise<LeaveSummaryRow[]> {
  const employees = await getEmployees(session)
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  const leaveTypeById = new Map(db.leaveTypes.filter((lt) => lt.companyId === session.companyId).map((lt) => [lt.id, lt]))

  const totals = new Map<string, number>()
  for (const request of db.leaveRequests) {
    if (request.companyId !== session.companyId || request.status !== 'approved') continue
    if (!employeeById.has(request.employeeId)) continue
    const key = `${request.employeeId}::${request.leaveTypeId}`
    const days = (new Date(request.dateTo).getTime() - new Date(request.dateFrom).getTime()) / 86_400_000 + 1
    totals.set(key, (totals.get(key) ?? 0) + days)
  }

  const rows: LeaveSummaryRow[] = []
  for (const [key, daysTaken] of totals) {
    const [employeeId, leaveTypeId] = key.split('::')
    const employee = employeeById.get(employeeId)
    const leaveType = leaveTypeById.get(leaveTypeId)
    if (!employee || !leaveType) continue
    rows.push({ employee, leaveTypeName: leaveType.name, daysTaken })
  }

  return rows.sort((a, b) => a.employee.personal.lastName.localeCompare(b.employee.personal.lastName))
}

export async function getEmployeeMasterlist(session: SessionUser): Promise<Employee[]> {
  const employees = await getEmployees(session)
  return [...employees].sort((a, b) => a.personal.lastName.localeCompare(b.personal.lastName))
}

export interface PayrollLineWithContext {
  period: PayrollPeriod
  line: PayrollLine
  employee: Employee
}

/**
 * Every payroll line ever run for this company, joined with its period and employee — the shared
 * dataset behind every multi-period report (Payroll Summary, statutory/BIR reports, Advanced
 * Analytics) so they all read the same real payroll history instead of each re-deriving it.
 */
export async function getAllPayrollLines(session: SessionUser): Promise<PayrollLineWithContext[]> {
  const [periods, employees] = await Promise.all([getPayrollPeriods(session), getEmployees(session)])
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const rows: PayrollLineWithContext[] = []
  for (const period of periods) {
    const lines = await getPayrollLines(session, period.id)
    for (const line of lines) {
      const employee = employeeById.get(line.employeeId)
      if (employee) rows.push({ period, line, employee })
    }
  }
  return rows.sort((a, b) => a.period.startDate.localeCompare(b.period.startDate))
}

const SAMPLE_CUTOFF_COUNT = 3

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** The most recent semi-monthly cutoffs (1st–15th, 16th–end of month) that have fully ended, newest first. */
function recentCompletedCutoffs(count: number): { startDate: string; endDate: string; label: string }[] {
  const cutoffs: { startDate: string; endDate: string; label: string }[] = []
  const today = new Date()
  let year = today.getFullYear()
  let month = today.getMonth()
  let secondHalf = today.getDate() > 15
  while (cutoffs.length < count) {
    // Step back to the cutoff before the one containing today, then keep stepping back.
    if (secondHalf) {
      secondHalf = false
    } else {
      secondHalf = true
      month -= 1
      if (month < 0) {
        month = 11
        year -= 1
      }
    }
    const lastDay = new Date(year, month + 1, 0).getDate()
    const start = new Date(year, month, secondHalf ? 16 : 1)
    const end = new Date(year, month, secondHalf ? lastDay : 15)
    const monthName = start.toLocaleString('en-US', { month: 'short' })
    cutoffs.push({
      startDate: toDateKey(start),
      endDate: toDateKey(end),
      label: `${monthName} ${start.getDate()} – ${end.getDate()}, ${year}`,
    })
  }
  return cutoffs
}

export interface StatutoryContributionData {
  rows: PayrollLineWithContext[]
  /** True when no payroll has been run yet and `rows` are an engine-computed preview, not saved payroll. */
  isSample: boolean
}

/**
 * Real payroll lines when any payroll has been run. Otherwise, a preview of the last few completed
 * cutoffs computed by the real payroll engine (same statutory brackets and tax table) without
 * saving anything — so the consolidated report is never empty in a fresh demo, while no fake
 * periods leak into the rest of the app.
 */
export async function getStatutoryContributionData(session: SessionUser): Promise<StatutoryContributionData> {
  const real = await getAllPayrollLines(session)
  if (real.length > 0) return { rows: real, isSample: false }

  const employees = (await getEmployees(session)).filter((e) => e.employment.status === 'active')
  const rows: PayrollLineWithContext[] = []
  for (const cutoff of recentCompletedCutoffs(SAMPLE_CUTOFF_COUNT)) {
    const payDate = new Date(`${cutoff.endDate}T00:00:00`)
    payDate.setDate(payDate.getDate() + 5)
    const period: PayrollPeriod = {
      id: `sample_${cutoff.startDate}`,
      companyId: session.companyId,
      label: cutoff.label,
      startDate: cutoff.startDate,
      endDate: cutoff.endDate,
      payDate: toDateKey(payDate),
      // Draft, so hourly/output employees are costed from their approved (not-yet-locked) work logs.
      status: 'draft',
    }
    for (const employee of employees) {
      const line = previewPayrollLine(session, period, employee)
      if (line) rows.push({ period, line, employee })
    }
  }
  return { rows: rows.sort((a, b) => a.period.startDate.localeCompare(b.period.startDate)), isSample: true }
}
