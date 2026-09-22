import { create } from 'zustand'
import { formatCurrency } from '@/lib/utils/format'

export type MixedBaseType = 'monthly' | 'daily' | 'hourly'
export type MixedComponentType = 'commission_pct' | 'piece_rate' | 'allowance_per_day'

export interface MixedCompensationStructure {
  baseType: MixedBaseType
  baseAmount: number
  componentType: MixedComponentType
  rate: number
}

const BASE_UNIT_LONG: Record<MixedBaseType, string> = { monthly: 'mo', daily: 'day', hourly: 'hr' }
const BASE_UNIT_SHORT: Record<MixedBaseType, string> = { monthly: 'mo', daily: 'day', hourly: 'hr' }

/** "₱20,000" style, but abbreviated to "₱20k" for round thousands — keeps the Base Rate table column tight. */
function formatPesoShort(amount: number): string {
  if (amount >= 1000 && amount % 1000 === 0) return `₱${amount / 1000}k`
  return formatCurrency(amount)
}

/** Long, human-readable line for the sub-modal's live preview, e.g. "₱20,000.00 / mo Base + ₱25.00 / completed task". */
export function summarizeMixedCompensation(structure: MixedCompensationStructure): string {
  const basePart = `${formatCurrency(structure.baseAmount)} / ${BASE_UNIT_LONG[structure.baseType]} Base`
  const variablePart =
    structure.componentType === 'commission_pct'
      ? `${structure.rate}% Commission`
      : structure.componentType === 'piece_rate'
        ? `${formatCurrency(structure.rate)} / completed task`
        : `${formatCurrency(structure.rate)} / day Allowance`
  return `${basePart} + ${variablePart}`
}

/** Abbreviated form for the Employee Table's Base Rate column, e.g. "₱20k/mo + ₱25/task". */
export function summarizeMixedCompensationShort(structure: MixedCompensationStructure): string {
  const basePart = `${formatPesoShort(structure.baseAmount)}/${BASE_UNIT_SHORT[structure.baseType]}`
  const variablePart =
    structure.componentType === 'commission_pct'
      ? `${structure.rate}%`
      : structure.componentType === 'piece_rate'
        ? `${formatPesoShort(structure.rate)}/task`
        : `${formatPesoShort(structure.rate)}/day`
  return `${basePart} + ${variablePart}`
}

interface MixedCompensationState {
  structures: Record<string, MixedCompensationStructure>
  setStructure: (employeeId: string, structure: MixedCompensationStructure) => void
}

/**
 * "Mixed Compensation" isn't a real payroll pay-rate type (`PayRateType` stays exactly the 5
 * standard values the computation engine, reports, and payslips already handle) — this is a
 * display-only overlay for the Add Employee modal, keyed by employee id, in-memory only like the
 * rest of this app's mock data.
 */
export const useMixedCompensationStore = create<MixedCompensationState>((set, get) => ({
  structures: {},
  setStructure: (employeeId, structure) => {
    set({ structures: { ...get().structures, [employeeId]: structure } })
  },
}))

export function useMixedCompensation(employeeId: string): MixedCompensationStructure | undefined {
  return useMixedCompensationStore((s) => s.structures[employeeId])
}
