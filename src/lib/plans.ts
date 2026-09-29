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
  | 'approvals'
  | 'api_integrations'
  | 'customization'
  | 'dedicated_support'

export interface PlanDetails {
  label: string
  /** Who this plan is aimed at, shown on the tier comparison grid. */
  targetAudience: string
  /** Monthly base price in PHP, or null for Enterprise's custom pricing (see startingPricePhp). */
  monthlyPricePhp: number | null
  /** Enterprise only — the "from" price; the final quote depends on complexity. */
  startingPricePhp?: number
  /** Monthly add-on per employee above employeeLimit, or null when custom (Enterprise). */
  additionalEmployeePricePhp: number | null
  /** Employees included in the base price (null = 151+ / custom). */
  employeeLimit: number | null
  /** Admin/portal user seats. */
  userLimit: number | null
  /** Feature gates — what the app unlocks on this plan. */
  features: PlanFeature[]
  /** "All Basic features" — the tier this one builds on, shown first on the plan card. */
  includesTier?: PlanTier
  /** Plan-card checklist, in marketing order. */
  highlights: string[]
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

const PROFESSIONAL_FEATURES: PlanFeature[] = [...STANDARD_FEATURES, 'flexible_compensation', 'advanced_reports', 'approvals']

export const PLAN_DETAILS: Record<PlanTier, PlanDetails> = {
  basic: {
    label: 'Basic',
    targetAudience: 'Small Businesses',
    monthlyPricePhp: 1500,
    additionalEmployeePricePhp: 75,
    employeeLimit: 25,
    userLimit: 3,
    features: [],
    highlights: ['Employee records', 'Basic payroll', 'Statutory contributions', 'Payslips', 'Basic reports'],
  },
  standard: {
    label: 'Standard',
    targetAudience: 'Growing Businesses',
    monthlyPricePhp: 3000,
    additionalEmployeePricePhp: 70,
    employeeLimit: 75,
    userLimit: 8,
    features: STANDARD_FEATURES,
    includesTier: 'basic',
    highlights: ['Attendance, Leave, Overtime & Night Differential', 'Loans and Allowances', 'Employee Self-Service'],
  },
  professional: {
    label: 'Professional',
    targetAudience: 'Businesses with more complex payroll needs',
    monthlyPricePhp: 5000,
    additionalEmployeePricePhp: 65,
    employeeLimit: 150,
    userLimit: 15,
    features: PROFESSIONAL_FEATURES,
    includesTier: 'standard',
    highlights: ['Flexible compensation', 'Commission / Output-Based pay', 'Multiple payroll groups', 'Advanced reports', 'Approvals'],
  },
  enterprise: {
    label: 'Enterprise',
    targetAudience: 'Large organizations',
    monthlyPricePhp: null,
    startingPricePhp: 8000,
    additionalEmployeePricePhp: null,
    employeeLimit: null,
    userLimit: null,
    features: [...PROFESSIONAL_FEATURES, 'multi_branch', 'api_integrations', 'customization', 'dedicated_support'],
    includesTier: 'professional',
    highlights: ['Multi-branch', 'Integrations', 'Customization', 'API', 'Dedicated support'],
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
  approvals: 'Approvals',
  api_integrations: 'Integrations & API Access',
  customization: 'Customization Tools',
  dedicated_support: 'Dedicated Support Portal',
}

/** "₱8,000.00/month" for a priced plan, or "Custom Pricing" for Enterprise (monthlyPricePhp: null). */
export function formatPlanPrice(monthlyPricePhp: number | null): string {
  return monthlyPricePhp === null ? 'Custom Pricing' : `${formatCurrency(monthlyPricePhp)}/month`
}

/** Base price for a plan — "₱5,000.00/month", or Enterprise's "₱8,000.00+/month". */
export function formatPlanBasePrice(plan: PlanDetails): string {
  if (plan.monthlyPricePhp !== null) return `${formatCurrency(plan.monthlyPricePhp)}/month`
  return plan.startingPricePhp ? `${formatCurrency(plan.startingPricePhp)}+/month` : 'Custom Pricing'
}

/** "Up to 150 employees", or "151+ employees" for Enterprise. */
export function formatEmployeeLimit(tier: PlanTier): string {
  const limit = PLAN_DETAILS[tier].employeeLimit
  if (limit !== null) return `Up to ${limit} employees`
  const below = PLAN_ORDER.map((t) => PLAN_DETAILS[t].employeeLimit).filter((l): l is number => l !== null)
  return `${Math.max(...below) + 1}+ employees`
}

/** Estimated monthly bill: base price + add-on for each employee above the plan's limit (null for custom-priced plans). */
export function estimateMonthlyBill(tier: PlanTier, employeeCount: number): { base: number; extraEmployees: number; addOn: number; total: number } | null {
  const plan = PLAN_DETAILS[tier]
  if (plan.monthlyPricePhp === null || plan.employeeLimit === null || plan.additionalEmployeePricePhp === null) return null
  const extraEmployees = Math.max(0, employeeCount - plan.employeeLimit)
  const addOn = extraEmployees * plan.additionalEmployeePricePhp
  return { base: plan.monthlyPricePhp, extraEmployees, addOn, total: plan.monthlyPricePhp + addOn }
}

export function planHasFeature(tier: PlanTier, feature: PlanFeature): boolean {
  return PLAN_DETAILS[tier].features.includes(feature)
}

/** The lowest plan tier that includes this feature — used for "Available in X Plan" messaging. */
export function minimumPlanFor(feature: PlanFeature): PlanTier {
  return PLAN_ORDER.find((tier) => planHasFeature(tier, feature)) ?? 'enterprise'
}
