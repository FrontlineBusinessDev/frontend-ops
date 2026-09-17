import { scopeForSession } from '@/lib/tenancy/tenantScope'
import { db } from '@/mock-data'
import type { Employee, EmploymentStatus, SessionUser } from '@/types/domain'

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
  basicPay: number
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
    },
    compensation: { basicPay: input.basicPay, payType: 'monthly', allowances: [] },
    benefits: { leaveCreditsByType: { 'Vacation Leave': 15, 'Sick Leave': 10, 'Emergency Leave': 5 } },
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
