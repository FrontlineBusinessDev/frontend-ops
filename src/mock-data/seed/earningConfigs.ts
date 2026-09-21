import type { EarningConfig } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

const TEMPLATE: Omit<EarningConfig, 'id' | 'companyId'>[] = [
  { name: 'Basic Pay', category: 'Basic Pay', calcType: 'fixed', taxable: true, includedInPayroll: true, isActive: true },
  { name: 'Transportation Allowance', category: 'Allowance', calcType: 'fixed', taxable: false, includedInPayroll: true, isActive: true },
  { name: 'Meal Allowance', category: 'Allowance', calcType: 'fixed', taxable: false, includedInPayroll: true, isActive: true },
  { name: 'Overtime Pay', category: 'Overtime', calcType: 'variable', taxable: true, includedInPayroll: true, isActive: true },
  { name: 'Night Differential', category: 'Night Differential', calcType: 'variable', taxable: true, includedInPayroll: true, isActive: true },
  { name: '13th Month Pay', category: 'Bonus', calcType: 'fixed', taxable: false, includedInPayroll: true, isActive: true },
  { name: 'Performance Incentive', category: 'Bonus', calcType: 'variable', taxable: true, includedInPayroll: true, isActive: true },
  { name: 'Sales Commission', category: 'Commission', calcType: 'variable', taxable: true, includedInPayroll: true, isActive: true },
  { name: 'Output-Based Earnings', category: 'Output-Based Earnings', calcType: 'variable', taxable: true, includedInPayroll: true, isActive: true },
]

export const earningConfigs: EarningConfig[] = companies.flatMap((company) =>
  TEMPLATE.map((item, index) => ({
    id: `earn_${company.id}_${index}`,
    companyId: company.id,
    ...item,
  })),
)
