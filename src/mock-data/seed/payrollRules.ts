import type { PayrollRules } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

export const payrollRules: PayrollRules[] = companies.map((company) => ({
  companyId: company.id,
  roundingDecimalPrecision: 2,
  roundingMethod: 'nearest',
  lateGracePeriodMinutes: 10,
  lateDeductionMethod: 'per_minute',
  latePerMinuteDeduction: 3.5,
  overtimePreApprovalRequired: true,
  overtimeDefaultMultiplier: 1.25,
  overtimeRestDayMultiplier: 1.3,
  overtimeHolidayMultiplier: 2.0,
  absenceDailyRateBasis: 'basic_pay_divided_by_working_days',
  absenceUnpaidHandling: 'deduct_daily_rate',
  prorationNewEmployee: true,
  prorationResignedEmployee: true,
  prorationMidPeriodChanges: true,
  adjustmentsRetroactiveAllowed: true,
  adjustmentsManualAllowed: true,
  adjustmentsApprovalRequired: true,
}))
