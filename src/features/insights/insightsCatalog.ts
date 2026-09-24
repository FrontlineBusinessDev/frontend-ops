import { BarChart3, Calculator, PiggyBank, TrendingUp, Users2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface InsightFeature {
  id: string
  title: string
  icon: LucideIcon
  /** Short line shown on the hub card. */
  description: string
  /** Longer explanation shown in the "Coming Soon" detail dialog. */
  overview: string
}

export const INSIGHT_FEATURES: InsightFeature[] = [
  {
    id: 'compensation-insights',
    title: 'Compensation Insights',
    icon: Users2,
    description: "Highlights employees paid below or above the average within their department's salary range.",
    overview:
      "Compensation Insights will scan every department's salary range and flag employees whose basic pay sits meaningfully below or above the department average — surfacing potential pay-equity gaps, retention risks, and outliers worth a compensation review, without you having to build the comparison manually.",
  },
  {
    id: 'salary-increase-simulator',
    title: 'Salary Increase Simulator',
    icon: TrendingUp,
    description: 'Generates calculations and projects the impact of proposed salary increases per department.',
    overview:
      'The Salary Increase Simulator will let you model a proposed percentage or fixed-amount raise for one or more departments and immediately project the resulting payroll cost impact, per-employee new pay rates, and the change to statutory contribution obligations — before any increase is committed.',
  },
  {
    id: 'payroll-cost-insights',
    title: 'Payroll Cost Insights',
    icon: PiggyBank,
    description: 'Analyzes the percentage increase in overall payroll costs and breaks down the driving factors behind the growth.',
    overview:
      'Payroll Cost Insights will track period-over-period changes in total payroll spend and break the growth down into its driving factors — headcount changes, overtime, bonuses, statutory contribution changes, and base pay adjustments — so cost increases are traceable to a cause, not just a number.',
  },
  {
    id: 'what-if-analysis',
    title: 'What-If Analysis',
    icon: BarChart3,
    description: 'Allows scenario testing for potential organizational changes, policy adjustments, and compensation restructuring.',
    overview:
      'What-If Analysis will provide a scenario sandbox for testing organizational changes — headcount growth or reduction, policy adjustments (like OT rate or holiday pay changes), and compensation restructuring — and previewing the projected financial and workforce impact of each scenario side by side, before anything is rolled out.',
  },
  {
    id: 'employee-cost-analysis',
    title: 'Employee Cost Analysis',
    icon: Calculator,
    description:
      'Calculates the full cost per employee—from gross income down to overtime and statutory benefits—and simulates the financial impact if an employee receives a salary increase.',
    overview:
      "Employee Cost Analysis will calculate each employee's fully-loaded cost to the company — gross income, overtime, allowances, and the employer's share of statutory benefits — and let you simulate how that total changes if the employee receives a proposed salary increase.",
  },
]
