import { create } from 'zustand'

export interface OtRateType {
  id: string
  label: string
  /** Stored as a decimal multiplier, e.g. 1.25 for a 125% rate. */
  multiplier: number
  isCustom: boolean
}

export interface HolidayRateType {
  id: string
  label: string
  multiplier: number
}

/**
 * The three ids below are shared with the real payroll engine's `OvertimeType` (see
 * `src/types/domain.ts` and `src/lib/services/overtimeService.ts`) — editing their multiplier here
 * changes what the admin Overtime module actually pays out. `ot_night_diff` and any custom rate
 * types have no equivalent `OvertimeType`, so they stay UI/ESS-only (see `otApplicationStore.ts`).
 */
export const DEFAULT_OT_RATES: OtRateType[] = [
  { id: 'regular', label: 'Regular Workday Overtime', multiplier: 1.25, isCustom: false },
  { id: 'rest_day_holiday', label: 'Rest Day Overtime', multiplier: 1.69, isCustom: false },
  { id: 'night_diff', label: 'Night Differential Rate', multiplier: 1.1, isCustom: false },
  { id: 'ot_night_diff', label: 'Overtime during Night Differential', multiplier: 1.375, isCustom: false },
]

export const DEFAULT_HOLIDAY_RATES: HolidayRateType[] = [
  { id: 'regular_holiday_worked', label: 'Regular Holiday Worked', multiplier: 2 },
  { id: 'regular_holiday_unworked', label: 'Regular Holiday Unworked', multiplier: 1 },
  { id: 'regular_holiday_rest_day_worked', label: 'Regular Holiday + Rest Day Worked', multiplier: 2.6 },
  { id: 'special_holiday_worked', label: 'Special Non-Working Holiday Worked', multiplier: 1.3 },
  { id: 'special_holiday_rest_day_worked', label: 'Special Non-Working Holiday + Rest Day Worked', multiplier: 1.5 },
  { id: 'double_holiday_worked', label: 'Double Holiday Worked', multiplier: 3 },
]

export function formatMultiplierPct(multiplier: number): string {
  const pct = multiplier * 100
  return `${Number.isInteger(pct) ? pct : Math.round(pct * 10) / 10}%`
}

export function otRateOptionLabel(rate: OtRateType): string {
  return `${rate.label} (${formatMultiplierPct(rate.multiplier)})`
}

interface PayrollRatesState {
  otRates: OtRateType[]
  holidayRates: HolidayRateType[]
  updateOtRate: (id: string, patch: Partial<Pick<OtRateType, 'label' | 'multiplier'>>) => void
  addCustomOtRate: (label: string, multiplier: number) => void
  removeCustomOtRate: (id: string) => void
  updateHolidayRate: (id: string, multiplier: number) => void
  resetToDefaults: () => void
}

/**
 * Single source of truth for OT/Night-Diff and Holiday Pay rate multipliers, edited from Company &
 * Payroll Settings > Payroll Rules > Overtime & Holiday Rates and consumed live by the Overtime /
 * Night Differential application modals (both Admin and ESS). In-memory only, like the rest of this
 * app's mock data — resets on a full page reload.
 */
export const usePayrollRatesStore = create<PayrollRatesState>((set, get) => ({
  otRates: DEFAULT_OT_RATES,
  holidayRates: DEFAULT_HOLIDAY_RATES,
  updateOtRate: (id, patch) => {
    set({ otRates: get().otRates.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  },
  addCustomOtRate: (label, multiplier) => {
    const rate: OtRateType = { id: `custom_${crypto.randomUUID()}`, label, multiplier, isCustom: true }
    set({ otRates: [...get().otRates, rate] })
  },
  removeCustomOtRate: (id) => {
    set({ otRates: get().otRates.filter((r) => r.id !== id || !r.isCustom) })
  },
  updateHolidayRate: (id, multiplier) => {
    set({ holidayRates: get().holidayRates.map((r) => (r.id === id ? { ...r, multiplier } : r)) })
  },
  resetToDefaults: () => set({ otRates: DEFAULT_OT_RATES, holidayRates: DEFAULT_HOLIDAY_RATES }),
}))

export function getOtRateById(id: string): OtRateType | undefined {
  return usePayrollRatesStore.getState().otRates.find((r) => r.id === id)
}
