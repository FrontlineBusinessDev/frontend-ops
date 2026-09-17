import type { PlanTier } from '@/types/domain'

export type PlanFeature = 'multi_branch' | 'loans_deductions' | 'advanced_reports' | 'api_integrations'

export interface PlanDetails {
  label: string
  monthlyPricePhp: number
  employeeLimit: number | null
  userLimit: number | null
  features: PlanFeature[]
}

export const PLAN_ORDER: PlanTier[] = ['starter', 'growth', 'professional']

export const PLAN_DETAILS: Record<PlanTier, PlanDetails> = {
  starter: {
    label: 'Starter',
    monthlyPricePhp: 1999,
    employeeLimit: 15,
    userLimit: 3,
    features: [],
  },
  growth: {
    label: 'Growth',
    monthlyPricePhp: 4999,
    employeeLimit: 50,
    userLimit: 10,
    features: ['multi_branch', 'loans_deductions'],
  },
  professional: {
    label: 'Professional',
    monthlyPricePhp: 9999,
    employeeLimit: null,
    userLimit: null,
    features: ['multi_branch', 'loans_deductions', 'advanced_reports', 'api_integrations'],
  },
}

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  multi_branch: 'Multi-Branch Management',
  loans_deductions: 'Loans & Deductions',
  advanced_reports: 'Advanced Payroll Reports',
  api_integrations: 'Integrations & API Access',
}

export function planHasFeature(tier: PlanTier, feature: PlanFeature): boolean {
  return PLAN_DETAILS[tier].features.includes(feature)
}

/** The lowest plan tier that includes this feature — used for "Available in X Plan" messaging. */
export function minimumPlanFor(feature: PlanFeature): PlanTier {
  return PLAN_ORDER.find((tier) => planHasFeature(tier, feature)) ?? 'professional'
}
