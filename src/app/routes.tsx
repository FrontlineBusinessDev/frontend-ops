import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth, RequireCapability } from '@/lib/rbac/guards'
import { DashboardPage } from '@/features/dashboard/routes'
import { EmployeeListPage, EmployeeProfilePage } from '@/features/employees/routes'
import { AttendancePage } from '@/features/attendance/routes'
import { OvertimePage } from '@/features/overtime/routes'
import { LeavePage } from '@/features/leave/routes'
import { PayrollListPage, PayrollPeriodDetailPage } from '@/features/payroll/routes'
import { PayslipDetailPage, PayslipsListPage } from '@/features/payslips/routes'
import { StatutoryPage } from '@/features/statutory/routes'
import { LoansDeductionsPage } from '@/features/loans-deductions/routes'
import { BonusesPage } from '@/features/bonuses/routes'
import { ThirteenthMonthPage } from '@/features/thirteenth-month/routes'
import {
  EssAttendancePage,
  EssHomePage,
  EssLeavePage,
  EssLoansPage,
  EssOvertimePage,
  EssPayslipDetailPage,
  EssPayslipsPage,
  EssProfilePage,
} from '@/features/ess/routes'
import { NotificationsPage } from '@/features/notifications/routes'
import { ReportDetailPage, ReportsPage } from '@/features/reports/routes'
import { UserAccessPage } from '@/features/user-access/routes'
import { CompanySettingsPage } from '@/features/company-settings/routes'
import { OnboardingPage } from '@/features/onboarding/routes'
import { BranchesPage } from '@/features/branches/routes'
import { SubscriptionPage } from '@/features/subscription/routes'
import { IntegrationsPage } from '@/features/integrations/routes'
import { CompaniesPage } from '@/features/platform/CompaniesPage'
import { ForbiddenPage } from '@/features/misc/ForbiddenPage'

export const router = createBrowserRouter([
  { path: 'login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <RequireCapability capability="dashboard.view">
            <DashboardPage />
          </RequireCapability>
        ),
      },
      {
        path: 'employees',
        element: (
          <RequireCapability capability="employees.view">
            <EmployeeListPage />
          </RequireCapability>
        ),
      },
      {
        path: 'employees/:id',
        element: (
          <RequireCapability capability="employees.view">
            <EmployeeProfilePage />
          </RequireCapability>
        ),
      },
      {
        path: 'attendance',
        element: (
          <RequireCapability capability="attendance.view">
            <AttendancePage />
          </RequireCapability>
        ),
      },
      {
        path: 'overtime',
        element: (
          <RequireCapability capability="overtime.view">
            <OvertimePage />
          </RequireCapability>
        ),
      },
      {
        path: 'leave',
        element: (
          <RequireCapability capability="leave.view">
            <LeavePage />
          </RequireCapability>
        ),
      },
      {
        path: 'payroll',
        element: (
          <RequireCapability capability="payroll.view">
            <PayrollListPage />
          </RequireCapability>
        ),
      },
      {
        path: 'payroll/:id',
        element: (
          <RequireCapability capability="payroll.view">
            <PayrollPeriodDetailPage />
          </RequireCapability>
        ),
      },
      {
        path: 'bonuses',
        element: (
          <RequireCapability capability="bonuses.view">
            <BonusesPage />
          </RequireCapability>
        ),
      },
      {
        path: 'thirteenth-month-pay',
        element: (
          <RequireCapability capability="thirteenth_month.view">
            <ThirteenthMonthPage />
          </RequireCapability>
        ),
      },
      {
        path: 'payslips',
        element: (
          <RequireCapability capability="payslips.view">
            <PayslipsListPage />
          </RequireCapability>
        ),
      },
      {
        path: 'payslips/:lineId',
        element: (
          <RequireCapability capability="payslips.view">
            <PayslipDetailPage />
          </RequireCapability>
        ),
      },
      {
        path: 'statutory',
        element: (
          <RequireCapability capability="statutory.view">
            <StatutoryPage />
          </RequireCapability>
        ),
      },
      {
        path: 'loans-deductions',
        element: (
          <RequireCapability capability="loans.view">
            <LoansDeductionsPage />
          </RequireCapability>
        ),
      },
      {
        path: 'ess',
        element: (
          <RequireCapability capability="ess.view">
            <EssHomePage />
          </RequireCapability>
        ),
      },
      {
        path: 'ess/profile',
        element: (
          <RequireCapability capability="ess.view">
            <EssProfilePage />
          </RequireCapability>
        ),
      },
      {
        path: 'ess/payslips',
        element: (
          <RequireCapability capability="ess.view">
            <EssPayslipsPage />
          </RequireCapability>
        ),
      },
      {
        path: 'ess/payslips/:lineId',
        element: (
          <RequireCapability capability="ess.view">
            <EssPayslipDetailPage />
          </RequireCapability>
        ),
      },
      {
        path: 'ess/attendance',
        element: (
          <RequireCapability capability="ess.view">
            <EssAttendancePage />
          </RequireCapability>
        ),
      },
      {
        path: 'ess/overtime',
        element: (
          <RequireCapability capability="ess.view">
            <EssOvertimePage />
          </RequireCapability>
        ),
      },
      {
        path: 'ess/leave',
        element: (
          <RequireCapability capability="ess.view">
            <EssLeavePage />
          </RequireCapability>
        ),
      },
      {
        path: 'ess/loans',
        element: (
          <RequireCapability capability="ess.view">
            <EssLoansPage />
          </RequireCapability>
        ),
      },
      { path: 'notifications', element: <NotificationsPage /> },
      {
        path: 'reports',
        element: (
          <RequireCapability capability="reports.view">
            <ReportsPage />
          </RequireCapability>
        ),
      },
      {
        path: 'reports/:reportId',
        element: (
          <RequireCapability capability="reports.view">
            <ReportDetailPage />
          </RequireCapability>
        ),
      },
      {
        path: 'user-access',
        element: (
          <RequireCapability capability="users.manage">
            <UserAccessPage />
          </RequireCapability>
        ),
      },
      {
        path: 'company-settings',
        element: (
          <RequireCapability capability="settings.company.edit">
            <CompanySettingsPage />
          </RequireCapability>
        ),
      },
      {
        path: 'onboarding',
        element: (
          <RequireCapability capability="onboarding.manage">
            <OnboardingPage />
          </RequireCapability>
        ),
      },
      {
        path: 'branches',
        element: (
          <RequireCapability capability="branches.manage">
            <BranchesPage />
          </RequireCapability>
        ),
      },
      {
        path: 'subscription',
        element: (
          <RequireCapability capability="subscription.manage">
            <SubscriptionPage />
          </RequireCapability>
        ),
      },
      {
        path: 'integrations',
        element: (
          <RequireCapability capability="integrations.manage">
            <IntegrationsPage />
          </RequireCapability>
        ),
      },
      {
        path: 'platform/companies',
        element: (
          <RequireCapability capability="platform.admin">
            <CompaniesPage />
          </RequireCapability>
        ),
      },
      { path: 'forbidden', element: <ForbiddenPage /> },
      { path: '*', element: <ForbiddenPage /> },
    ],
  },
])
