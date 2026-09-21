import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlanGate } from '@/components/ui/PlanGate'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { DebitCreditReport } from '@/features/reports/components/AccountingReports'
import {
  CompensationAnalysisReport,
  EarningsVsDeductionsReport,
  EmployerContributionAnalysisReport,
  AttendanceAbsenteeismReport,
  HeadcountAnalysisReport,
  LaborCostAnalysisReport,
  LeaveUtilizationReport,
  OvertimeCostAnalysisReport,
  PayrollCostAnalysisReport,
  PayrollCostByDimensionReport,
  PayrollExpenseByAccountReport,
  PayrollTrendReport,
} from '@/features/reports/components/AdvancedReports'
import {
  EmployeeCompensationReport,
  EmployeeMasterListReport,
  LoansDeductionsReportView,
  OvertimeReportView,
  PayrollRegisterReport,
  PayrollSummaryPerEmployeeReport,
  PayrollSummaryReport,
  PayslipReportView,
} from '@/features/reports/components/BasicReports'
import { CustomReportBuilder } from '@/features/reports/components/CustomReportBuilder'
import { ReportCategorySection, type ReportCategory } from '@/features/reports/components/shared'
import { Bir1601CReport, Bir2316Report, StatutoryContributionReport } from '@/features/reports/components/StatutoryReports'
import { useSubscriptionUsage } from '@/features/subscription/hooks/useSubscription'

const BASIC_CATEGORIES: ReportCategory[] = [
  {
    label: 'Employee Reports',
    reports: [
      { id: 'employee-master-list', label: 'Employee Master List', description: 'Full profile and demographic export.' },
      { id: 'employee-compensation', label: 'Employee Compensation Report', description: 'Breakdown of basic rates, allowances, and pay frequency.' },
    ],
  },
  {
    label: 'Payroll Reports',
    reports: [
      { id: 'payroll-register', label: 'Payroll Register', description: 'Detailed payroll breakdown per employee.' },
      { id: 'payroll-summary', label: 'Payroll Summary', description: 'High-level period total summary.' },
      { id: 'payroll-summary-per-employee', label: 'Payroll Summary per Employee', description: 'Individual period comparisons.' },
      { id: 'payslip-report', label: 'Payslip Report', description: 'Batch view of generated payslips.' },
      { id: 'overtime-report', label: 'Overtime Report', description: 'OT and Night Differential hours & costs.' },
      { id: 'loans-deductions-report', label: 'Loans & Deductions Report', description: 'Active company loans and recurring deduction tracking.' },
    ],
  },
  {
    label: 'Accounting Reports',
    reports: [
      { id: 'debit-credit', label: 'Payroll Summary — Debit & Credit', description: 'Payroll transactions as formal Debit and Credit accounts.' },
    ],
  },
  {
    label: 'Statutory & Tax Reports',
    reports: [
      { id: 'bir-2316', label: 'BIR Form 2316', description: 'Annual Certificate of Compensation/Tax Withheld.' },
      { id: 'bir-1601c', label: 'BIR Form 1601-C', description: 'Monthly Remittance Return of Income Taxes Withheld.' },
      { id: 'sss-contribution', label: 'SSS Contribution Report', description: 'Monthly SSS R3/R5 remittance summary.' },
      { id: 'philhealth-contribution', label: 'PhilHealth Contribution Report', description: 'Monthly ER2/RF-1 remittance report.' },
      { id: 'pagibig-contribution', label: 'Pag-IBIG Contribution Report', description: 'Monthly MCRF remittance report.' },
    ],
  },
]

const ADVANCED_CATEGORIES: ReportCategory[] = [
  {
    label: 'Payroll Analytics',
    reports: [
      { id: 'payroll-cost-analysis', label: 'Payroll Cost Analysis', description: 'Trend of gross pay, employer contributions, and net pay by period.' },
      { id: 'payroll-trend-variance', label: 'Payroll Trend & Variance', description: 'Gross vs. net pay across every period, with variance.' },
      { id: 'payroll-cost-department', label: 'Payroll Cost by Department', description: 'Total payroll cost grouped by department.' },
      { id: 'payroll-cost-branch', label: 'Payroll Cost by Branch', description: 'Total payroll cost grouped by branch.' },
      { id: 'payroll-cost-group', label: 'Payroll Cost by Payroll Group', description: 'Total payroll cost grouped by Payroll Group.' },
    ],
  },
  {
    label: 'Workforce Analytics',
    reports: [
      { id: 'headcount-analysis', label: 'Headcount Analysis', description: 'Active vs. inactive headcount by department.' },
      { id: 'compensation-analysis', label: 'Compensation Analysis', description: 'Employee count and average rate by Pay Rate Type.' },
      { id: 'overtime-cost-analysis', label: 'Overtime Cost Analysis', description: 'Overtime hours and cost expenditure trend, month over month.' },
      { id: 'attendance-absenteeism', label: 'Attendance / Absenteeism Analysis', description: 'Present, late, undertime, and absence counts.' },
      { id: 'leave-utilization', label: 'Leave Utilization Analysis', description: 'Approved leave days taken, by leave type.' },
    ],
  },
  {
    label: 'Financial / Management',
    reports: [
      { id: 'labor-cost-analysis', label: 'Labor Cost Analysis', description: 'Gross pay plus employer contributions, per period.' },
      { id: 'earnings-vs-deductions', label: 'Earnings vs. Deductions Analysis', description: 'Total earnings against total deductions, per period.' },
      { id: 'employer-contribution-analysis', label: 'Employer Contribution Analysis', description: 'Employer-side statutory contributions, per period.' },
      { id: 'payroll-expense-by-account', label: 'Payroll Expense by Account & Cost Comparison', description: 'Expense accounts compared period over period.' },
    ],
  },
  {
    label: 'Custom Reports',
    reports: [
      { id: 'custom-report-builder', label: 'Custom Report Builder', description: 'Pick columns and filters, save as a template, and export.' },
    ],
  },
]

function renderBasicReport(id: string) {
  switch (id) {
    case 'employee-master-list':
      return <EmployeeMasterListReport />
    case 'employee-compensation':
      return <EmployeeCompensationReport />
    case 'payroll-register':
      return <PayrollRegisterReport />
    case 'payroll-summary':
      return <PayrollSummaryReport />
    case 'payroll-summary-per-employee':
      return <PayrollSummaryPerEmployeeReport />
    case 'payslip-report':
      return <PayslipReportView />
    case 'overtime-report':
      return <OvertimeReportView />
    case 'loans-deductions-report':
      return <LoansDeductionsReportView />
    case 'debit-credit':
      return <DebitCreditReport />
    case 'bir-2316':
      return <Bir2316Report />
    case 'bir-1601c':
      return <Bir1601CReport />
    case 'sss-contribution':
      return <StatutoryContributionReport type="sss" />
    case 'philhealth-contribution':
      return <StatutoryContributionReport type="philhealth" />
    case 'pagibig-contribution':
      return <StatutoryContributionReport type="pagibig" />
    default:
      return null
  }
}

function renderAdvancedReport(id: string) {
  switch (id) {
    case 'payroll-cost-analysis':
      return <PayrollCostAnalysisReport />
    case 'payroll-trend-variance':
      return <PayrollTrendReport />
    case 'payroll-cost-department':
      return <PayrollCostByDimensionReport dimension="department" />
    case 'payroll-cost-branch':
      return <PayrollCostByDimensionReport dimension="branch" />
    case 'payroll-cost-group':
      return <PayrollCostByDimensionReport dimension="group" />
    case 'headcount-analysis':
      return <HeadcountAnalysisReport />
    case 'compensation-analysis':
      return <CompensationAnalysisReport />
    case 'overtime-cost-analysis':
      return <OvertimeCostAnalysisReport />
    case 'attendance-absenteeism':
      return <AttendanceAbsenteeismReport />
    case 'leave-utilization':
      return <LeaveUtilizationReport />
    case 'labor-cost-analysis':
      return <LaborCostAnalysisReport />
    case 'earnings-vs-deductions':
      return <EarningsVsDeductionsReport />
    case 'employer-contribution-analysis':
      return <EmployerContributionAnalysisReport />
    case 'payroll-expense-by-account':
      return <PayrollExpenseByAccountReport />
    case 'custom-report-builder':
      return <CustomReportBuilder />
    default:
      return null
  }
}

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'advanced' ? 'advanced' : 'basic'

  function onTabChange(tab: string) {
    setSearchParams(tab === 'advanced' ? { tab: 'advanced' } : {}, { replace: true })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Basic payroll/employee reports and advanced analytics for the Company Admin Portal." />

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="basic">Basic Reports</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          {BASIC_CATEGORIES.map((category) => (
            <ReportCategorySection key={category.label} category={category} tab="basic" />
          ))}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          {ADVANCED_CATEGORIES.map((category) => (
            <ReportCategorySection key={category.label} category={category} tab="advanced" />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ReportLookup {
  label: string
  description: string
  kind: 'basic' | 'advanced'
}

const REPORT_LOOKUP: Record<string, ReportLookup> = Object.fromEntries([
  ...BASIC_CATEGORIES.flatMap((c) => c.reports.map((r) => [r.id, { label: r.label, description: r.description, kind: 'basic' as const }])),
  ...ADVANCED_CATEGORIES.flatMap((c) => c.reports.map((r) => [r.id, { label: r.label, description: r.description, kind: 'advanced' as const }])),
])

export function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const [searchParams] = useSearchParams()
  const { usage, isLoading: usageLoading } = useSubscriptionUsage()
  const meta = reportId ? REPORT_LOOKUP[reportId] : undefined

  // The `?tab=` query param records which tab the user opened this report from, so the back
  // link restores it exactly — including after a full page reload. Fall back to the report's
  // own category (basic/advanced never overlap) if the param is missing or was tampered with.
  const originTab = searchParams.get('tab') === 'advanced' || searchParams.get('tab') === 'basic' ? searchParams.get('tab') : meta?.kind ?? 'basic'

  const content = useMemo(() => {
    if (!reportId || !meta) return null
    return meta.kind === 'basic' ? renderBasicReport(reportId) : renderAdvancedReport(reportId)
  }, [reportId, meta])

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Link to={`/reports?tab=${originTab}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to Reports
        </Link>
      </div>

      {!meta || !content ? (
        <p className="text-sm text-muted-foreground">Report not found.</p>
      ) : (
        <>
          {meta.kind === 'advanced' ? (
            usageLoading ? (
              <Skeleton className="h-56" />
            ) : (
              <PlanGate feature="advanced_reports" planTier={usage!.planTier}>
                {content}
              </PlanGate>
            )
          ) : (
            content
          )}
        </>
      )}
    </div>
  )
}
