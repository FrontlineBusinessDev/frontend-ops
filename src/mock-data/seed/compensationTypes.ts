import type { CompensationType } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

const FRONTLINE_TYPES: CompensationType[] = [
  {
    id: 'comp_fl_monthly',
    companyId: 'co_frontline',
    name: 'Monthly Rate',
    kind: 'monthly_rate',
    config: { basicRate: 32000 },
    isActive: true,
  },
  {
    id: 'comp_fl_daily',
    companyId: 'co_frontline',
    name: 'Daily Rate',
    kind: 'daily_rate',
    config: { basicRate: 645 },
    isActive: true,
  },
  {
    id: 'comp_fl_hourly',
    companyId: 'co_frontline',
    name: 'Hourly Rate',
    kind: 'hourly_rate',
    config: { basicRate: 90 },
    isActive: true,
  },
  {
    id: 'comp_fl_output',
    companyId: 'co_frontline',
    name: 'Output-Based / Piece-Rate',
    kind: 'output_based',
    config: {
      outputRates: [
        { label: 'Product A', unit: 'unit', ratePerUnit: 10 },
        { label: 'Product B', unit: 'unit', ratePerUnit: 15 },
      ],
      outputMin: 50,
      outputMax: 400,
    },
    isActive: true,
  },
  {
    id: 'comp_fl_commission',
    companyId: 'co_frontline',
    name: 'Commission-Based',
    kind: 'commission_based',
    config: { commissionType: 'percentage', commissionValue: 5, commissionBasis: 'Net Sales' },
    isActive: true,
  },
  {
    id: 'comp_fl_mixed',
    companyId: 'co_frontline',
    name: 'Mixed Compensation',
    kind: 'mixed',
    config: { basicRate: 18000, mixedComponents: ['Base Salary', 'Output Incentive'] },
    isActive: true,
  },
]

const DEFAULT_TYPES_FOR = (companyId: string): CompensationType[] => [
  {
    id: `comp_${companyId}_monthly`,
    companyId,
    name: 'Monthly Rate',
    kind: 'monthly_rate',
    config: { basicRate: 28000 },
    isActive: true,
  },
  {
    id: `comp_${companyId}_daily`,
    companyId,
    name: 'Daily Rate',
    kind: 'daily_rate',
    config: { basicRate: 610 },
    isActive: true,
  },
]

export const compensationTypes: CompensationType[] = companies.flatMap((company) =>
  company.id === 'co_frontline' ? FRONTLINE_TYPES : DEFAULT_TYPES_FOR(company.id),
)
