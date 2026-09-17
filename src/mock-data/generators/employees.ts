import type { Branch, Employee, EmploymentStatus } from '@/types/domain'

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
const LEAVE_TYPES = ['Vacation Leave', 'Sick Leave', 'Emergency Leave']

function pick<T>(arr: T[], seed: number) {
  return arr[seed % arr.length]
}

function pad(n: number, width = 4) {
  return String(n).padStart(width, '0')
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
        employmentType: seed % 8 === 0 ? 'contractual' : seed % 5 === 0 ? 'probationary' : 'regular',
        dateHired: `${hiredYear}-${hiredMonth}-01`,
        status,
      },
      compensation: {
        basicPay: 18000 + (seed % 12) * 2500,
        payType: 'monthly',
        allowances:
          seed % 4 === 0
            ? [{ label: 'Transportation Allowance', amount: 1500 }]
            : [{ label: 'Meal Allowance', amount: 1000 }],
      },
      benefits: {
        hmoPlan: seed % 3 === 0 ? undefined : 'HMO Plan B',
        leaveCreditsByType: Object.fromEntries(LEAVE_TYPES.map((lt, idx) => [lt, 15 - idx * 5])),
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
    })
  }

  return employees
}
