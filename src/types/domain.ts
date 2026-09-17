export type Role =
  | 'super_admin'
  | 'company_admin'
  | 'hr_admin'
  | 'payroll_admin'
  | 'manager'
  | 'employee'

export type PlanTier = 'starter' | 'growth' | 'professional'

export interface Company {
  id: string
  name: string
  logoUrl?: string
  planTier: PlanTier
  timezone: string
  payrollFrequency: 'semi_monthly' | 'monthly' | 'weekly'
  createdAt: string
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

export interface EmployeeEmployment {
  position: string
  department: string
  employmentType: 'regular' | 'probationary' | 'contractual' | 'part_time'
  dateHired: string
  status: EmploymentStatus
  managerId?: string
}

export interface EmployeeCompensation {
  basicPay: number
  payType: 'monthly' | 'daily' | 'hourly'
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
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Schedule {
  id: string
  companyId: string
  name: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
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
  status: ApprovalStatus
  requestedAt: string
  decidedBy?: string
  decidedAt?: string
}

export interface LeaveType {
  id: string
  companyId: string
  name: string
  defaultCredits: number
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
}

export interface TaxBracket {
  min: number
  max: number | null
  rate: number
  baseTax: number
}

export interface StatutoryConfig {
  companyId: string
  sssEmployeeRate: number
  sssEmployerRate: number
  philhealthRate: number
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

export type LoanType = 'sss_loan' | 'pagibig_loan' | 'company_loan' | 'other'
export type LoanStatus = 'active' | 'completed'

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
