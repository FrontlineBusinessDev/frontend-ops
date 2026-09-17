import { getEmployees } from '@/lib/services/employeeService'
import { getPayrollLines, getPayrollPeriods } from '@/lib/services/payrollService'
import { db } from '@/mock-data'
import type { AttendanceStatus, Employee, SessionUser } from '@/types/domain'

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
