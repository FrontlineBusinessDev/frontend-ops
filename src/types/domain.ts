export type Role =
  | 'super_admin'
  | 'company_admin'
  | 'hr_admin'
  | 'payroll_admin'
  | 'manager'
  | 'employee'

export type PlanTier = 'starter' | 'growth' | 'professional'

export type CompanyType = 'corporation' | 'partnership' | 'sole_proprietorship' | 'other'

export interface Address {
  buildingUnit?: string
  street?: string
  barangay?: string
  city?: string
  province?: string
  region?: string
  zipCode?: string
  country: string
}

export interface CompanyContact {
  name: string
  position?: string
  email: string
  contactNumber: string
}

export interface CompanyRegistration {
  secNo?: string
  dtiNo?: string
  birTin?: string
  rdoCode?: string
  philhealthEmployerNo?: string
  sssEmployerNo?: string
  pagibigEmployerNo?: string
  businessPermitNo?: string
}

export interface Company {
  id: string
  name: string
  tradeName?: string
  logoUrl?: string
  companyType?: CompanyType
  industry?: string
  description?: string
  website?: string
  email?: string
  contactNumber?: string
  planTier: PlanTier
  timezone: string
  payrollFrequency: 'semi_monthly' | 'monthly' | 'weekly'
  createdAt: string
  registration?: CompanyRegistration
  registeredAddress?: Address
  officeAddress?: Address
  sameAsRegisteredAddress?: boolean
  primaryContact?: CompanyContact
  payrollContact?: CompanyContact
  hrContact?: CompanyContact
}

export interface Branch {
  id: string
  companyId: string
  name: string
  isHeadOffice: boolean
}

export interface SessionUser {
  id: string
  companyId: string
  branchId?: string
  employeeId?: string
  role: Role
  name: string
  email: string
  avatarUrl?: string
  isActive?: boolean
}

export interface ActivityLogEntry {
  id: string
  companyId: string
  timestamp: string
  actor: string
  action: string
  details?: string
}

export interface Holiday {
  id: string
  companyId: string
  name: string
  date: string
  type: 'regular' | 'special_non_working'
}

export type EmploymentStatus = 'active' | 'inactive' | 'archived'

export interface EmployeePersonal {
  firstName: string
  lastName: string
  birthDate: string
  civilStatus: 'single' | 'married' | 'widowed' | 'separated'
  address: string
  contactNumber: string
  personalEmail?: string
}

export type EmployeeCategory = 'regular' | 'admin_staff' | 'production_worker' | 'field_worker' | 'contractor'

export interface EmployeeEmployment {
  position: string
  department: string
  employmentType: 'regular' | 'probationary' | 'contractual' | 'part_time'
  dateHired: string
  status: EmploymentStatus
  managerId?: string
  /** Broad payroll-relevant grouping, independent of Position — used to suggest (never restrict) Payroll Group assignment. */
  category: EmployeeCategory
}

/**
 * The unit/basis of the employee's base rate — distinct from `CompensationType` (the broader
 * catalog concept in Payroll Settings, e.g. Fixed/Commission-Based/Mixed) and from `PayrollGroup`
 * (how/when the employee is processed). An employee's `basicPay` is interpreted according to this
 * field: a monthly salary, a semi-monthly amount, a daily rate, an hourly rate, or a piece rate.
 */
export type PayRateType = 'monthly' | 'semi_monthly' | 'daily' | 'hourly' | 'output_based'

export interface EmployeeCompensation {
  basicPay: number
  payType: PayRateType
  /** Only meaningful when payType is 'output_based', e.g. "Per Unit", "Per Piece". */
  outputUnit?: string | null
  allowances: { label: string; amount: number }[]
}

export interface EmployeeBenefits {
  hmoPlan?: string
  leaveCreditsByType: Record<string, number>
}

export interface EmployeeGovernment {
  sssNo?: string
  philhealthNo?: string
  pagibigNo?: string
  tinNo?: string
  /** Overrides the company default Pag-IBIG employee contribution (see StatutoryConfig.pagibigEmployeeAmount) for this employee only. */
  pagibigEmployeeContribution?: number
}

export interface EmployeeBank {
  bankName?: string
  accountNumber?: string
}

export interface DocumentRecord {
  id: string
  name: string
  uploadedAt: string
  fileType: string
}

export interface AuditEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  details?: string
}

export interface CompensationHistoryEntry {
  id: string
  effectiveDate: string
  /** e.g. "Initial Hire", "Annual Merit Increase", "Promotion", "Adjustment", "Probationary to Regular" */
  type: string
  previousSalary: number | null
  newSalary: number
  approvedBy: string
}

export interface Employee {
  id: string
  companyId: string
  branchId: string
  employeeNumber: string
  personal: EmployeePersonal
  employment: EmployeeEmployment
  compensation: EmployeeCompensation
  benefits: EmployeeBenefits
  government: EmployeeGovernment
  bank: EmployeeBank
  documents: DocumentRecord[]
  history: AuditEntry[]
  compensationHistory: CompensationHistoryEntry[]
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export type ShiftType = 'day' | 'night' | 'split' | 'flexible'

export interface Schedule {
  id: string
  companyId: string
  name: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  breakMinutes?: number
  shiftType?: ShiftType
  gracePeriodMinutes?: number
  restDays?: number[]
  assignedEmployeeIds?: string[]
}

export type PayrollFrequency = 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' | 'custom'

export interface PayrollGroup {
  id: string
  companyId: string
  name: string
  description?: string
  status: 'active' | 'inactive'
  frequency: PayrollFrequency
  cutoffSchedule: string
  payDates: string
  compensationTypeId?: string
  workScheduleId?: string
  effectiveDate: string
  employeeIds: string[]
  /** Only meaningful when frequency is 'custom' — how many pay periods this group runs per month, for allocating monthly recurring deductions. Defaults to 2 when unset. */
  periodsPerMonth?: number
}

export type CompensationKind =
  | 'monthly_rate'
  | 'semi_monthly_rate'
  | 'daily_rate'
  | 'hourly_rate'
  | 'output_based'
  | 'commission_based'
  | 'mixed'

export interface OutputRateItem {
  label: string
  unit: string
  ratePerUnit: number
}

export interface CompensationTypeConfig {
  basicRate?: number
  outputRates?: OutputRateItem[]
  outputMin?: number
  outputMax?: number
  commissionType?: 'percentage' | 'fixed'
  commissionValue?: number
  commissionBasis?: string
  mixedComponents?: string[]
}

export interface CompensationType {
  id: string
  companyId: string
  name: string
  kind: CompensationKind
  config: CompensationTypeConfig
  isActive: boolean
}

export interface EarningConfig {
  id: string
  companyId: string
  name: string
  category: string
  calcType: 'fixed' | 'variable'
  taxable: boolean
  includedInPayroll: boolean
  isActive: boolean
}

export type DeductionCategory = 'government' | 'tax' | 'loan' | 'other'

/**
 * How a monthly recurring deduction is spread across a Payroll Group's periods within a month.
 * Configuration only — SSS/PhilHealth/Pag-IBIG/Tax/Loans are always actually computed as an equal
 * semi-monthly split by the payroll engine today; this drives the "Recurring Company Deductions"
 * preview shown in the computation breakdown, not the authoritative payroll math.
 */
export type DeductionAllocationMethod = 'equal_split' | 'specific_cutoff' | 'custom'

export interface DeductionConfig {
  id: string
  companyId: string
  name: string
  category: DeductionCategory
  calcType: 'fixed' | 'variable'
  recurrence: 'recurring' | 'one_time'
  isActive: boolean
  allocationMethod?: DeductionAllocationMethod
  /** For 'specific_cutoff': 1-based index of the period within the month that collects the full amount. */
  specificCutoffPeriod?: number
  /** For 'custom': percentage of the monthly amount collected per period, in order. Must sum to 100. */
  customSplitPercentages?: number[]
}

export interface PayrollRules {
  companyId: string
  roundingDecimalPrecision: number
  roundingMethod: 'nearest' | 'round_up' | 'round_down'
  lateGracePeriodMinutes: number
  lateDeductionMethod: 'per_minute' | 'fixed'
  latePerMinuteDeduction: number
  overtimePreApprovalRequired: boolean
  overtimeDefaultMultiplier: number
  overtimeRestDayMultiplier: number
  overtimeHolidayMultiplier: number
  absenceDailyRateBasis: 'basic_pay_divided_by_working_days' | 'fixed_daily_rate'
  absenceUnpaidHandling: 'deduct_daily_rate' | 'no_deduction'
  prorationNewEmployee: boolean
  prorationResignedEmployee: boolean
  prorationMidPeriodChanges: boolean
  adjustmentsRetroactiveAllowed: boolean
  adjustmentsManualAllowed: boolean
  adjustmentsApprovalRequired: boolean
}

export type AttendanceStatus = 'present' | 'late' | 'undertime' | 'absent'

export interface AttendanceRecord {
  id: string
  companyId: string
  employeeId: string
  scheduleId: string
  date: string
  timeIn: string | null
  timeOut: string | null
  status: AttendanceStatus
}

export interface AttendanceAdjustment {
  id: string
  companyId: string
  employeeId: string
  attendanceRecordId: string
  requestedTimeIn: string | null
  requestedTimeOut: string | null
  reason: string
  /** Optional categorization, e.g. "Missed Time In/Out", "System/Biometric Error" — set by the "File Adjustment" flow. */
  reasonCategory?: string
  status: ApprovalStatus
  requestedAt: string
  decidedBy?: string
  decidedAt?: string
}

export type HierarchyLevel = 'executive' | 'managerial' | 'rank_and_file'

export interface LeaveTypeTierCredits {
  executive: number
  managerial: number
  rank_and_file: number
}

export interface LeaveType {
  id: string
  companyId: string
  name: string
  defaultCredits: number
  description?: string
  isPaid?: boolean
  maxCarryOver?: number
  /** Annual credit allowance per employee hierarchy tier, configured via the Leave Type modal. */
  tierCredits?: LeaveTypeTierCredits
}

export interface LeaveRequest {
  id: string
  companyId: string
  employeeId: string
  leaveTypeId: string
  dateFrom: string
  dateTo: string
  reason?: string
  status: ApprovalStatus
  requestedAt: string
  decidedBy?: string
  decidedAt?: string
}

export type PayrollPeriodStatus = 'draft' | 'review' | 'approved' | 'finalized'

export interface PayrollPeriod {
  id: string
  companyId: string
  label: string
  startDate: string
  endDate: string
  payDate: string
  status: PayrollPeriodStatus
  /** When set, this run only includes employees currently assigned to this Payroll Group. Unset runs against every active employee (legacy behavior). */
  payrollGroupId?: string
}

export interface TaxBracket {
  min: number
  max: number | null
  rate: number
  baseTax: number
}

export interface SssBracket {
  minSalary: number
  maxSalary: number | null
  msc: number
  employeeShare: number
  employerShare: number
}

export interface StatutoryConfig {
  companyId: string
  sssBrackets: SssBracket[]
  philhealthRate: number
  philhealthEmployeeSharePercent: number
  philhealthEmployerSharePercent: number
  pagibigEmployeeAmount: number
  pagibigEmployerAmount: number
  taxBrackets: TaxBracket[]
}

export interface PayrollEarningLine {
  label: string
  amount: number
}

export interface PayrollDeductionLine {
  label: string
  amount: number
}

export interface PayrollLine {
  id: string
  companyId: string
  periodId: string
  employeeId: string
  basicPay: number
  earnings: PayrollEarningLine[]
  grossPay: number
  absentDays: number
  loanDeductions: PayrollDeductionLine[]
  otherDeductions: PayrollDeductionLine[]
  sssEmployeeShare: number
  sssEmployerShare: number
  philhealthEmployeeShare: number
  philhealthEmployerShare: number
  pagibigEmployeeShare: number
  pagibigEmployerShare: number
  withholdingTax: number
  totalDeductions: number
  netPay: number
}

export type LoanType =
  | 'sss_salary_loan'
  | 'sss_calamity_loan'
  | 'pagibig_multipurpose_loan'
  | 'pagibig_calamity_loan'
  | 'pagibig_mp2'
  | 'company_loan'
  | 'other_deduction'
export type LoanStatus = 'active' | 'completed' | 'suspended'

export interface LoanRepaymentEntry {
  id: string
  date: string
  payrollReference: string
  amount: number
  remainingBalanceAfter: number
}

export interface LoanRecord {
  id: string
  companyId: string
  employeeId: string
  type: LoanType
  label: string
  principal: number
  balance: number
  monthlyDeduction: number
  startDate: string
  status: LoanStatus
  repaymentHistory?: LoanRepaymentEntry[]
}

export interface ApiKey {
  id: string
  companyId: string
  label: string
  tokenPreview: string
  createdAt: string
}

export type WebhookEvent = 'payroll.finalized' | 'employee.created' | 'leave.approved'

export interface Webhook {
  id: string
  companyId: string
  url: string
  event: WebhookEvent
  createdAt: string
}

export type OvertimeType = 'regular' | 'rest_day_holiday' | 'night_diff'

export interface OvertimeRecord {
  id: string
  companyId: string
  employeeId: string
  date: string
  startTime: string
  endTime: string
  hours: number
  type: OvertimeType
  /** Rate multiplier applied on top of the hourly rate, e.g. 1.25 for Regular OT, 1.1 for Night Differential. */
  multiplier: number
  status: ApprovalStatus
  reason?: string
  requestedAt: string
  decidedBy?: string
  decidedAt?: string
}

export type BonusApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type BonusType = 'fixed_amount' | 'percentage' | 'performance_based' | 'output_based'
export type BonusTargetType = 'employee' | 'department' | 'company'
export type BonusFrequency = 'one_time' | 'recurring'

export interface BonusIncentive {
  id: string
  companyId: string
  name: string
  bonusType: BonusType
  targetType: BonusTargetType
  targetEmployeeId?: string
  targetDepartment?: string
  /** Peso value for fixed_amount/performance_based/output_based; percentage points (e.g. 10 = 10%) of the employee's monthly-equivalent basic pay for 'percentage'. */
  amount: number
  /** Free-text label of the targeted cutoff/payroll run, e.g. "December 2026". The payroll engine pulls in approved bonuses whose label matches the PayrollPeriod being run. */
  periodLabel: string
  taxable: boolean
  frequency: BonusFrequency
  notes?: string
  status: BonusApprovalStatus
  createdAt: string
  decidedBy?: string
  decidedAt?: string
}

export type ThirteenthMonthRunStatus = 'draft' | 'finalized'

export interface ThirteenthMonthRun {
  id: string
  companyId: string
  year: number
  generationDate: string
  /** Free-text payroll run label this batch pays out on, matched against PayrollPeriod.label the same way BonusIncentive.periodLabel is. */
  payoutPeriodLabel: string
  status: ThirteenthMonthRunStatus
  createdAt: string
  finalizedAt?: string
}

export interface ThirteenthMonthLine {
  id: string
  companyId: string
  runId: string
  employeeId: string
  annualBasicEarned: number
  /** Out of 12 — less than 12 when the employee was hired mid-year (statutory proration). */
  monthsCredited: number
  thirteenthMonthPay: number
}
