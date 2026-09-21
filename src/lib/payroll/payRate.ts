import { formatCurrency } from '@/lib/utils/format'
import type { PayRateType } from '@/types/domain'

export const PAY_RATE_TYPE_OPTIONS: { value: PayRateType; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'semi_monthly', label: 'Semi-Monthly' },
  { value: 'daily', label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'output_based', label: 'Output-Based / Piece-Rate' },
]

export const PAY_RATE_TYPE_LABEL: Record<PayRateType, string> = {
  monthly: 'Monthly',
  semi_monthly: 'Semi-Monthly',
  daily: 'Daily',
  hourly: 'Hourly',
  output_based: 'Output-Based / Piece-Rate',
}

export const OUTPUT_UNIT_OPTIONS = ['Per Unit', 'Per Piece', 'Per Product', 'Per Task', 'Per Output']

const RATE_FIELD_LABEL: Record<PayRateType, string> = {
  monthly: 'Base Rate',
  semi_monthly: 'Base Rate',
  daily: 'Daily Rate',
  hourly: 'Hourly Rate',
  output_based: 'Piece Rate',
}

const HELPER_TEXT: Record<PayRateType, string> = {
  monthly: 'Fixed monthly base compensation.',
  semi_monthly: 'Base compensation provided per semi-monthly payroll period.',
  daily: 'Base compensation earned for each paid workday.',
  hourly: 'Base compensation earned for each paid hour.',
  output_based: 'Base compensation earned based on recorded output or completed units.',
}

const UNIT_SUFFIX: Record<PayRateType, string> = {
  monthly: 'month',
  semi_monthly: 'semi-month',
  daily: 'day',
  hourly: 'hour',
  output_based: 'unit',
}

const UNIT_SUFFIX_SHORT: Record<PayRateType, string> = {
  monthly: 'mo',
  semi_monthly: 'semi-month',
  daily: 'day',
  hourly: 'hr',
  output_based: 'unit',
}

export function rateFieldLabel(payType: PayRateType): string {
  return RATE_FIELD_LABEL[payType]
}

export function helperTextFor(payType: PayRateType): string {
  return HELPER_TEXT[payType]
}

function outputUnitWord(outputUnit: string | null | undefined): string {
  return (outputUnit ?? 'Per Unit').replace(/^per\s+/i, '').toLowerCase()
}

/** e.g. "₱25,000.00 / month" or, for output-based with a configured unit, "₱25.00 / piece". */
export function formatBaseRate(payType: PayRateType, amount: number, outputUnit?: string | null): string {
  const suffix = payType === 'output_based' ? outputUnitWord(outputUnit) : UNIT_SUFFIX[payType]
  return `${formatCurrency(amount)} / ${suffix}`
}

/** Abbreviated form for tight table cells, e.g. "₱25,000.00/mo", "₱600.00/day". */
export function formatBaseRateShort(payType: PayRateType, amount: number, outputUnit?: string | null): string {
  const suffix = payType === 'output_based' ? outputUnitWord(outputUnit) : UNIT_SUFFIX_SHORT[payType]
  return `${formatCurrency(amount)}/${suffix}`
}

export interface EstimatedEquivalent {
  label: string
  value: number
}

/**
 * Informational only — never fed back into actual payroll calculation. Returns null for
 * output-based rates, since there's no reliable expected-output baseline to convert from.
 */
export function estimatedEquivalentFor(payType: PayRateType, amount: number): EstimatedEquivalent | null {
  const daysPerMonth = 261 / 12
  switch (payType) {
    case 'daily':
      return { label: 'Estimated monthly equivalent', value: amount * daysPerMonth }
    case 'hourly':
      return { label: 'Estimated daily equivalent', value: amount * 8 }
    case 'monthly':
      return { label: 'Estimated daily equivalent', value: amount / daysPerMonth }
    case 'semi_monthly':
      return { label: 'Estimated monthly equivalent', value: amount * 2 }
    case 'output_based':
      return null
  }
}
