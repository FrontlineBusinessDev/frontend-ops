import {
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  Clock,
  CreditCard,
  Gauge,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Plug,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Capability } from '@/lib/rbac/permissions'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  capability?: Capability
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
      { label: 'Attendance', path: '/attendance', icon: Clock, capability: 'attendance.view' },
      { label: 'Leave', path: '/leave', icon: CalendarDays, capability: 'leave.view' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { label: 'Payroll Runs', path: '/payroll', icon: Wallet, capability: 'payroll.view' },
      { label: 'Statutory Contributions', path: '/statutory', icon: Landmark, capability: 'statutory.view' },
      { label: 'Payslips', path: '/payslips', icon: ReceiptText, capability: 'payslips.view' },
      { label: 'Loans & Deductions', path: '/loans-deductions', icon: CreditCard, capability: 'loans.view' },
    ],
  },
  {
    items: [
      { label: 'Approvals', path: '/approvals', icon: ListChecks, capability: 'approvals.view' },
      { label: 'Reports', path: '/reports', icon: LineChart, capability: 'reports.view' },
      { label: 'Notifications', path: '/notifications', icon: Bell, capability: 'notifications.view' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Company & Payroll Settings', path: '/company-settings', icon: Settings, capability: 'settings.company.edit' },
      { label: 'Branches', path: '/branches', icon: Building2, capability: 'branches.manage' },
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
      { label: 'Leave', path: '/leave', icon: CalendarDays },
      { label: 'Approvals', path: '/approvals', icon: ListChecks },
    ],
  },
  {
    items: [
      { label: 'Reports', path: '/reports', icon: LineChart },
      { label: 'Notifications', path: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'My Info',
    items: [{ label: 'My Profile', path: '/ess', icon: UserCircle }],
  },
]

export const EMPLOYEE_NAV: NavGroup[] = [
  {
    items: [{ label: 'My Dashboard', path: '/ess', icon: LayoutDashboard }],
  },
  {
    label: 'Self-Service',
    items: [
      { label: 'My Profile', path: '/ess/profile', icon: UserCircle },
      { label: 'My Payslips', path: '/ess/payslips', icon: ReceiptText },
      { label: 'My Attendance', path: '/ess/attendance', icon: Clock },
      { label: 'My Leave', path: '/ess/leave', icon: CalendarDays },
      { label: 'My Loans & Deductions', path: '/ess/loans', icon: CreditCard },
    ],
  },
  {
    items: [{ label: 'Notifications', path: '/notifications', icon: Bell }],
  },
]

export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    items: [{ label: 'Companies', path: '/platform/companies', icon: Building2 }],
  },
]
