import type { StatutoryConfig } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

export const statutoryConfigs: StatutoryConfig[] = companies.map((company) => ({
  companyId: company.id,
  sssEmployeeRate: 0.045,
  sssEmployerRate: 0.095,
  philhealthRate: 0.05,
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
