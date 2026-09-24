import {
  Building2,
  CalendarClock,
  CalendarDays,
  Clock,
  CreditCard,
  Gauge,
  Gift,
  Landmark,
  LayoutDashboard,
  LineChart,
  Moon,
  PartyPopper,
  Plug,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Capability } from '@/lib/rbac/permissions'
import type { PlanFeature } from '@/lib/plans'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  capability?: Capability
  /** Subscription-plan feature this module requires — if the active plan tier (real or Demo
   * Portal preview) doesn't include it, the Sidebar renders this item locked instead of hiding it. */
  feature?: PlanFeature
  /** Only highlight this item when its path matches exactly, not as a prefix — for items (like
   * an `/ess` "My Dashboard") whose path is itself a prefix of sibling nav items' paths, so it
   * doesn't stay lit up while viewing one of those other pages. */
  exactMatch?: boolean
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export const ADMIN_NAV: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, capability: 'dashboard.view' }],
  },
  {
    label: 'Workforce',
    items: [
      { label: 'Employees', path: '/employees', icon: Users, capability: 'employees.view' },
      { label: 'Attendance', path: '/attendance', icon: Clock, capability: 'attendance.view', feature: 'attendance' },
      { label: 'Leave', path: '/leave', icon: CalendarDays, capability: 'leave.view', feature: 'leave' },
      {
        label: 'Overtime & Night Differential',
        path: '/overtime',
        icon: Moon,
        capability: 'overtime.view',
        feature: 'overtime_night_diff',
      },
      { label: 'Loans & Deductions', path: '/loans-deductions', icon: CreditCard, capability: 'loans.view', feature: 'loans_deductions' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { label: 'Payroll Runs', path: '/payroll', icon: Wallet, capability: 'payroll.view' },
      { label: 'Bonuses & Incentives', path: '/bonuses', icon: Gift, capability: 'bonuses.view', feature: 'bonuses_incentives' },
      {
        label: '13th Month Pay',
        path: '/thirteenth-month-pay',
        icon: PartyPopper,
        capability: 'thirteenth_month.view',
        feature: 'thirteenth_month',
      },
      { label: 'Statutory Contributions', path: '/statutory', icon: Landmark, capability: 'statutory.view' },
      { label: 'Payslips', path: '/payslips', icon: ReceiptText, capability: 'payslips.view' },
    ],
  },
  {
    label: 'Analytics and Reports',
    items: [
      { label: 'Reports', path: '/reports', icon: LineChart, capability: 'reports.view' },
      { label: 'Insights & Decision Making Support', path: '/insights', icon: Sparkles, capability: 'insights.view' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Company & Payroll Settings', path: '/company-settings', icon: Settings, capability: 'settings.company.edit' },
      { label: 'Branches', path: '/branches', icon: Building2, capability: 'branches.manage', feature: 'multi_branch' },
      { label: 'Users & Access', path: '/user-access', icon: ShieldCheck, capability: 'users.manage' },
      { label: 'Onboarding', path: '/onboarding', icon: CalendarClock, capability: 'onboarding.manage' },
      { label: 'Subscription & Plan', path: '/subscription', icon: Gauge, capability: 'subscription.manage' },
      { label: 'Integrations & API', path: '/integrations', icon: Plug, capability: 'integrations.manage' },
    ],
  },
]

export const MANAGER_NAV: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'My Team',
    items: [
      { label: 'Attendance', path: '/attendance', icon: Clock },
      { label: 'Overtime & Night Differential', path: '/overtime', icon: Moon },
      { label: 'Leave', path: '/leave', icon: CalendarDays },
    ],
  },
  {
    label: 'Analytics and Reports',
    items: [{ label: 'Reports', path: '/reports', icon: LineChart }],
  },
  {
    label: 'My Info',
    items: [{ label: 'My Profile', path: '/ess', icon: UserCircle, exactMatch: true }],
  },
]

export const EMPLOYEE_NAV: NavGroup[] = [
  {
    items: [{ label: 'My Dashboard', path: '/ess', icon: LayoutDashboard, exactMatch: true }],
  },
  {
    label: 'Self-Service',
    items: [
      { label: 'My Profile', path: '/ess/profile', icon: UserCircle },
      { label: 'My Payslips', path: '/ess/payslips', icon: ReceiptText },
      { label: 'My Attendance', path: '/ess/attendance', icon: Clock },
      { label: 'My OT & Night Diff', path: '/ess/overtime', icon: Timer },
      { label: 'My Leave', path: '/ess/leave', icon: CalendarDays },
      { label: 'My Loans & Deductions', path: '/ess/loans', icon: CreditCard },
    ],
  },
]

export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    items: [{ label: 'Companies', path: '/platform/companies', icon: Building2 }],
  },
]
