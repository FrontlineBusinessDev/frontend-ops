import { scopeForSession } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type {
  Employee,
  EmployeeBank,
  EmployeeGovernment,
  EmployeePersonal,
  EmploymentStatus,
  PayRateType,
  SessionUser,
} from '@/types/domain'

/**
 * Mock-backed today, swappable for real HTTP calls later without changing
 * callers: keep the same async signatures and return shapes.
 */
export async function getEmployees(session: SessionUser): Promise<Employee[]> {
  return scopeForSession(db.employees, session, { employeeIdField: 'id' })
}

export async function getEmployee(session: SessionUser, employeeId: string): Promise<Employee | undefined> {
  const scoped = scopeForSession(db.employees, session, { employeeIdField: 'id' })
  return scoped.find((e) => e.id === employeeId)
}

export interface CreateEmployeeInput {
  firstName: string
  lastName: string
  department: string
  position: string
  branchId: string
  employmentType: Employee['employment']['employmentType']
  dateHired: string
  payType: PayRateType
  basicPay: number
  outputUnit?: string | null
}

export async function createEmployee(session: SessionUser, input: CreateEmployeeInput): Promise<Employee> {
  const sequence = db.employees.filter((e) => e.companyId === session.companyId).length + 1
  const employee: Employee = {
    id: `${session.companyId}_emp_${crypto.randomUUID().slice(0, 8)}`,
    companyId: session.companyId,
    branchId: input.branchId,
    employeeNumber: `${session.companyId.slice(3, 5).toUpperCase()}-${String(sequence).padStart(4, '0')}`,
    personal: {
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: '1995-01-01',
      civilStatus: 'single',
      address: '',
      contactNumber: '',
    },
    employment: {
      position: input.position,
      department: input.department,
      employmentType: input.employmentType,
      dateHired: input.dateHired,
      status: 'active',
      category: 'regular',
    },
    compensation: { basicPay: input.basicPay, payType: input.payType, outputUnit: input.outputUnit ?? null, allowances: [] },
    benefits: {
      leaveCreditsByType: { 'Vacation Leave': 15, 'Sick Leave': 10, 'Emergency Leave': 5, 'Maternity/Paternity Leave': 7 },
    },
    government: {},
    bank: {},
    documents: [],
    history: [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        actor: session.name,
        action: 'Employee record created',
      },
    ],
    compensationHistory: [
      {
        id: crypto.randomUUID(),
        effectiveDate: input.dateHired,
        type: 'Initial Hire',
        previousSalary: null,
        newSalary: input.basicPay,
        approvedBy: session.name,
      },
    ],
  }

  db.employees.push(employee)
  return employee
}

export interface SelfServiceProfileUpdate {
  contactNumber: string
  personalEmail?: string
  address: string
}

/** Employees may only edit their own allowed profile fields — never payroll, government, or employment data. */
export async function updateEmployeeSelf(session: SessionUser, updates: SelfServiceProfileUpdate): Promise<void> {
  if (!session.employeeId) return
  const employee = db.employees.find((e) => e.id === session.employeeId && e.companyId === session.companyId)
  if (!employee) return

  employee.personal.contactNumber = updates.contactNumber
  employee.personal.personalEmail = updates.personalEmail
  employee.personal.address = updates.address
}

export async function updateEmployeeStatus(
  session: SessionUser,
  employeeId: string,
  status: EmploymentStatus,
): Promise<void> {
  const employee = db.employees.find((e) => e.id === employeeId && e.companyId === session.companyId)
  if (!employee) return

  employee.employment.status = status
  employee.history.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor: session.name,
    action: `Status changed to ${status}`,
  })
}

function findCompanyEmployee(session: SessionUser, employeeId: string): Employee | undefined {
  return db.employees.find((e) => e.id === employeeId && e.companyId === session.companyId)
}

function logHistory(employee: Employee, actor: string, action: string) {
  employee.history.push({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor, action })
}

export async function updateEmployeePersonalInfo(
  session: SessionUser,
  employeeId: string,
  updates: EmployeePersonal,
): Promise<void> {
  const employee = findCompanyEmployee(session, employeeId)
  if (!employee) return

  employee.personal = updates
  logHistory(employee, session.name, 'Personal information updated')
}

export interface UpdateEmploymentInfoInput {
  position: string
  department: string
  employmentType: Employee['employment']['employmentType']
  dateHired: string
  category: Employee['employment']['category']
}

export async function updateEmployeeEmploymentInfo(
  session: SessionUser,
  employeeId: string,
  updates: UpdateEmploymentInfoInput,
): Promise<void> {
  const employee = findCompanyEmployee(session, employeeId)
  if (!employee) return

  Object.assign(employee.employment, updates)
  logHistory(employee, session.name, 'Employment information updated')
}

export interface UpdateCompensationInput {
  basicPay: number
  payType: PayRateType
  outputUnit?: string | null
  reason: string
}

/** Records a Compensation History entry only when the base pay actually changes. */
export async function updateEmployeeCompensation(
  session: SessionUser,
  employeeId: string,
  updates: UpdateCompensationInput,
): Promise<void> {
  const employee = findCompanyEmployee(session, employeeId)
  if (!employee) return

  const previousSalary = employee.compensation.basicPay
  employee.compensation.basicPay = updates.basicPay
  employee.compensation.payType = updates.payType
  employee.compensation.outputUnit = updates.payType === 'output_based' ? updates.outputUnit ?? null : null

  if (updates.basicPay !== previousSalary) {
    employee.compensationHistory.push({
      id: crypto.randomUUID(),
      effectiveDate: new Date().toISOString().slice(0, 10),
      type: updates.reason,
      previousSalary,
      newSalary: updates.basicPay,
      approvedBy: session.name,
    })
  }

  logHistory(employee, session.name, 'Compensation updated')
}

export interface UpdateBenefitsInput {
  hmoPlan?: string
  leaveCreditsByType: Record<string, number>
}

export async function updateEmployeeBenefits(
  session: SessionUser,
  employeeId: string,
  updates: UpdateBenefitsInput,
): Promise<void> {
  const employee = findCompanyEmployee(session, employeeId)
  if (!employee) return

  employee.benefits = updates
  logHistory(employee, session.name, 'Benefits updated')
}

export async function updateEmployeeGovernmentInfo(
  session: SessionUser,
  employeeId: string,
  updates: EmployeeGovernment,
): Promise<void> {
  const employee = findCompanyEmployee(session, employeeId)
  if (!employee) return

  employee.government = updates
  logHistory(employee, session.name, 'Government information updated')
}

export async function updateEmployeeBankInfo(
  session: SessionUser,
  employeeId: string,
  updates: EmployeeBank,
): Promise<void> {
  const employee = findCompanyEmployee(session, employeeId)
  if (!employee) return

  employee.bank = updates
  logHistory(employee, session.name, 'Bank/payment information updated')
}

/** Employee ids with an approved leave request covering today — used to derive the "On Leave" filter without touching the core employment.status enum. */
export async function getEmployeeIdsOnLeaveToday(session: SessionUser): Promise<Set<string>> {
  const employees = scopeForSession(db.employees, session, { employeeIdField: 'id' })
  const employeeIds = new Set(employees.map((e) => e.id))
  const today = new Date().toISOString().slice(0, 10)

  const onLeave = db.leaveRequests.filter(
    (r) =>
      r.companyId === session.companyId &&
      r.status === 'approved' &&
      employeeIds.has(r.employeeId) &&
      r.dateFrom <= today &&
      r.dateTo >= today,
  )
  return new Set(onLeave.map((r) => r.employeeId))
}
