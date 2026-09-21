# Graph Report - OPS-frontend  (2026-09-21)

## Corpus Check
- 196 files · ~135,373 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1187 nodes · 1200 edges · 177 communities (119 shown, 58 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4e1c2d11`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- domain.ts
- dependencies
- react
- devDependencies
- compilerOptions
- payrollSettingsService.ts
- compilerOptions
- integrations/routes.tsx
- employeeService.ts
- computationBreakdown.ts
- attendanceService.ts
- payrollService.ts
- payRate.ts
- overtimeService.ts
- overtime/routes.tsx
- companyService.ts
- employees.ts
- ui/index.ts
- integrationService.ts
- attendance/routes.tsx
- rateBasis.ts
- leaveService.ts
- LoginPage.tsx
- CompanyInfoForm.tsx
- PayrollGroupAssignDialog.tsx
- plugins
- Card.tsx
- DeductionDialog.tsx
- PayrollGroupDialog.tsx
- PayrollRulesSection.tsx
- ScheduleDialog.tsx
- EmployeeProfilePage.tsx
- reports/routes.tsx
- user-access/routes.tsx
- reportService.ts
- overtime.ts
- mock-data/index.ts
- Sidebar.tsx
- EssHomePage.tsx
- loans-deductions/routes.tsx
- groupAssignment.ts
- plans.ts
- guards.tsx
- branchService.ts
- dashboardService.ts
- userService.ts
- tenantScope.ts
- navConfig.ts
- Dialog.tsx
- FiltersPopover.tsx
- Table.tsx
- Toast.tsx
- CompensationTypeDialog.tsx
- EarningDialog.tsx
- AddEmployeeDialog.tsx
- EssProfilePage.tsx
- EmployeeComputationDrawer.tsx
- format.ts
- Badge.tsx
- FileAdjustmentDialog.tsx
- AddHolidayDialog.tsx
- EditCompensationForm.tsx
- EssLeavePage.tsx
- AddLoanDialog.tsx
- NewOvertimeRequestDialog.tsx
- PayslipCard.tsx
- subscription/routes.tsx
- InviteUserDialog.tsx
- Button.tsx
- Input.tsx
- MetricCard.tsx
- Tabs.tsx
- AdjustmentRequestDialog.tsx
- AddBranchDialog.tsx
- CompensationTypesSection.tsx
- DeductionsSection.tsx
- PayrollGroupDetailDialog.tsx
- WorkSchedulesSection.tsx
- AdminDashboard.tsx
- EditEmploymentInfoForm.tsx
- EmployeeListPage.tsx
- LeaveRequestDialog.tsx
- LeaveTypeDialog.tsx
- leave/routes.tsx
- CreatePeriodDialog.tsx
- PayrollPeriodDetailPage
- permissions.ts
- types.ts
- loans.ts
- React + TypeScript + Vite
- NotificationsBell.tsx
- Topbar.tsx
- Avatar.tsx
- Checkbox.tsx
- Select.tsx
- ImportBiometricsDialog
- MiniCalendarPicker.tsx
- AssignEmployeesDialog
- PayrollGroupsSection.tsx
- EditPersonalInfoForm.tsx
- LeaveFilterBar.tsx
- hierarchyUtil.ts
- useOnboardingChecklist.ts
- OvertimeDetailsDialog.tsx
- PagibigCard.tsx
- PhilhealthCard.tsx
- SssBracketCard.tsx
- WithholdingTaxCard.tsx
- mockSession.ts
- loanService.ts
- subscriptionService.ts
- attendance.ts
- workflowRecords.ts
- compensationTypes.ts
- payrollGroups.ts
- AppShell.tsx
- PageHeader.tsx
- PlanGate.tsx
- AdjustmentsList
- AttendanceFilterBar.tsx
- groupUtil.ts
- EarningsSection
- PayrollCalendarSection.tsx
- company-settings/routes.tsx
- PendingRequestsCard.tsx
- EditBankInfoForm
- EditBenefitsForm
- EditGovernmentInfoForm
- EssLoansPage.tsx
- LeaveRequestsList
- LoanDetailsDialog.tsx
- notifications/routes.tsx
- notificationService.ts
- deductionConfigs.ts
- earningConfigs.ts
- holidays.ts
- leaveTypes.ts
- statutoryConfig.ts
- tsconfig.json
- app/routes.tsx
- branches.ts
- companies.ts
- payrollRules.ts
- schedules.ts
- users.ts
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `react` - 88 edges
2. `compilerOptions` - 19 edges
3. `compilerOptions` - 15 edges
4. `buildComputationBreakdown()` - 9 edges
5. `scopedEmployeeIds()` - 7 edges
6. `findCompanyEmployee()` - 7 edges
7. `logHistory()` - 7 edges
8. `generateOvertimeRecords()` - 7 edges
9. `AttendancePage()` - 6 edges
10. `scripts` - 5 edges

## Surprising Connections (you probably didn't know these)
- `plugins` --extends--> `react`  [EXTRACTED]
  .oxlintrc.json → .oxlintrc.json  _Bridges community 25 → community 2_

## Import Cycles
- None detected.

## Communities (177 total, 58 thin omitted)

### Community 0 - "domain.ts"
Cohesion: 0.03
Nodes (62): ActivityLogEntry, Address, ApiKey, ApprovalStatus, AttendanceAdjustment, AttendanceRecord, AttendanceStatus, AuditEntry (+54 more)

### Community 1 - "dependencies"
Cohesion: 0.04
Nodes (49): clsx, date-fns, @hookform/resolvers, lucide-react, dependencies, clsx, date-fns, @hookform/resolvers (+41 more)

### Community 3 - "devDependencies"
Cohesion: 0.07
Nodes (28): oxlint, devDependencies, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+20 more)

### Community 4 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+16 more)

### Community 5 - "payrollSettingsService.ts"
Cohesion: 0.09
Nodes (7): CompensationTypeInput, DeductionConfigInput, EarningConfigInput, PayrollGroupInput, setEmployeePayrollGroup(), stripEmployeeFromOtherGroups(), updatePayrollGroupMembership()

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 7 - "integrations/routes.tsx"
Cohesion: 0.11
Nodes (10): AddWebhookDialog(), ApiKeysTab(), CONNECTED_SERVICES, DataExportTab(), onExportEmployees(), onExportPayroll(), DataImportTab(), downloadCsv() (+2 more)

### Community 8 - "employeeService.ts"
Cohesion: 0.16
Nodes (13): CreateEmployeeInput, findCompanyEmployee(), logHistory(), SelfServiceProfileUpdate, UpdateBenefitsInput, UpdateCompensationInput, updateEmployeeBankInfo(), updateEmployeeBenefits() (+5 more)

### Community 9 - "computationBreakdown.ts"
Cohesion: 0.17
Nodes (17): AllocationDetail, allocationFormula(), buildComputationBreakdown(), ComputationBreakdown, ComputationSummary, cutoffIndexFor(), DeductionItem, EarningItem (+9 more)

### Community 10 - "attendanceService.ts"
Cohesion: 0.18
Nodes (14): CreateAdjustmentInput, createAttendanceAdjustment(), FileAdjustmentInput, fileAttendanceAdjustment(), getAttendanceAdjustments(), getAttendanceForDate(), getAttendanceForEmployee(), getAttendanceRecords() (+6 more)

### Community 11 - "payrollService.ts"
Cohesion: 0.17
Nodes (8): approvePayroll(), computeLine(), countAbsences(), CreatePeriodInput, runPayroll(), sssBracketFor(), taxFor(), transition()

### Community 12 - "payRate.ts"
Cohesion: 0.15
Nodes (11): EstimatedEquivalent, formatBaseRate(), formatBaseRateShort(), HELPER_TEXT, OUTPUT_UNIT_OPTIONS, outputUnitWord(), PAY_RATE_TYPE_LABEL, PAY_RATE_TYPE_OPTIONS (+3 more)

### Community 13 - "overtimeService.ts"
Cohesion: 0.21
Nodes (13): computeHours(), CreateOvertimeInput, createOvertimeRecord(), daysAgo(), estimateHourlyRate(), exportOvertimeSummaryCsv(), getOvertimeRecords(), getOvertimeSummary() (+5 more)

### Community 14 - "overtime/routes.tsx"
Cohesion: 0.18
Nodes (12): daysAgo(), downloadCsv(), OvertimePage(), handleDecide(), handleExport(), refetchAll(), PERIOD_OPTIONS, SORT_OPTIONS (+4 more)

### Community 15 - "companyService.ts"
Cohesion: 0.15
Nodes (4): CreateHolidayInput, CreateScheduleInput, UpdateCompanyInput, UpdateScheduleInput

### Community 16 - "employees.ts"
Cohesion: 0.22
Nodes (12): buildCompensationHistory(), COMP_APPROVERS, COMP_HISTORY_REASONS, DEPARTMENT_CATEGORY, DEPARTMENTS, FIRST_NAMES, generateEmployeesForCompany(), LAST_NAMES (+4 more)

### Community 17 - "ui/index.ts"
Cohesion: 0.17
Nodes (5): EmptyStateProps, FormFieldProps, Skeleton, Switch, SwitchProps

### Community 18 - "integrationService.ts"
Cohesion: 0.20
Nodes (4): exportEmployeeMasterlistCsv(), exportPayrollRegisterCsv(), ImportEmployeesResult, toCsv()

### Community 19 - "attendance/routes.tsx"
Cohesion: 0.22
Nodes (7): ADJUSTMENT_SORT_OPTIONS, ADJUSTMENT_STATUS_OPTIONS, AttendancePage(), DAILY_SORT_OPTIONS, DAILY_STATUS_OPTIONS, shiftDate(), todayKey()

### Community 20 - "rateBasis.ts"
Cohesion: 0.27
Nodes (9): basicPayFor(), BasicPayResult, computePaidDays(), computePaidHours(), hashString(), mockOutputQuantity(), RateBasis, STANDARD_HOURS_PER_DAY (+1 more)

### Community 21 - "leaveService.ts"
Cohesion: 0.20
Nodes (4): getLeaveRequests(), LeaveTypeInput, scopedEmployeeIds(), SubmitLeaveInput

### Community 22 - "LoginPage.tsx"
Cohesion: 0.20
Nodes (5): FEATURE_BADGES, FormValues, LANDING_ROUTE_BY_ROLE, LoginPage(), schema

### Community 23 - "CompanyInfoForm.tsx"
Cohesion: 0.20
Nodes (5): COMPANY_TYPE_OPTIONS, CompanyInfoForm(), EMPTY_ADDRESS, EMPTY_CONTACT, FormValues

### Community 24 - "PayrollGroupAssignDialog.tsx"
Cohesion: 0.22
Nodes (6): CATEGORY_OPTIONS, compensationLabel(), PAY_TYPE_OPTIONS, PayrollGroupAssignDialog(), QuickChip, STATUS_OPTIONS

### Community 25 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 26 - "Card.tsx"
Cohesion: 0.22
Nodes (8): Card, CardBody, CardDescription, CardFooter, CardHeader, CardProps, CardRoot, CardTitle

### Community 27 - "DeductionDialog.tsx"
Cohesion: 0.22
Nodes (7): ALLOCATION_METHOD_OPTIONS, CALC_TYPE_OPTIONS, CATEGORY_OPTIONS, DeductionDialog(), FormValues, RECURRENCE_OPTIONS, schema

### Community 28 - "PayrollGroupDialog.tsx"
Cohesion: 0.25
Nodes (6): FormValues, FREQUENCY_DEFAULTS, FREQUENCY_OPTIONS, PayrollGroupDialog(), schema, toFormValues()

### Community 29 - "PayrollRulesSection.tsx"
Cohesion: 0.25
Nodes (7): ABSENCE_BASIS_OPTIONS, ABSENCE_HANDLING_OPTIONS, FormValues, LATE_DEDUCTION_METHOD_OPTIONS, PayrollRulesSection(), ROUNDING_METHOD_OPTIONS, toFormValues()

### Community 30 - "ScheduleDialog.tsx"
Cohesion: 0.25
Nodes (6): DAY_LABELS, FormValues, ScheduleDialog(), schema, SHIFT_TYPE_OPTIONS, toFormValues()

### Community 31 - "EmployeeProfilePage.tsx"
Cohesion: 0.22
Nodes (3): EditableSection, EmployeeProfilePage(), FREQUENCY_LABEL

### Community 32 - "reports/routes.tsx"
Cohesion: 0.33
Nodes (5): AttendanceSummaryTab(), fullName(), LeaveSummaryTab(), MasterlistTab(), PayrollRegisterTab()

### Community 33 - "user-access/routes.tsx"
Cohesion: 0.22
Nodes (3): ROLE_LABELS, ROLE_OPTIONS, UsersTab()

### Community 34 - "reportService.ts"
Cohesion: 0.22
Nodes (4): AttendanceSummaryRow, LeaveSummaryRow, PayrollRegisterReport, PayrollRegisterRow

### Community 35 - "overtime.ts"
Cohesion: 0.39
Nodes (8): generateOvertimeRecords(), hoursFor(), multiplierFor(), REASONS, shiftFor(), statusFor(), toDateKey(), typeForSeed()

### Community 36 - "mock-data/index.ts"
Cohesion: 0.22
Nodes (5): attendanceRecords, db, EMPLOYEE_COUNT_BY_COMPANY, employees, schedulesByCompany

### Community 37 - "Sidebar.tsx"
Cohesion: 0.29
Nodes (3): Sidebar(), SidebarProps, useNavGroups()

### Community 38 - "EssHomePage.tsx"
Cohesion: 0.39
Nodes (7): AttendanceCalendar(), EssHomePage(), monthKeyOf(), STATUS_DOT, STATUS_LABEL, timeOfDayGreeting(), todayKey()

### Community 39 - "loans-deductions/routes.tsx"
Cohesion: 0.25
Nodes (5): LoansDeductionsPage(), SORT_OPTIONS, STATUS_OPTIONS, TYPE_LABELS, TYPE_OPTIONS

### Community 40 - "groupAssignment.ts"
Cohesion: 0.29
Nodes (4): CATEGORY_KEYWORDS, CATEGORY_LABEL, mode(), referenceProfile()

### Community 41 - "plans.ts"
Cohesion: 0.29
Nodes (7): FEATURE_LABELS, minimumPlanFor(), PLAN_DETAILS, PLAN_ORDER, PlanDetails, PlanFeature, planHasFeature()

### Community 42 - "guards.tsx"
Cohesion: 0.25
Nodes (3): RequireCapabilityProps, RequireRoleProps, RequireSelfOrRoleProps

### Community 44 - "dashboardService.ts"
Cohesion: 0.25
Nodes (3): AdminDashboardOverview, DashboardStats, PendingRequestsSummary

### Community 45 - "userService.ts"
Cohesion: 0.36
Nodes (5): inviteUser(), InviteUserInput, logActivity(), setUserActive(), updateUserRole()

### Community 46 - "tenantScope.ts"
Cohesion: 0.32
Nodes (7): BRANCH_SCOPED_ROLES, HasBranch, HasCompany, scopeForSession(), scopeToBranch(), scopeToCompany(), SELF_SCOPED_ROLES

### Community 47 - "navConfig.ts"
Cohesion: 0.29
Nodes (6): ADMIN_NAV, EMPLOYEE_NAV, MANAGER_NAV, NavGroup, NavItem, SUPER_ADMIN_NAV

### Community 48 - "Dialog.tsx"
Cohesion: 0.29
Nodes (6): Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger

### Community 49 - "FiltersPopover.tsx"
Cohesion: 0.29
Nodes (3): FiltersPopoverProps, SortControlProps, SortDirection

### Community 50 - "Table.tsx"
Cohesion: 0.29
Nodes (6): Table, TableBody, TableCell, TableHead, TableHeader, TableRow

### Community 51 - "Toast.tsx"
Cohesion: 0.29
Nodes (4): ToastContext, ToastContextValue, ToastMessage, TONE_CLASSES

### Community 52 - "CompensationTypeDialog.tsx"
Cohesion: 0.33
Nodes (5): COMMISSION_TYPE_OPTIONS, CompensationTypeDialog(), FormValues, KIND_OPTIONS, toFormValues()

### Community 53 - "EarningDialog.tsx"
Cohesion: 0.29
Nodes (5): CALC_TYPE_OPTIONS, CATEGORY_OPTIONS, EarningDialog(), FormValues, schema

### Community 54 - "AddEmployeeDialog.tsx"
Cohesion: 0.29
Nodes (5): AddEmployeeDialog(), EMPLOYMENT_TYPE_OPTIONS, FormValues, OUTPUT_UNIT_SELECT_OPTIONS, schema

### Community 55 - "EssProfilePage.tsx"
Cohesion: 0.29
Nodes (3): EssProfilePage(), FormValues, schema

### Community 58 - "Badge.tsx"
Cohesion: 0.33
Nodes (4): Badge, BadgeProps, STATUS_TONE, TONE_CLASSES

### Community 59 - "FileAdjustmentDialog.tsx"
Cohesion: 0.33
Nodes (4): FileAdjustmentDialog(), FormValues, REASON_CATEGORY_OPTIONS, schema

### Community 60 - "AddHolidayDialog.tsx"
Cohesion: 0.33
Nodes (4): AddHolidayDialog(), FormValues, schema, TYPE_OPTIONS

### Community 61 - "EditCompensationForm.tsx"
Cohesion: 0.33
Nodes (3): EditCompensationForm(), OUTPUT_UNIT_SELECT_OPTIONS, REASON_OPTIONS

### Community 62 - "EssLeavePage.tsx"
Cohesion: 0.33
Nodes (3): FormValues, RequestLeaveDialog(), schema

### Community 63 - "AddLoanDialog.tsx"
Cohesion: 0.33
Nodes (4): AddLoanDialog(), FormValues, schema, TYPE_OPTIONS

### Community 64 - "NewOvertimeRequestDialog.tsx"
Cohesion: 0.33
Nodes (4): FormValues, NewOvertimeRequestDialog(), schema, TYPE_OPTIONS

### Community 65 - "PayslipCard.tsx"
Cohesion: 0.40
Nodes (3): allocationHint(), FREQUENCY_LABEL, PayslipCard()

### Community 68 - "InviteUserDialog.tsx"
Cohesion: 0.33
Nodes (4): FormValues, InviteUserDialog(), ROLE_OPTIONS, schema

### Community 69 - "Button.tsx"
Cohesion: 0.40
Nodes (4): Button, ButtonProps, SIZE_CLASSES, VARIANT_CLASSES

### Community 70 - "Input.tsx"
Cohesion: 0.40
Nodes (4): Input, InputProps, Textarea, TextareaProps

### Community 71 - "MetricCard.tsx"
Cohesion: 0.40
Nodes (3): MetricCardProps, MetricCardTone, TONE_CLASSES

### Community 72 - "Tabs.tsx"
Cohesion: 0.40
Nodes (4): Tabs, TabsContent, TabsList, TabsTrigger

### Community 73 - "AdjustmentRequestDialog.tsx"
Cohesion: 0.40
Nodes (3): AdjustmentRequestDialog(), FormValues, schema

### Community 75 - "AddBranchDialog.tsx"
Cohesion: 0.40
Nodes (3): AddBranchDialog(), FormValues, schema

### Community 78 - "DeductionsSection.tsx"
Cohesion: 0.40
Nodes (3): CATEGORY_LABEL, CATEGORY_TONE, DeductionsSection()

### Community 80 - "WorkSchedulesSection.tsx"
Cohesion: 0.50
Nodes (4): DAY_LABELS, formatDays(), SHIFT_LABEL, WorkSchedulesSection()

### Community 81 - "AdminDashboard.tsx"
Cohesion: 0.50
Nodes (4): AdminDashboard(), QUICK_ACTIONS, RECENT_EMPLOYEE_STATUS_LABEL, timeOfDayGreeting()

### Community 82 - "EditEmploymentInfoForm.tsx"
Cohesion: 0.40
Nodes (3): CATEGORY_OPTIONS, EditEmploymentInfoForm(), EMPLOYMENT_TYPE_OPTIONS

### Community 83 - "EmployeeListPage.tsx"
Cohesion: 0.40
Nodes (3): EmployeeListPage(), SORT_OPTIONS, STATUS_OPTIONS

### Community 84 - "LeaveRequestDialog.tsx"
Cohesion: 0.40
Nodes (3): FormValues, LeaveRequestDialog(), schema

### Community 87 - "CreatePeriodDialog.tsx"
Cohesion: 0.40
Nodes (3): CreatePeriodDialog(), FormValues, schema

### Community 89 - "permissions.ts"
Cohesion: 0.40
Nodes (3): ALL_ADMIN_CAPS, Capability, ROLE_PERMISSIONS

### Community 90 - "types.ts"
Cohesion: 0.40
Nodes (3): PaginatedResult, ServiceError, ServiceErrorCode

### Community 91 - "loans.ts"
Cohesion: 0.60
Nodes (4): buildRepaymentHistory(), generateLoans(), LOAN_TEMPLATES, pad()

### Community 92 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 95 - "Avatar.tsx"
Cohesion: 0.50
Nodes (3): Avatar, AvatarProps, SIZE_CLASSES

### Community 96 - "Checkbox.tsx"
Cohesion: 0.50
Nodes (3): Checkbox, RadioGroup, RadioGroupItem

### Community 97 - "Select.tsx"
Cohesion: 0.50
Nodes (3): Select, SelectOption, SelectProps

### Community 107 - "OvertimeDetailsDialog.tsx"
Cohesion: 0.67
Nodes (3): estimatedHourlyRate(), OvertimeDetailsDialog(), TYPE_LABEL

### Community 112 - "mockSession.ts"
Cohesion: 0.50
Nodes (3): DEMO_ACCOUNTS, SessionState, useSessionStore

### Community 115 - "attendance.ts"
Cohesion: 0.83
Nodes (3): generateAttendanceRecords(), pickStatus(), toDateKey()

### Community 117 - "compensationTypes.ts"
Cohesion: 0.67
Nodes (3): compensationTypes, DEFAULT_TYPES_FOR(), FRONTLINE_TYPES

### Community 118 - "payrollGroups.ts"
Cohesion: 0.67
Nodes (3): DEFAULT_GROUP_FOR(), FRONTLINE_GROUPS, payrollGroups

## Knowledge Gaps
- **465 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+460 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `integrations/routes.tsx`, `useIntegrations.ts`, `useLeave.ts`, `useOvertime.ts`, `overtime/routes.tsx`, `usePayroll.ts`, `ui/index.ts`, `attendance/routes.tsx`, `LoginPage.tsx`, `CompanyInfoForm.tsx`, `PayrollGroupAssignDialog.tsx`, `plugins`, `Card.tsx`, `DeductionDialog.tsx`, `PayrollGroupDialog.tsx`, `PayrollRulesSection.tsx`, `ScheduleDialog.tsx`, `EmployeeProfilePage.tsx`, `reports/routes.tsx`, `EssHomePage.tsx`, `loans-deductions/routes.tsx`, `guards.tsx`, `Dialog.tsx`, `FiltersPopover.tsx`, `Table.tsx`, `Toast.tsx`, `CompensationTypeDialog.tsx`, `EarningDialog.tsx`, `AddEmployeeDialog.tsx`, `EssProfilePage.tsx`, `EmployeeComputationDrawer.tsx`, `Badge.tsx`, `FileAdjustmentDialog.tsx`, `AddHolidayDialog.tsx`, `EssLeavePage.tsx`, `AddLoanDialog.tsx`, `NewOvertimeRequestDialog.tsx`, `useReports.ts`, `InviteUserDialog.tsx`, `Button.tsx`, `Input.tsx`, `Tabs.tsx`, `AdjustmentRequestDialog.tsx`, `useAttendance.ts`, `AddBranchDialog.tsx`, `PayrollGroupDetailDialog.tsx`, `EmployeeListPage.tsx`, `LeaveRequestDialog.tsx`, `LeaveTypeDialog.tsx`, `leave/routes.tsx`, `CreatePeriodDialog.tsx`, `PayrollPeriodDetailPage`, `NotificationsBell.tsx`, `Avatar.tsx`, `Checkbox.tsx`, `Select.tsx`, `ImportBiometricsDialog`, `MiniCalendarPicker.tsx`, `AssignEmployeesDialog`, `useDashboardData.ts`, `useOnboardingChecklist.ts`, `PagibigCard.tsx`, `PhilhealthCard.tsx`, `SssBracketCard.tsx`, `WithholdingTaxCard.tsx`, `AppShell.tsx`, `PageHeader.tsx`, `useBranches.ts`, `PayrollCalendarSection.tsx`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _465 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `domain.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.031746031746031744 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._