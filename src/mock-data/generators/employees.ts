import type { Branch, CompensationHistoryEntry, Employee, EmployeeCategory, EmploymentStatus, PayRateType } from '@/types/domain'
import { OUTPUT_UNIT_OPTIONS } from '@/lib/payroll/payRate'

const FIRST_NAMES = [
  'Maria', 'Jose', 'Ana', 'Juan', 'Grace', 'Mark', 'Angel', 'Paolo', 'Rina', 'Carlo',
  'Bea', 'Miguel', 'Cristina', 'Ramon', 'Joy', 'Ferdinand', 'Liza', 'Noel', 'Charmaine', 'Dennis',
  'Ella', 'Victor', 'Kim', 'Arnel', 'Trisha', 'Bryan', 'Michelle', 'Oscar', 'Divine', 'Renz',
]

const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos',
  'Villanueva', 'Castillo', 'Aquino', 'Del Rosario', 'Gonzales', 'Salazar', 'Navarro', 'Domingo',
]

const DEPARTMENTS = ['Operations', 'Finance', 'Sales', 'HR', 'IT', 'Warehouse', 'Customer Support']
const POSITIONS = ['Associate', 'Senior Associate', 'Team Lead', 'Supervisor', 'Manager', 'Analyst']
/** Department is the primary signal for the employee's payroll category; contractual hires are always categorized as Contractor regardless of department. */
const DEPARTMENT_CATEGORY: Record<string, EmployeeCategory> = {
  Operations: 'regular',
  Finance: 'admin_staff',
  Sales: 'field_worker',
  HR: 'admin_staff',
  IT: 'admin_staff',
  Warehouse: 'production_worker',
  'Customer Support': 'field_worker',
}
const LEAVE_TYPES = ['Vacation Leave', 'Sick Leave', 'Emergency Leave']
const COMP_HISTORY_REASONS = ['Annual Merit Increase', 'Promotion', 'Adjustment', 'Probationary to Regular']
const COMP_APPROVERS = ['Andrea Villareal', 'Patrick Ong', 'Karen Sison']

function pick<T>(arr: T[], seed: number) {
  return arr[seed % arr.length]
}

function pad(n: number, width = 4) {
  return String(n).padStart(width, '0')
}

/** Deterministic salary-progression trail ending at `currentBasicPay`, so the Compensation History tab is never empty. */
function buildCompensationHistory(
  companyId: string,
  seed: number,
  hiredYear: number,
  hiredMonth: string,
  currentBasicPay: number,
) {
  const approver = pick(COMP_APPROVERS, seed)
  const hasMidRaise = seed % 3 !== 2
  // The last entry must always land exactly on the employee's actual current basic pay. The raise
  // is proportional (not a flat peso amount) so this stays sensible across every rate magnitude,
  // from a ₱15/unit piece rate to a ₱40,000/month salary.
  const raiseFraction = 0.08 + (seed % 4) * 0.03
  const initialSalary = hasMidRaise ? Math.round(currentBasicPay * (1 - raiseFraction) * 100) / 100 : currentBasicPay

  const entries: CompensationHistoryEntry[] = [
    {
      id: `${companyId}_comphist_${pad(seed)}_1`,
      effectiveDate: `${hiredYear}-${hiredMonth}-01`,
      type: 'Initial Hire',
      previousSalary: null,
      newSalary: initialSalary,
      approvedBy: approver,
    },
  ]

  if (hasMidRaise) {
    entries.push({
      id: `${companyId}_comphist_${pad(seed)}_2`,
      effectiveDate: `${hiredYear + 1}-01-01`,
      type: pick(COMP_HISTORY_REASONS, seed),
      previousSalary: initialSalary,
      newSalary: currentBasicPay,
      approvedBy: approver,
    })
  }

  return entries
}

export function generateEmployeesForCompany(companyId: string, companyBranches: Branch[], count: number): Employee[] {
  const employees: Employee[] = []

  for (let i = 0; i < count; i++) {
    const seed = i + 1
    const firstName = pick(FIRST_NAMES, seed * 7 + i)
    const lastName = pick(LAST_NAMES, seed * 13 + i)
    const branch = pick(companyBranches, seed)
    const department = pick(DEPARTMENTS, seed * 3)
    const position = pick(POSITIONS, seed * 5)
    const statusRoll = seed % 11
    const status: EmploymentStatus = statusRoll === 0 ? 'archived' : statusRoll === 1 ? 'inactive' : 'active'
    const hiredYear = 2019 + (seed % 6)
    const hiredMonth = String(1 + (seed % 12)).padStart(2, '0')
    const employmentType = seed % 8 === 0 ? 'contractual' : seed % 5 === 0 ? 'probationary' : 'regular'
    const category: EmployeeCategory = employmentType === 'contractual' ? 'contractor' : DEPARTMENT_CATEGORY[department] ?? 'regular'

    // Pay Rate Type is derived from category only to produce realistic, varied demo data —
    // administrators can freely set any Pay Rate Type for any employee via Edit Compensation.
    const { payType, basicPay, outputUnit } = ((): { payType: PayRateType; basicPay: number; outputUnit: string | null } => {
      switch (category) {
        case 'production_worker':
          return seed % 2 === 0
            ? { payType: 'output_based', basicPay: 15 + (seed % 20), outputUnit: OUTPUT_UNIT_OPTIONS[seed % OUTPUT_UNIT_OPTIONS.length] }
            : { payType: 'daily', basicPay: 610 + (seed % 6) * 15, outputUnit: null }
        case 'field_worker':
          return { payType: 'hourly', basicPay: 80 + (seed % 8) * 5, outputUnit: null }
        case 'contractor':
          return { payType: 'daily', basicPay: 650 + (seed % 6) * 20, outputUnit: null }
        case 'admin_staff':
        case 'regular':
        default:
          return seed % 6 === 0
            ? { payType: 'semi_monthly', basicPay: 9000 + (seed % 12) * 1250, outputUnit: null }
            : { payType: 'monthly', basicPay: 18000 + (seed % 12) * 2500, outputUnit: null }
      }
    })()

    employees.push({
      id: `${companyId}_emp_${pad(seed)}`,
      companyId,
      branchId: branch.id,
      employeeNumber: `${companyId.slice(3, 5).toUpperCase()}-${pad(seed)}`,
      personal: {
        firstName,
        lastName,
        birthDate: `${1985 + (seed % 15)}-${String(1 + (seed % 12)).padStart(2, '0')}-15`,
        civilStatus: seed % 3 === 0 ? 'married' : 'single',
        address: `${100 + seed} Rizal Street, ${branch.name.replace(/^.*–\s*/, '')}`,
        contactNumber: `09${pad(170000000 + seed, 9)}`,
        personalEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      },
      employment: {
        position,
        department,
        employmentType,
        dateHired: `${hiredYear}-${hiredMonth}-01`,
        status,
        category,
      },
      compensation: {
        basicPay,
        payType,
        outputUnit,
        allowances:
          seed % 4 === 0
            ? [{ label: 'Transportation Allowance', amount: 1500 }]
            : [{ label: 'Meal Allowance', amount: 1000 }],
      },
      benefits: {
        hmoPlan: seed % 3 === 0 ? undefined : 'HMO Plan B',
        leaveCreditsByType: {
          ...Object.fromEntries(LEAVE_TYPES.map((lt, idx) => [lt, 15 - idx * 5])),
          'Maternity/Paternity Leave': 7,
        },
      },
      government: {
        sssNo: `34-${pad(1000000 + seed, 7)}-1`,
        philhealthNo: `${pad(10000000000 + seed, 12)}`,
        pagibigNo: `${pad(100000000000 + seed, 12)}`,
        tinNo: `${pad(100000000 + seed, 9)}`,
      },
      bank: {
        bankName: seed % 2 === 0 ? 'BDO' : 'BPI',
        accountNumber: `${pad(1000000000 + seed, 10)}`,
      },
      documents: [
        { id: `${companyId}_doc_${pad(seed)}_1`, name: 'Government ID.pdf', uploadedAt: `${hiredYear}-${hiredMonth}-02`, fileType: 'pdf' },
      ],
      history: [
        {
          id: `${companyId}_hist_${pad(seed)}_1`,
          timestamp: `${hiredYear}-${hiredMonth}-01T09:00:00.000Z`,
          actor: 'System',
          action: 'Employee record created',
        },
        ...(status === 'archived'
          ? [
              {
                id: `${companyId}_hist_${pad(seed)}_2`,
                timestamp: '2026-01-15T09:00:00.000Z',
                actor: 'HR Admin',
                action: 'Employee archived',
              },
            ]
          : []),
      ],
      compensationHistory: buildCompensationHistory(companyId, seed, hiredYear, hiredMonth, basicPay),
    })
  }

  return employees
}
