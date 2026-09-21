import type { DeductionConfig } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

/**
 * `allocationMethod` etc. are configuration placeholders (Payroll Settings → Deductions). The
 * payroll engine itself always computes SSS/PhilHealth/Pag-IBIG/Tax/Loans as an equal semi-monthly
 * split — those categories are seeded as 'equal_split' to match reality. The 'other' category
 * entries below are illustrative only (no per-employee amount is computed for them yet), so they
 * demonstrate all three allocation methods for the computation breakdown preview.
 */
const TEMPLATE: Omit<DeductionConfig, 'id' | 'companyId'>[] = [
  { name: 'SSS Contribution', category: 'government', calcType: 'variable', recurrence: 'recurring', isActive: true, allocationMethod: 'equal_split' },
  { name: 'PhilHealth Contribution', category: 'government', calcType: 'variable', recurrence: 'recurring', isActive: true, allocationMethod: 'equal_split' },
  { name: 'Pag-IBIG Contribution', category: 'government', calcType: 'fixed', recurrence: 'recurring', isActive: true, allocationMethod: 'equal_split' },
  { name: 'Withholding Tax', category: 'tax', calcType: 'variable', recurrence: 'recurring', isActive: true, allocationMethod: 'equal_split' },
  { name: 'SSS Salary Loan', category: 'loan', calcType: 'fixed', recurrence: 'recurring', isActive: true, allocationMethod: 'equal_split' },
  { name: 'Pag-IBIG Loan', category: 'loan', calcType: 'fixed', recurrence: 'recurring', isActive: true, allocationMethod: 'equal_split' },
  { name: 'Company Loan', category: 'loan', calcType: 'fixed', recurrence: 'recurring', isActive: true, allocationMethod: 'equal_split' },
  { name: 'Emergency Loan', category: 'loan', calcType: 'fixed', recurrence: 'recurring', isActive: false, allocationMethod: 'equal_split' },
  { name: 'Uniform Deduction', category: 'other', calcType: 'fixed', recurrence: 'one_time', isActive: true },
  { name: 'Union Dues', category: 'other', calcType: 'fixed', recurrence: 'recurring', isActive: false, allocationMethod: 'specific_cutoff', specificCutoffPeriod: 2 },
  { name: 'Late/Undertime Adjustment', category: 'other', calcType: 'variable', recurrence: 'recurring', isActive: true, allocationMethod: 'equal_split' },
  { name: 'Canteen/Meal Plan Deduction', category: 'other', calcType: 'fixed', recurrence: 'recurring', isActive: true, allocationMethod: 'specific_cutoff', specificCutoffPeriod: 2 },
  { name: 'Cooperative Savings', category: 'other', calcType: 'fixed', recurrence: 'recurring', isActive: true, allocationMethod: 'custom', customSplitPercentages: [40, 60] },
]

export const deductionConfigs: DeductionConfig[] = companies.flatMap((company) =>
  TEMPLATE.map((item, index) => ({
    id: `deduct_${company.id}_${index}`,
    companyId: company.id,
    ...item,
  })),
)
