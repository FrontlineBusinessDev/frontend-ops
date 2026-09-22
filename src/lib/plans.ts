import { formatCurrency } from '@/lib/utils/format'
import type { PlanTier } from '@/types/domain'

export type PlanFeature =
  | 'attendance'
  | 'leave'
  | 'overtime_night_diff'
  | 'bonuses_incentives'
  | 'thirteenth_month'
  | 'loans_deductions'
  | 'ess'
  | 'multi_branch'
  | 'flexible_compensation'
  | 'advanced_reports'
  | 'api_integrations'
  | 'customization'
  | 'dedicated_support'

export interface PlanDetails {
  label: string
  /** Who this plan is aimed at, shown on the tier comparison grid. */
  targetAudience: string
  /** Monthly price in PHP, or null for Enterprise's custom/"Contact Sales" pricing. */
  monthlyPricePhp: number | null
  employeeLimit: number | null
  userLimit: number | null
  features: PlanFeature[]
}

export const PLAN_ORDER: PlanTier[] = ['basic', 'standard', 'professional', 'enterprise']

const STANDARD_FEATURES: PlanFeature[] = [
  'attendance',
  'leave',
  'overtime_night_diff',
  'bonuses_incentives',
  'thirteenth_month',
  'loans_deductions',
  'ess',
]

const PROFESSIONAL_FEATURES: PlanFeature[] = [...STANDARD_FEATURES, 'multi_branch', 'flexible_compensation', 'advanced_reports']

export const PLAN_DETAILS: Record<PlanTier, PlanDetails> = {
  basic: {
    label: 'Basic',
    targetAudience: 'Small Businesses',
    monthlyPricePhp: 1500,
    employeeLimit: 25,
    userLimit: 3,
    features: [],
  },
  standard: {
    label: 'Standard',
    targetAudience: 'Growing Businesses',
    monthlyPricePhp: 3000,
    employeeLimit: 75,
    userLimit: 8,
    features: STANDARD_FEATURES,
  },
  professional: {
    label: 'Professional',
    targetAudience: 'Businesses with more complex payroll needs',
    monthlyPricePhp: 5000,
    employeeLimit: 150,
    userLimit: 15,
    features: PROFESSIONAL_FEATURES,
  },
  enterprise: {
    label: 'Enterprise',
    targetAudience: 'Large organizations',
    monthlyPricePhp: null,
    employeeLimit: null,
    userLimit: null,
    features: [...PROFESSIONAL_FEATURES, 'api_integrations', 'customization', 'dedicated_support'],
  },
}

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  attendance: 'Attendance Tracking',
  leave: 'Leave Management',
  overtime_night_diff: 'Overtime & Night Differential',
  bonuses_incentives: 'Bonuses & Incentives',
  thirteenth_month: '13th Month Pay',
  loans_deductions: 'Loans & Deductions',
  ess: 'Employee Self-Service',
  multi_branch: 'Multi-Branch Management',
  flexible_compensation: 'Flexible Compensation & Multiple Payroll Groups',
  advanced_reports: 'Advanced Payroll Reports',
  api_integrations: 'Integrations & API Access',
  customization: 'Customization Tools',
  dedicated_support: 'Dedicated Support Portal',
}

/** "₱8,000.00/month" for a priced plan, or "Custom Pricing" for Enterprise (monthlyPricePhp: null). */
export function formatPlanPrice(monthlyPricePhp: number | null): string {
  return monthlyPricePhp === null ? 'Custom Pricing' : `${formatCurrency(monthlyPricePhp)}/month`
}

export function planHasFeature(tier: PlanTier, feature: PlanFeature): boolean {
  return PLAN_DETAILS[tier].features.includes(feature)
}

/** The lowest plan tier that includes this feature — used for "Available in X Plan" messaging. */
export function minimumPlanFor(feature: PlanFeature): PlanTier {
  return PLAN_ORDER.find((tier) => planHasFeature(tier, feature)) ?? 'enterprise'
}
