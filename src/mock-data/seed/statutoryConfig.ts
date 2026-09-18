import type { SssBracket, StatutoryConfig } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

const SSS_BRACKETS: SssBracket[] = [
  { minSalary: 0, maxSalary: 4250, msc: 4000, employeeShare: 180, employerShare: 380 },
  { minSalary: 4250, maxSalary: 4750, msc: 4500, employeeShare: 202.5, employerShare: 427.5 },
  { minSalary: 4750, maxSalary: 5250, msc: 5000, employeeShare: 225, employerShare: 475 },
  { minSalary: 5250, maxSalary: 6250, msc: 5750, employeeShare: 258.75, employerShare: 546.25 },
  { minSalary: 6250, maxSalary: 7250, msc: 6750, employeeShare: 303.75, employerShare: 641.25 },
  { minSalary: 7250, maxSalary: 8250, msc: 7750, employeeShare: 348.75, employerShare: 736.25 },
  { minSalary: 8250, maxSalary: 9250, msc: 8750, employeeShare: 393.75, employerShare: 831.25 },
  { minSalary: 9250, maxSalary: 10250, msc: 9750, employeeShare: 438.75, employerShare: 926.25 },
  { minSalary: 10250, maxSalary: 11250, msc: 10750, employeeShare: 483.75, employerShare: 1021.25 },
  { minSalary: 11250, maxSalary: 12750, msc: 12000, employeeShare: 540, employerShare: 1140 },
  { minSalary: 12750, maxSalary: 14750, msc: 13750, employeeShare: 618.75, employerShare: 1306.25 },
  { minSalary: 14750, maxSalary: 16750, msc: 15750, employeeShare: 708.75, employerShare: 1496.25 },
  { minSalary: 16750, maxSalary: 18750, msc: 17750, employeeShare: 798.75, employerShare: 1686.25 },
  { minSalary: 18750, maxSalary: 20250, msc: 19750, employeeShare: 888.75, employerShare: 1876.25 },
  { minSalary: 20250, maxSalary: null, msc: 20000, employeeShare: 900, employerShare: 1900 },
]

export const statutoryConfigs: StatutoryConfig[] = companies.map((company) => ({
  companyId: company.id,
  sssBrackets: SSS_BRACKETS,
  philhealthRate: 0.05,
  philhealthEmployeeSharePercent: 0.5,
  philhealthEmployerSharePercent: 0.5,
  pagibigEmployeeAmount: 200,
  pagibigEmployerAmount: 200,
  taxBrackets: [
    { min: 0, max: 20833, rate: 0, baseTax: 0 },
    { min: 20833, max: 33333, rate: 0.15, baseTax: 0 },
    { min: 33333, max: 66667, rate: 0.2, baseTax: 1875 },
    { min: 66667, max: 166667, rate: 0.25, baseTax: 8541.8 },
    { min: 166667, max: 666667, rate: 0.3, baseTax: 33541.8 },
    { min: 666667, max: null, rate: 0.35, baseTax: 183541.8 },
  ],
}))
