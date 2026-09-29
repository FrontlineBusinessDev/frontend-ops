import type { SssBracket, StatutoryConfig } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

/**
 * SSS contribution schedule effective January 2025 (Circular 2024-006): 15% of the Monthly Salary
 * Credit — 5% employee, 10% employer — on MSCs from ₱5,000 to ₱35,000 in ₱500 steps, plus the
 * employer-paid Employees' Compensation premium (₱10 below ₱15,000 MSC, ₱30 from ₱15,000).
 */
function buildSssBrackets(): SssBracket[] {
  const brackets: SssBracket[] = []
  for (let msc = 5000; msc <= 35000; msc += 500) {
    brackets.push({
      minSalary: msc === 5000 ? 0 : msc - 250,
      maxSalary: msc === 35000 ? null : msc + 250,
      msc,
      employeeShare: msc * 0.05,
      employerShare: msc * 0.1,
      ec: msc < 15000 ? 10 : 30,
    })
  }
  return brackets
}

const SSS_BRACKETS = buildSssBrackets()

export const statutoryConfigs: StatutoryConfig[] = companies.map((company) => ({
  companyId: company.id,
  sssBrackets: SSS_BRACKETS,
  // PhilHealth 2024–2025: 5% premium on basic salary, floor ₱10,000 / ceiling ₱100,000, split 50/50.
  philhealthRate: 0.05,
  philhealthEmployeeSharePercent: 0.5,
  philhealthEmployerSharePercent: 0.5,
  philhealthSalaryFloor: 10_000,
  philhealthSalaryCeiling: 100_000,
  // Pag-IBIG (HDMF Circular 460): 2% each on pay up to the ₱10,000 maximum fund salary (₱200 cap); employees earning ₱1,500 or less pay 1%.
  pagibigRate: 0.02,
  pagibigMaxFundSalary: 10_000,
  pagibigEmployeeAmount: 200,
  pagibigEmployerAmount: 200,
  // BIR withholding tax on compensation — TRAIN Law monthly table effective January 2023.
  taxBrackets: [
    { min: 0, max: 20833, rate: 0, baseTax: 0 },
    { min: 20833, max: 33333, rate: 0.15, baseTax: 0 },
    { min: 33333, max: 66667, rate: 0.2, baseTax: 1875 },
    { min: 66667, max: 166667, rate: 0.25, baseTax: 8541.8 },
    { min: 166667, max: 666667, rate: 0.3, baseTax: 33541.8 },
    { min: 666667, max: null, rate: 0.35, baseTax: 183541.8 },
  ],
}))
