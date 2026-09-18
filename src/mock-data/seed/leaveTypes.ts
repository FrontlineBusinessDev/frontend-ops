import type { LeaveType } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

const TEMPLATE: Omit<LeaveType, 'id' | 'companyId'>[] = [
  {
    name: 'Vacation Leave',
    defaultCredits: 15,
    description: 'Planned time off for rest and personal matters.',
    isPaid: true,
    maxCarryOver: 5,
    tierCredits: { executive: 20, managerial: 15, rank_and_file: 12 },
  },
  {
    name: 'Sick Leave',
    defaultCredits: 10,
    description: 'Time off for illness or medical appointments.',
    isPaid: true,
    maxCarryOver: 0,
    tierCredits: { executive: 15, managerial: 10, rank_and_file: 10 },
  },
  {
    name: 'Emergency Leave',
    defaultCredits: 5,
    description: 'Unplanned time off for urgent personal or family matters.',
    isPaid: true,
    maxCarryOver: 0,
    tierCredits: { executive: 5, managerial: 5, rank_and_file: 5 },
  },
  {
    name: 'Maternity/Paternity Leave',
    defaultCredits: 7,
    description: 'Statutory leave for childbirth and immediate childcare, per PH labor law.',
    isPaid: true,
    maxCarryOver: 0,
    tierCredits: { executive: 105, managerial: 105, rank_and_file: 105 },
  },
]

export const leaveTypes: LeaveType[] = companies.flatMap((company) =>
  TEMPLATE.map((t) => ({
    id: `${company.id}_lt_${t.name.split(/[\s/]/)[0].toLowerCase()}`,
    companyId: company.id,
    ...t,
  })),
)
