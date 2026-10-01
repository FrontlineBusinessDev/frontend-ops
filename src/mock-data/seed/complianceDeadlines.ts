import type { ComplianceDeadline } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

/**
 * Default government-filing deadlines per company. Due days are illustrative starting points — real SSS
 * dates vary by employer ID — and are editable under Company & Payroll Settings → Payroll Calendar.
 * `{period}` in a description is replaced with the month the remittance covers.
 */
export const complianceDeadlines: ComplianceDeadline[] = companies.flatMap((company) => {
  const id = (key: string) => `cd_${company.id}_${key}`
  const base = { companyId: company.id, enabled: true, remindDaysBefore: 7 }
  return [
    { ...base, id: id('sss'), name: 'SSS Contribution Due', category: 'SSS', description: 'Remit the {period} SSS premiums (R-3 / R-5).', frequency: 'monthly', dueDay: 10, to: '/reports/sss-contribution' },
    { ...base, id: id('1601c'), name: 'File BIR Form 1601-C', category: 'BIR', description: 'Monthly withholding tax on compensation for {period}.', frequency: 'monthly', dueDay: 10, to: '/reports/bir-1601c' },
    { ...base, id: id('pagibig'), name: 'Pag-IBIG Contribution Due', category: 'Pag-IBIG', description: 'Remit the {period} Pag-IBIG contributions and loan amortizations.', frequency: 'monthly', dueDay: 10, to: '/reports/pagibig-contribution' },
    { ...base, id: id('philhealth'), name: 'PhilHealth Contribution Due', category: 'PhilHealth', description: 'Remit the {period} PhilHealth premiums.', frequency: 'monthly', dueDay: 15, to: '/reports/philhealth-contribution' },
    { ...base, id: id('13th'), name: '13th Month Pay Deadline', category: 'Payroll', description: 'Release 13th month pay to all rank-and-file employees (due on or before December 24).', frequency: 'yearly', dueMonth: 11, dueDay: 24, remindDaysBefore: 30, to: '/thirteenth-month-pay' },
    { ...base, id: id('2316'), name: 'Issue BIR Form 2316', category: 'BIR', description: 'Give employees their annual certificate of compensation payment and tax withheld.', frequency: 'yearly', dueMonth: 0, dueDay: 31, remindDaysBefore: 30, to: '/reports/bir-2316' },
    {
      ...base,
      id: id('permit'),
      name: "Renew Mayor's Permit",
      category: 'Other',
      description: 'Renew the business permit at the city hall before the January 20 deadline.',
      frequency: 'yearly',
      dueMonth: 0,
      dueDay: 20,
      remindDaysBefore: 30,
      custom: true,
    },
  ] satisfies ComplianceDeadline[]
})
