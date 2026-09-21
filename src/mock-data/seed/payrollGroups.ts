import type { PayrollGroup } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

/**
 * `employeeIds` start empty here — seed files load before the employee
 * generator runs, so `@/mock-data/index.ts` distributes real employee ids
 * into these groups right after it builds `employees` (see `assignEmployeesToPayrollGroups`).
 */
const FRONTLINE_GROUPS: PayrollGroup[] = [
  {
    id: 'pg_fl_monthly_admin',
    companyId: 'co_frontline',
    name: 'Monthly Admin Payroll',
    description: 'Admin staff and back-office roles paid once a month.',
    status: 'active',
    frequency: 'monthly',
    cutoffSchedule: '1st – End of Month',
    payDates: 'Last working day of the month',
    compensationTypeId: 'comp_fl_monthly',
    workScheduleId: 'co_frontline_sched_default',
    effectiveDate: '2024-01-01',
    employeeIds: [],
  },
  {
    id: 'pg_fl_semi_monthly_regular',
    companyId: 'co_frontline',
    name: 'Semi-Monthly Regular Payroll',
    description: 'Regular rank-and-file employees paid twice a month.',
    status: 'active',
    frequency: 'semi_monthly',
    cutoffSchedule: 'Period 1: 1st – 15th · Period 2: 16th – End of Month',
    payDates: '15th & 30th',
    compensationTypeId: 'comp_fl_monthly',
    workScheduleId: 'co_frontline_sched_default',
    effectiveDate: '2024-01-01',
    employeeIds: [],
  },
  {
    id: 'pg_fl_weekly_production',
    companyId: 'co_frontline',
    name: 'Weekly Production Payroll',
    description: 'Output-based production workers paid weekly.',
    status: 'active',
    frequency: 'weekly',
    cutoffSchedule: 'Monday – Sunday',
    payDates: 'Following Friday',
    compensationTypeId: 'comp_fl_output',
    effectiveDate: '2024-02-01',
    employeeIds: [],
  },
  {
    id: 'pg_fl_weekly_daily',
    companyId: 'co_frontline',
    name: 'Weekly Daily Workers',
    description: 'Daily-wage field and contractual workers paid weekly.',
    status: 'active',
    frequency: 'weekly',
    cutoffSchedule: 'Monday – Sunday',
    payDates: 'Following Friday',
    compensationTypeId: 'comp_fl_daily',
    effectiveDate: '2024-02-01',
    employeeIds: [],
  },
]

const DEFAULT_GROUP_FOR = (companyId: string): PayrollGroup[] => [
  {
    id: `pg_${companyId}_semi_monthly`,
    companyId,
    name: 'Semi-Monthly Regular Payroll',
    description: 'Default payroll group for regular employees.',
    status: 'active',
    frequency: 'semi_monthly',
    cutoffSchedule: 'Period 1: 1st – 15th · Period 2: 16th – End of Month',
    payDates: '15th & 30th',
    compensationTypeId: `comp_${companyId}_monthly`,
    workScheduleId: `${companyId}_sched_default`,
    effectiveDate: '2024-01-01',
    employeeIds: [],
  },
]

export const payrollGroups: PayrollGroup[] = companies.flatMap((company) =>
  company.id === 'co_frontline' ? FRONTLINE_GROUPS : DEFAULT_GROUP_FOR(company.id),
)
