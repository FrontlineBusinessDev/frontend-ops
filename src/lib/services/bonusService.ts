import { getEmployees } from '@/lib/services/employeeService'
import { db } from '@/mock-data'
import type { BonusApprovalStatus, BonusFrequency, BonusIncentive, BonusPayoutMode, BonusTargetType, BonusType, SessionUser } from '@/types/domain'

export async function getBonuses(session: SessionUser): Promise<BonusIncentive[]> {
  return db.bonuses.filter((b) => b.companyId === session.companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export interface CreateBonusInput {
  name: string
  bonusType: BonusType
  targetType: BonusTargetType
  targetEmployeeId?: string
  targetDepartment?: string
  amount: number
  periodLabel: string
  taxable: boolean
  frequency: BonusFrequency
  payoutMode: BonusPayoutMode
  notes?: string
  status: BonusApprovalStatus
}

export async function createBonus(session: SessionUser, input: CreateBonusInput): Promise<BonusIncentive> {
  const bonus: BonusIncentive = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    createdAt: new Date().toISOString(),
    ...input,
  }
  db.bonuses.unshift(bonus)
  return bonus
}

/** Edits a bonus that hasn't been decided yet (Draft or Pending Approval); approved/rejected bonuses are locked. */
export async function updateBonus(session: SessionUser, bonusId: string, input: CreateBonusInput): Promise<void> {
  const bonus = db.bonuses.find((b) => b.id === bonusId && b.companyId === session.companyId)
  if (!bonus || (bonus.status !== 'draft' && bonus.status !== 'pending')) return
  Object.assign(bonus, input)
}

export async function submitBonusForApproval(session: SessionUser, bonusId: string): Promise<void> {
  const bonus = db.bonuses.find((b) => b.id === bonusId && b.companyId === session.companyId)
  if (!bonus || bonus.status !== 'draft') return
  bonus.status = 'pending'
}

export async function decideBonus(
  session: SessionUser,
  bonusId: string,
  decision: Extract<BonusApprovalStatus, 'approved' | 'rejected'>,
): Promise<void> {
  const bonus = db.bonuses.find((b) => b.id === bonusId && b.companyId === session.companyId)
  if (!bonus) return
  bonus.status = decision
  bonus.decidedBy = session.name
  bonus.decidedAt = new Date().toISOString()
}

/** Distinct departments across the company's employees — used to populate the "Employee Group / Department" target select. */
export async function getDepartments(session: SessionUser): Promise<string[]> {
  const employees = await getEmployees(session)
  return [...new Set(employees.map((e) => e.employment.department))].sort()
}
