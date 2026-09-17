import type { Role } from '@/types/domain'

export type Capability =
  | 'dashboard.view'
  | 'employees.view'
  | 'employees.edit'
  | 'employees.compensation.edit'
  | 'attendance.view'
  | 'attendance.adjust'
  | 'attendance.approve'
  | 'leave.view'
  | 'leave.request'
  | 'leave.approve'
  | 'payroll.view'
  | 'payroll.run'
  | 'payroll.approve'
  | 'payroll.finalize'
  | 'statutory.view'
  | 'statutory.edit'
  | 'payslips.view'
  | 'payslips.generate'
  | 'loans.view'
  | 'loans.manage'
  | 'ess.view'
  | 'reports.view'
  | 'approvals.view'
  | 'notifications.view'
  | 'notifications.send'
  | 'users.manage'
  | 'settings.company.edit'
  | 'settings.payroll.edit'
  | 'branches.manage'
  | 'integrations.manage'
  | 'subscription.manage'
  | 'onboarding.manage'
  | 'platform.admin'

const ALL_ADMIN_CAPS: Capability[] = [
  'dashboard.view',
  'employees.view',
  'employees.edit',
  'employees.compensation.edit',
  'attendance.view',
  'attendance.adjust',
  'attendance.approve',
  'leave.view',
  'leave.request',
  'leave.approve',
  'payroll.view',
  'payroll.run',
  'payroll.approve',
  'payroll.finalize',
  'statutory.view',
  'statutory.edit',
  'payslips.view',
  'payslips.generate',
  'loans.view',
  'loans.manage',
  'reports.view',
  'approvals.view',
  'notifications.view',
  'notifications.send',
  'users.manage',
  'settings.company.edit',
  'settings.payroll.edit',
  'branches.manage',
  'integrations.manage',
  'subscription.manage',
  'onboarding.manage',
]

export const ROLE_PERMISSIONS: Record<Role, Capability[]> = {
  super_admin: [...ALL_ADMIN_CAPS, 'platform.admin'],
  company_admin: ALL_ADMIN_CAPS,
  hr_admin: [
    'dashboard.view',
    'employees.view',
    'employees.edit',
    'attendance.view',
    'attendance.adjust',
    'leave.view',
    'leave.request',
    'leave.approve',
    'reports.view',
    'approvals.view',
    'notifications.view',
    'onboarding.manage',
  ],
  payroll_admin: [
    'dashboard.view',
    'employees.view',
    'attendance.view',
    'leave.view',
    'payroll.view',
    'payroll.run',
    'payroll.approve',
    'payroll.finalize',
    'statutory.view',
    'statutory.edit',
    'payslips.view',
    'payslips.generate',
    'loans.view',
    'loans.manage',
    'reports.view',
    'approvals.view',
    'notifications.view',
    'settings.payroll.edit',
  ],
  manager: [
    'dashboard.view',
    'attendance.view',
    'attendance.approve',
    'leave.view',
    'leave.approve',
    'reports.view',
    'approvals.view',
    'notifications.view',
    'ess.view',
  ],
  employee: ['ess.view', 'notifications.view'],
}

export function roleHasCapability(role: Role, capability: Capability): boolean {
  return ROLE_PERMISSIONS[role]?.includes(capability) ?? false
}
