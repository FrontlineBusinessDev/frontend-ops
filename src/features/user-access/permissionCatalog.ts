import type { Capability } from '@/lib/rbac/permissions'
import type { Role } from '@/types/domain'

/** Display metadata for the Permission Map — labels, descriptions, and grouping only; access checks stay in lib/rbac. */
export type PermissionGroup = 'Overview' | 'Workforce' | 'Time & Attendance' | 'Leave' | 'Payroll' | 'Compensation & Benefits' | 'Analytics & Reports' | 'Communication' | 'Settings & Administration' | 'Platform'

export const PERMISSION_GROUP_ORDER: PermissionGroup[] = [
  'Overview',
  'Workforce',
  'Time & Attendance',
  'Leave',
  'Payroll',
  'Compensation & Benefits',
  'Analytics & Reports',
  'Communication',
  'Settings & Administration',
  'Platform',
]

export const PERMISSION_GROUP_DESCRIPTION: Record<PermissionGroup, string> = {
  Overview: 'Dashboards and the employee self-service portal.',
  Workforce: 'Employee records, onboarding, and branch assignment.',
  'Time & Attendance': 'Attendance logs, adjustments, and overtime.',
  Leave: 'Leave requests, approvals, and leave type setup.',
  Payroll: 'Payroll runs, statutory contributions, and payslips.',
  'Compensation & Benefits': 'Pay rates, loans, bonuses, and 13th month pay.',
  'Analytics & Reports': 'Reports, insights, and the approvals inbox.',
  Communication: 'In-app notifications and announcements.',
  'Settings & Administration': 'Users, company and payroll settings, integrations, and billing.',
  Platform: 'Cross-company platform administration.',
}

export const CAPABILITY_INFO: Record<Capability, { label: string; description: string; group: PermissionGroup }> = {
  'dashboard.view': { label: 'View dashboard', description: 'See the company dashboard, metrics, and quick actions.', group: 'Overview' },
  'ess.view': { label: 'Employee self-service', description: 'Access the personal portal: own payslips, leave, attendance, and profile.', group: 'Overview' },

  'employees.view': { label: 'View employees', description: 'Browse the employee directory and profiles.', group: 'Workforce' },
  'employees.edit': { label: 'Edit employees', description: 'Add, update, archive, and restore employee records.', group: 'Workforce' },
  'onboarding.manage': { label: 'Manage onboarding', description: 'Run the company onboarding checklist and setup steps.', group: 'Workforce' },
  'branches.manage': { label: 'Manage branches', description: 'Create branches and assign or transfer employees between them.', group: 'Workforce' },

  'attendance.view': { label: 'View attendance', description: 'See time logs, daily attendance, and biometric records.', group: 'Time & Attendance' },
  'attendance.adjust': { label: 'Adjust attendance', description: 'Correct time logs and file attendance adjustments.', group: 'Time & Attendance' },
  'attendance.approve': { label: 'Approve attendance adjustments', description: 'Approve or reject attendance correction requests.', group: 'Time & Attendance' },
  'overtime.view': { label: 'View overtime', description: 'See overtime and night differential records.', group: 'Time & Attendance' },
  'overtime.log': { label: 'Log overtime', description: 'File overtime and night differential entries.', group: 'Time & Attendance' },
  'overtime.approve': { label: 'Approve overtime', description: 'Approve or reject overtime before it is paid in payroll.', group: 'Time & Attendance' },

  'leave.view': { label: 'View leave', description: 'See leave requests, balances, and the leave calendar.', group: 'Leave' },
  'leave.request': { label: 'File leave', description: 'Submit leave requests on behalf of employees.', group: 'Leave' },
  'leave.approve': { label: 'Approve leave', description: 'Approve or reject leave requests.', group: 'Leave' },
  'leave.manage_types': { label: 'Manage leave types', description: 'Configure leave types, credits, and paid/unpaid rules.', group: 'Leave' },

  'payroll.view': { label: 'View payroll runs', description: 'See payroll periods, computations, and totals.', group: 'Payroll' },
  'payroll.run': { label: 'Run payroll', description: 'Create payroll periods and calculate employee pay.', group: 'Payroll' },
  'payroll.approve': { label: 'Approve payroll', description: 'Review and approve calculated payroll runs.', group: 'Payroll' },
  'payroll.finalize': { label: 'Finalize payroll', description: 'Lock payroll runs, issue payslips, and post loan deductions.', group: 'Payroll' },
  'statutory.view': { label: 'View statutory contributions', description: 'See SSS, PhilHealth, Pag-IBIG, and withholding tax tables.', group: 'Payroll' },
  'statutory.edit': { label: 'Edit statutory contributions', description: 'Update contribution brackets, rates, and tax tables.', group: 'Payroll' },
  'payslips.view': { label: 'View payslips', description: 'Open and print employee payslips.', group: 'Payroll' },
  'payslips.generate': { label: 'Generate & send payslips', description: 'Generate payslips and email them to employees.', group: 'Payroll' },

  'employees.compensation.edit': { label: 'Edit compensation', description: 'Change pay rates, allowances, and pay rate types.', group: 'Compensation & Benefits' },
  'compensation_approvals.manage': { label: 'Manage work-log approvals', description: 'Approve hourly timecards and output submissions used for pay.', group: 'Compensation & Benefits' },
  'loans.view': { label: 'View benefits, loans & deductions', description: 'See employee benefits, loans, balances, repayment schedules, and deductions.', group: 'Compensation & Benefits' },
  'loans.manage': { label: 'Manage benefits, loans & deductions', description: 'Add, edit, and end employee benefits, loans, and deductions.', group: 'Compensation & Benefits' },
  'bonuses.view': { label: 'View bonuses & incentives', description: 'See bonus and incentive configurations.', group: 'Compensation & Benefits' },
  'bonuses.manage': { label: 'Manage bonuses & incentives', description: 'Create, submit, and approve bonuses and incentives.', group: 'Compensation & Benefits' },
  'thirteenth_month.view': { label: 'View 13th month pay', description: 'See 13th month pay batches and computations.', group: 'Compensation & Benefits' },
  'thirteenth_month.manage': { label: 'Manage 13th month pay', description: 'Generate, finalize, and issue 13th month payslips.', group: 'Compensation & Benefits' },

  'reports.view': { label: 'View reports', description: 'Open, export, and print workforce and payroll reports.', group: 'Analytics & Reports' },
  'insights.view': { label: 'View insights', description: 'See analytics and decision-support insights.', group: 'Analytics & Reports' },
  'approvals.view': { label: 'Approvals inbox', description: 'See pending requests that need action.', group: 'Analytics & Reports' },

  'notifications.view': { label: 'View notifications', description: 'Receive in-app notifications.', group: 'Communication' },
  'notifications.send': { label: 'Send notifications', description: 'Send announcements and notifications to employees.', group: 'Communication' },

  'users.manage': { label: 'Manage users & access', description: 'Invite users, change roles, and deactivate accounts.', group: 'Settings & Administration' },
  'settings.company.edit': { label: 'Edit company settings', description: 'Update company profile, holidays, and branding.', group: 'Settings & Administration' },
  'settings.payroll.edit': { label: 'Edit payroll settings', description: 'Configure payroll groups, earnings, deductions, rules, and rates.', group: 'Settings & Administration' },
  'integrations.manage': { label: 'Manage integrations', description: 'Configure API keys, webhooks, and connected apps.', group: 'Settings & Administration' },
  'subscription.manage': { label: 'Manage subscription', description: 'Change plan, billing, and subscription details.', group: 'Settings & Administration' },

  'platform.admin': { label: 'Platform administration', description: 'Administer all companies on the platform.', group: 'Platform' },
}

export const ROLE_DESCRIPTION: Record<Role, string> = {
  super_admin: 'Full platform access across all companies, including platform administration.',
  company_admin: 'Full access to everything in this company — people, payroll, settings, and billing.',
  hr_admin: 'Manages employee records, attendance, overtime, leave, and onboarding.',
  payroll_admin: 'Runs payroll end to end — statutory contributions, payslips, loans, bonuses, and 13th month pay.',
  manager: 'Approves their team’s attendance, overtime, and leave, and views team reports.',
  employee: 'Self-service only — own payslips, leave, attendance, and notifications.',
}

export interface GroupedCapabilities {
  group: PermissionGroup
  granted: Capability[]
  notGranted: Capability[]
}

/** Every capability, grouped, split into what `capabilities` grants and what it doesn't. */
export function groupCapabilities(capabilities: Capability[]): GroupedCapabilities[] {
  const granted = new Set(capabilities)
  const all = Object.keys(CAPABILITY_INFO) as Capability[]
  return PERMISSION_GROUP_ORDER.map((group) => {
    const inGroup = all.filter((c) => CAPABILITY_INFO[c].group === group)
    return { group, granted: inGroup.filter((c) => granted.has(c)), notGranted: inGroup.filter((c) => !granted.has(c)) }
  })
}
