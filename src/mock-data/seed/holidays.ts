import type { Holiday } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

const TEMPLATE: { name: string; date: string; type: Holiday['type'] }[] = [
  { name: "New Year's Day", date: '2026-01-01', type: 'regular' },
  { name: 'Araw ng Kagitingan', date: '2026-04-09', type: 'regular' },
  { name: 'Independence Day', date: '2026-06-12', type: 'regular' },
  { name: 'Ninoy Aquino Day', date: '2026-08-21', type: 'special_non_working' },
  { name: 'Bonifacio Day', date: '2026-11-30', type: 'regular' },
  { name: 'Christmas Day', date: '2026-12-25', type: 'regular' },
]

export const holidays: Holiday[] = companies.flatMap((company) =>
  TEMPLATE.map((h, idx) => ({
    id: `${company.id}_hol_${idx}`,
    companyId: company.id,
    name: h.name,
    date: h.date,
    type: h.type,
  })),
)
