import type { LeaveType } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

const TEMPLATE: { name: string; defaultCredits: number }[] = [
  { name: 'Vacation Leave', defaultCredits: 15 },
  { name: 'Sick Leave', defaultCredits: 10 },
  { name: 'Emergency Leave', defaultCredits: 5 },
]

export const leaveTypes: LeaveType[] = companies.flatMap((company) =>
  TEMPLATE.map((t) => ({
    id: `${company.id}_lt_${t.name.split(' ')[0].toLowerCase()}`,
    companyId: company.id,
    name: t.name,
    defaultCredits: t.defaultCredits,
  })),
)
