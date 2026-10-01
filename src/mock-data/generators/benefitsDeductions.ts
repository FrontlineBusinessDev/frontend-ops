import type { Employee, EmployeeBenefit, EmployeeDeduction } from '@/types/domain'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysFromToday = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return iso(d)
}

/** Benefits start on the hire date, but never earlier than this (the demo's payroll history begins mid-2026). */
const BENEFIT_START_FLOOR = '2026-01-01'
const startFor = (employee: Employee) => (employee.employment.dateHired > BENEFIT_START_FLOOR ? employee.employment.dateHired : BENEFIT_START_FLOOR)

/**
 * Sample benefits for the demo roster: an HMO plan for everyone whose profile lists one (matching the
 * profile's plan name), group life insurance for regular employees, plus cash allowances and a few other
 * perks spread by department. Cash allowances are paid through payroll; the rest show on the payslip.
 */
export function generateBenefits(employees: Employee[]): EmployeeBenefit[] {
  const benefits: EmployeeBenefit[] = []
  const active = employees.filter((e) => e.employment.status === 'active')

  active.forEach((employee, index) => {
    const base = { companyId: employee.companyId, employeeId: employee.id, startDate: startFor(employee), status: 'active' as const }
    const id = (key: string) => `${employee.id}_ben_${key}`

    if (employee.benefits.hmoPlan) {
      const withDependent = index % 4 === 0
      benefits.push({
        ...base,
        id: id('hmo'),
        category: 'hmo',
        name: 'HMO',
        provider: 'Maxicare',
        coverage: `${employee.benefits.hmoPlan} (${withDependent ? 'Employee + 1 dependent' : 'Employee only'})`,
        monthlyValue: 1850,
        // The employer covers the employee; adding a dependent costs the employee a monthly share.
        employeeShare: withDependent ? 350 : 0,
        notes: withDependent ? 'Dependent add-on shared with the employee via payroll deduction.' : undefined,
      })
    }

    if (employee.employment.employmentType === 'regular') {
      benefits.push({
        ...base,
        id: id('life'),
        category: 'insurance',
        name: 'Group Life & Accident Insurance',
        provider: 'Pru Life UK',
        coverage: '₱250,000 life · ₱100,000 accidental death',
        monthlyValue: 250,
        employeeShare: 0,
      })
    }

    const dept = employee.employment.department
    if (['IT', 'Sales', 'Customer Support'].includes(dept)) {
      benefits.push({ ...base, id: id('comm'), category: 'allowance', name: 'Communication Allowance', monthlyValue: 500, employeeShare: 0, notes: 'Monthly mobile/internet subsidy.' })
    }
    if (['Warehouse', 'Operations'].includes(dept)) {
      benefits.push({ ...base, id: id('rice'), category: 'allowance', name: 'Rice Subsidy', monthlyValue: 600, employeeShare: 0, notes: 'Monthly rice allowance.' })
    }

    if (index % 5 === 0) {
      benefits.push({ ...base, id: id('wellness'), category: 'other', name: 'Wellness Program', provider: 'Anytime Fitness', coverage: 'Gym membership', monthlyValue: 400, employeeShare: 0 })
    }
    if (index % 7 === 1) {
      benefits.push({ ...base, id: id('educ'), category: 'other', name: 'Education Assistance', coverage: 'Review/seminar fees, reimbursed against receipts', monthlyValue: 1000, employeeShare: 0 })
    }
  })

  // One benefit that has ended, so cancelled records are represented too.
  const lapsed = active.find((e) => e.employment.employmentType !== 'regular') ?? active[active.length - 1]
  if (lapsed) {
    benefits.push({
      id: `${lapsed.id}_ben_lapsed`,
      companyId: lapsed.companyId,
      employeeId: lapsed.id,
      category: 'insurance',
      name: 'Accident Insurance (Probationary)',
      provider: 'Pru Life UK',
      coverage: 'Covered during probation only',
      monthlyValue: 150,
      employeeShare: 0,
      startDate: BENEFIT_START_FLOOR,
      endDate: '2026-03-31',
      status: 'cancelled',
    })
  }
  return benefits
}

/**
 * Sample deductions that aren't loans or government contributions: recurring company deductions (cooperative
 * savings, union dues, canteen plan) and one-time ones (uniform, ID replacement) dated inside the sample
 * payroll history, so finalized runs have already taken some and later ones are still scheduled.
 */
export function generateEmployeeDeductions(employees: Employee[]): EmployeeDeduction[] {
  const deductions: EmployeeDeduction[] = []
  const active = employees.filter((e) => e.employment.status === 'active')

  active.forEach((employee, index) => {
    const base = { companyId: employee.companyId, employeeId: employee.id, status: 'active' as const }
    const id = (key: string) => `${employee.id}_ded_${key}`
    const start = startFor(employee)

    if (index % 3 === 0) {
      deductions.push({ ...base, id: id('coop'), name: 'Cooperative Savings', kind: 'recurring', amount: 300, startDate: start, reason: 'Voluntary savings contribution to the employee cooperative.' })
    }
    if (index % 5 === 2) {
      deductions.push({ ...base, id: id('canteen'), name: 'Canteen/Meal Plan', kind: 'recurring', amount: 450, startDate: start, reason: 'Monthly canteen meal plan.' })
    }
    if (index % 7 === 3) {
      deductions.push({ ...base, id: id('union'), name: 'Union Dues', kind: 'recurring', amount: 150, startDate: start, reason: 'Monthly union membership dues.' })
    }

    // One-time deductions spread over the payroll history: ~7 weeks ago, ~3 weeks ago, and one still ahead.
    if (index % 6 === 1) {
      deductions.push({ ...base, id: id('uniform'), name: 'Uniform Cost', kind: 'one_time', amount: 800, startDate: daysFromToday(-52), dueDate: daysFromToday(-50), reason: 'Two company uniform sets.' })
    }
    if (index % 6 === 4) {
      deductions.push({ ...base, id: id('idfee'), name: 'ID Replacement Fee', kind: 'one_time', amount: 150, startDate: daysFromToday(-22), dueDate: daysFromToday(-20), reason: 'Lost company ID.' })
    }
    if (index % 9 === 5) {
      deductions.push({ ...base, id: id('equip'), name: 'Equipment Damage Charge', kind: 'one_time', amount: 1200, startDate: daysFromToday(0), dueDate: daysFromToday(10), reason: 'Damaged company headset, agreed to be deducted next cut-off.' })
    }
  })

  // A recurring deduction that was stopped early, so cancelled records are represented too.
  const stopped = active[2]
  if (stopped) {
    deductions.push({
      id: `${stopped.id}_ded_stopped`,
      companyId: stopped.companyId,
      employeeId: stopped.id,
      name: 'Parking Fee',
      kind: 'recurring',
      amount: 500,
      startDate: BENEFIT_START_FLOOR,
      endDate: '2026-06-30',
      status: 'cancelled',
      reason: 'Employee moved to a shuttle; fee stopped.',
    })
  }
  return deductions
}
