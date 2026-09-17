import { PLAN_DETAILS } from '@/lib/plans'
import { db } from '@/mock-data'
import type { PlanTier, SessionUser } from '@/types/domain'

export interface SubscriptionUsage {
  planTier: PlanTier
  employeeCount: number
  userCount: number
  employeeLimit: number | null
  userLimit: number | null
}

export async function getSubscriptionUsage(session: SessionUser): Promise<SubscriptionUsage> {
  const company = db.companies.find((c) => c.id === session.companyId)
  const planTier = company?.planTier ?? 'starter'
  const details = PLAN_DETAILS[planTier]

  return {
    planTier,
    employeeCount: db.employees.filter((e) => e.companyId === session.companyId && e.employment.status !== 'archived').length,
    userCount: db.users.filter((u) => u.companyId === session.companyId).length,
    employeeLimit: details.employeeLimit,
    userLimit: details.userLimit,
  }
}

export async function upgradePlan(session: SessionUser, planTier: PlanTier): Promise<void> {
  const company = db.companies.find((c) => c.id === session.companyId)
  if (!company) return
  company.planTier = planTier
}
