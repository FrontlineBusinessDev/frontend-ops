import type { DeductionSchedule, PayrollFrequency } from '@/types/domain'

/**
 * "Deduction Application Schedule" — when a group's monthly statutory and recurring deductions
 * (SSS, PhilHealth, Pag-IBIG, withholding tax, loans) are applied across the month's pay runs.
 * The valid options depend on the pay frequency.
 */
export interface DeductionScheduleOption {
  value: DeductionSchedule
  label: string
  description: string
}

const SEMI_MONTHLY: DeductionScheduleOption[] = [
  { value: 'DIVIDED', label: 'Divided Equally (50% Period 1 / 50% Period 2)', description: 'Half of each monthly deduction is taken on each of the two pay runs.' },
  { value: 'FIRST_PERIOD', label: '1st Pay Period Only', description: 'The full monthly deductions are taken on the 1st – 15th pay run.' },
  { value: 'LAST_PERIOD', label: '2nd / Last Pay Period Only', description: 'The full monthly deductions are taken on the 16th – end of month pay run.' },
  { value: 'CUSTOM_SPLIT', label: 'Custom Split', description: 'Statutory contributions on the 1st pay run; loans and voluntary deductions on the 2nd.' },
]

const MONTHLY: DeductionScheduleOption[] = [
  { value: 'FULL_MONTHLY', label: 'Full Amount on Monthly Pay Date', description: 'The full monthly deductions are taken on the single monthly pay run.' },
]

const PERIODIC: DeductionScheduleOption[] = [
  { value: 'DIVIDED', label: 'Divided Equally Across All Pay Periods', description: "Each monthly deduction is split evenly across the month's pay runs." },
  { value: 'FIRST_PERIOD', label: 'First Pay Period of the Month', description: 'The full monthly deductions are taken on the first pay run of the month.' },
  { value: 'LAST_PERIOD', label: 'Last Pay Period of the Month', description: 'The full monthly deductions are taken on the last pay run of the month.' },
  { value: 'SECOND_AND_LAST_PERIOD', label: '2nd & Last Pay Periods', description: 'Monthly deductions are split 50/50 between the 2nd and the last pay runs of the month.' },
]

/** Daily and custom groups get the generic options without the weekly-specific 2nd & Last split. */
const OTHER: DeductionScheduleOption[] = PERIODIC.filter((o) => o.value !== 'SECOND_AND_LAST_PERIOD')

export const DEDUCTION_SCHEDULE_HELP = 'Determines how statutory and recurring deductions are split across pay runs in a month.'

/** Frequencies with a configurable company default (monthly has a single fixed option). */
export const CONFIGURABLE_FREQUENCIES: { value: PayrollFrequency; label: string }[] = [
  { value: 'semi_monthly', label: 'Semi-monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
]

export function deductionScheduleOptions(frequency: PayrollFrequency): DeductionScheduleOption[] {
  if (frequency === 'monthly') return MONTHLY
  if (frequency === 'semi_monthly') return SEMI_MONTHLY
  if (frequency === 'weekly' || frequency === 'biweekly') return PERIODIC
  return OTHER
}

/**
 * The schedule that applies for a frequency: the given value when it's valid for that frequency,
 * else the company default for it, else the first option (Divided / Full Amount).
 */
export function resolveDeductionSchedule(
  frequency: PayrollFrequency,
  value?: DeductionSchedule,
  companyDefaults?: Partial<Record<PayrollFrequency, DeductionSchedule>>,
): DeductionSchedule {
  const options = deductionScheduleOptions(frequency)
  const valid = (v?: DeductionSchedule) => (v && options.some((o) => o.value === v) ? v : undefined)
  return valid(value) ?? valid(companyDefaults?.[frequency]) ?? options[0].value
}

export function deductionScheduleOption(frequency: PayrollFrequency, value?: DeductionSchedule): DeductionScheduleOption {
  const resolved = resolveDeductionSchedule(frequency, value)
  return deductionScheduleOptions(frequency).find((o) => o.value === resolved)!
}
