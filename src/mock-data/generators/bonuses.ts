import type { BonusIncentive, Employee } from '@/types/domain'

/** Two illustrative, pre-populated bonus entries per company — demonstrates the module's list/approval UI out of the box. Neither targets a real payroll period, so neither is picked up by `computeLine` until an admin edits/recreates one against an actual cutoff. */
export function generateBonuses(employees: Employee[]): BonusIncentive[] {
  const companyIds = [...new Set(employees.map((e) => e.companyId))]
  const now = new Date().toISOString()

  return companyIds.flatMap((companyId) => [
    {
      id: `${companyId}_bonus_christmas`,
      companyId,
      name: 'Christmas Bonus',
      bonusType: 'fixed_amount',
      targetType: 'company',
      amount: 5000,
      periodLabel: 'December 2026',
      taxable: false,
      frequency: 'one_time',
      notes: 'Company-wide year-end bonus for every active employee.',
      status: 'pending',
      createdAt: now,
    },
    {
      id: `${companyId}_bonus_q3sales`,
      companyId,
      name: 'Q3 Sales Incentive',
      bonusType: 'performance_based',
      targetType: 'department',
      targetDepartment: 'Sales',
      amount: 3000,
      periodLabel: 'September 2026',
      taxable: true,
      frequency: 'one_time',
      notes: 'Performance incentive for the Sales department after hitting Q3 targets.',
      status: 'approved',
      createdAt: now,
      decidedBy: 'System Seed',
      decidedAt: now,
    },
  ])
}
