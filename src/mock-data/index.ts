import { generateAttendanceRecords } from '@/mock-data/generators/attendance'
import { generateEmployeesForCompany } from '@/mock-data/generators/employees'
import { generateLoans } from '@/mock-data/generators/loans'
import { generateAttendanceAdjustments, generateLeaveRequests } from '@/mock-data/generators/workflowRecords'
import { branches } from '@/mock-data/seed/branches'
import { companies } from '@/mock-data/seed/companies'
import { holidays } from '@/mock-data/seed/holidays'
import { leaveTypes } from '@/mock-data/seed/leaveTypes'
import { schedules } from '@/mock-data/seed/schedules'
import { statutoryConfigs } from '@/mock-data/seed/statutoryConfig'
import { users } from '@/mock-data/seed/users'
import type { ActivityLogEntry, ApiKey, Employee, PayrollLine, PayrollPeriod, Webhook } from '@/types/domain'

const EMPLOYEE_COUNT_BY_COMPANY: Record<string, number> = {
  co_frontline: 24,
  co_manila_bay: 18,
  co_cebu_craft: 15,
}

function buildEmployees(): Employee[] {
  return companies.flatMap((company) => {
    const companyBranches = branches.filter((b) => b.companyId === company.id)
    const count = EMPLOYEE_COUNT_BY_COMPANY[company.id] ?? 15
    return generateEmployeesForCompany(company.id, companyBranches, count)
  })
}

const employees = buildEmployees()
const schedulesByCompany = new Map(schedules.map((s) => [s.companyId, s]))
const attendanceRecords = generateAttendanceRecords(employees, schedulesByCompany)

/**
 * The hand-authored user seeds link to specific employee ids, but the employee
 * generator assigns names/branches deterministically from that id — not
 * necessarily what the seed author guessed. Reconcile in place so a user's
 * display name/branch always matches the employee record their session
 * actually resolves to (same object references, so this also updates what
 * `lib/auth/mockSession.ts` reads from the `users` seed module).
 */
function reconcileUsersWithEmployees() {
  for (const user of users) {
    if (!user.employeeId) continue
    const employee = employees.find((e) => e.id === user.employeeId)
    if (!employee) continue
    user.name = `${employee.personal.firstName} ${employee.personal.lastName}`
    user.branchId = employee.branchId
  }
}
reconcileUsersWithEmployees()

/**
 * In-memory mock database. This is the ONLY module that holds raw seed data;
 * every feature must read through `lib/services/*`, never import from here directly.
 */
export const db = {
  companies,
  branches,
  users,
  employees,
  schedules,
  leaveTypes,
  attendanceRecords,
  attendanceAdjustments: generateAttendanceAdjustments(employees, attendanceRecords),
  leaveRequests: generateLeaveRequests(employees, leaveTypes),
  statutoryConfigs,
  loans: generateLoans(employees),
  holidays,
  activityLog: [] as ActivityLogEntry[],
  payrollPeriods: [] as PayrollPeriod[],
  payrollLines: [] as PayrollLine[],
  apiKeys: [] as ApiKey[],
  webhooks: [] as Webhook[],
}
