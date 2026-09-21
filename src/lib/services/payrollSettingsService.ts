import { db } from '@/mock-data'
import type {
  CompensationType,
  DeductionConfig,
  EarningConfig,
  PayrollGroup,
  PayrollRules,
  SessionUser,
} from '@/types/domain'

// ---- Compensation Types ----------------------------------------------------

export async function getCompensationTypes(session: SessionUser): Promise<CompensationType[]> {
  return db.compensationTypes.filter((c) => c.companyId === session.companyId)
}

export type CompensationTypeInput = Omit<CompensationType, 'id' | 'companyId'>

export async function createCompensationType(session: SessionUser, input: CompensationTypeInput): Promise<CompensationType> {
  const record: CompensationType = { id: crypto.randomUUID(), companyId: session.companyId, ...input }
  db.compensationTypes.push(record)
  return record
}

export async function updateCompensationType(
  session: SessionUser,
  id: string,
  updates: Partial<CompensationTypeInput>,
): Promise<void> {
  const record = db.compensationTypes.find((c) => c.id === id && c.companyId === session.companyId)
  if (!record) return
  Object.assign(record, updates)
}

// ---- Payroll Groups ---------------------------------------------------------

export async function getPayrollGroups(session: SessionUser): Promise<PayrollGroup[]> {
  return db.payrollGroups.filter((g) => g.companyId === session.companyId)
}

export type PayrollGroupInput = Omit<PayrollGroup, 'id' | 'companyId' | 'employeeIds'>

export async function createPayrollGroup(session: SessionUser, input: PayrollGroupInput): Promise<PayrollGroup> {
  const record: PayrollGroup = { id: crypto.randomUUID(), companyId: session.companyId, employeeIds: [], ...input }
  db.payrollGroups.push(record)
  return record
}

export async function updatePayrollGroup(
  session: SessionUser,
  id: string,
  updates: Partial<PayrollGroupInput>,
): Promise<void> {
  const record = db.payrollGroups.find((g) => g.id === id && g.companyId === session.companyId)
  if (!record) return
  Object.assign(record, updates)
}

export async function setPayrollGroupStatus(session: SessionUser, id: string, status: PayrollGroup['status']): Promise<void> {
  const record = db.payrollGroups.find((g) => g.id === id && g.companyId === session.companyId)
  if (!record) return
  record.status = status
}

/** Every employee belongs to at most one active Payroll Group — enforced structurally by always stripping them from every other group in the company before adding. */
function stripEmployeeFromOtherGroups(session: SessionUser, employeeId: string, exceptGroupId?: string) {
  for (const group of db.payrollGroups) {
    if (group.companyId !== session.companyId || group.id === exceptGroupId) continue
    group.employeeIds = group.employeeIds.filter((id) => id !== employeeId)
  }
}

/** Replaces a Payroll Group's full membership list in one operation (used by the Assign Employees dialog's bulk save). */
export async function updatePayrollGroupMembership(session: SessionUser, groupId: string, employeeIds: string[]): Promise<void> {
  const group = db.payrollGroups.find((g) => g.id === groupId && g.companyId === session.companyId)
  if (!group) return
  for (const employeeId of employeeIds) stripEmployeeFromOtherGroups(session, employeeId, groupId)
  group.employeeIds = employeeIds
}

/** Moves a single employee to `groupId` (or unassigns entirely when `groupId` is null). Used by reassign/remove actions and the Employee profile's Payroll Group field. */
export async function setEmployeePayrollGroup(session: SessionUser, employeeId: string, groupId: string | null): Promise<void> {
  stripEmployeeFromOtherGroups(session, employeeId, groupId ?? undefined)
  if (!groupId) return
  const group = db.payrollGroups.find((g) => g.id === groupId && g.companyId === session.companyId)
  if (group && !group.employeeIds.includes(employeeId)) group.employeeIds.push(employeeId)
}

// ---- Earnings ----------------------------------------------------------------

export async function getEarningConfigs(session: SessionUser): Promise<EarningConfig[]> {
  return db.earningConfigs.filter((e) => e.companyId === session.companyId)
}

export type EarningConfigInput = Omit<EarningConfig, 'id' | 'companyId'>

export async function createEarningConfig(session: SessionUser, input: EarningConfigInput): Promise<EarningConfig> {
  const record: EarningConfig = { id: crypto.randomUUID(), companyId: session.companyId, ...input }
  db.earningConfigs.push(record)
  return record
}

export async function updateEarningConfig(
  session: SessionUser,
  id: string,
  updates: Partial<EarningConfigInput>,
): Promise<void> {
  const record = db.earningConfigs.find((e) => e.id === id && e.companyId === session.companyId)
  if (!record) return
  Object.assign(record, updates)
}

// ---- Deductions ----------------------------------------------------------------

export async function getDeductionConfigs(session: SessionUser): Promise<DeductionConfig[]> {
  return db.deductionConfigs.filter((d) => d.companyId === session.companyId)
}

export type DeductionConfigInput = Omit<DeductionConfig, 'id' | 'companyId'>

export async function createDeductionConfig(session: SessionUser, input: DeductionConfigInput): Promise<DeductionConfig> {
  const record: DeductionConfig = { id: crypto.randomUUID(), companyId: session.companyId, ...input }
  db.deductionConfigs.push(record)
  return record
}

export async function updateDeductionConfig(
  session: SessionUser,
  id: string,
  updates: Partial<DeductionConfigInput>,
): Promise<void> {
  const record = db.deductionConfigs.find((d) => d.id === id && d.companyId === session.companyId)
  if (!record) return
  Object.assign(record, updates)
}

// ---- Payroll Rules (single record per company) --------------------------------

export async function getPayrollRules(session: SessionUser): Promise<PayrollRules | undefined> {
  return db.payrollRules.find((r) => r.companyId === session.companyId)
}

export async function updatePayrollRules(session: SessionUser, updates: Partial<Omit<PayrollRules, 'companyId'>>): Promise<void> {
  const record = db.payrollRules.find((r) => r.companyId === session.companyId)
  if (!record) return
  Object.assign(record, updates)
}
