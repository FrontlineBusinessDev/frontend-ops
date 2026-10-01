import type { LoanTypeConfig } from '@/types/domain'
import { companies } from '@/mock-data/seed/companies'

type Seed = Omit<LoanTypeConfig, 'id' | 'companyId' | 'isActive' | 'builtIn'>

/** The loan types payroll collects out of the box. Each is collected per its entry in Payroll Settings → Deductions (see LOAN_CONFIG_NAME). */
const BUILT_IN: Seed[] = [
  { key: 'sss_salary_loan', label: 'SSS Loan – Salary', provider: 'SSS', description: 'Salary loan from SSS, repaid through monthly payroll deduction.', typicalTerm: '24 months', typicalAmount: 'Up to 2 months of average salary credit' },
  { key: 'sss_calamity_loan', label: 'SSS Loan – Calamity', provider: 'SSS', description: 'Emergency loan for members in areas declared under a state of calamity.', typicalTerm: '24 months', typicalAmount: 'Up to 1 month of average salary credit' },
  { key: 'pagibig_multipurpose_loan', label: 'Pag-IBIG Loan – Multi-Purpose', provider: 'Pag-IBIG', description: 'Multi-Purpose Loan (MPL) for members with enough contributions.', typicalTerm: '24 months', typicalAmount: 'Up to 80% of total accumulated value' },
  { key: 'pagibig_calamity_loan', label: 'Pag-IBIG Loan – Calamity', provider: 'Pag-IBIG', description: 'Calamity Loan for members affected by a declared calamity.', typicalTerm: '24 months', typicalAmount: 'Up to 80% of total accumulated value' },
  { key: 'pagibig_mp2', label: 'Pag-IBIG MP2 Savings', provider: 'Pag-IBIG', description: 'Voluntary Modified Pag-IBIG 2 (MP2) savings program deducted from pay.', typicalTerm: '5-year maturity', typicalAmount: 'From ₱500 per month' },
  { key: 'company_loan', label: 'Company Loan / Emergency Advance', provider: 'Company', description: 'Company-provided loan or cash advance, repaid through payroll.', typicalTerm: '3–12 months', typicalAmount: 'Up to 1 month of basic pay' },
  { key: 'other_deduction', label: 'Other Installment', provider: 'Company', description: 'Any other amount repaid in installments. One-off or monthly charges (uniforms, equipment, co-pays) belong under Deductions instead.', typicalTerm: 'As agreed', typicalAmount: 'As agreed' },
]

/** A sample custom type, to show that companies can add their own. */
const CUSTOM_SAMPLE: Seed = {
  key: 'custom_salary_advance',
  label: 'Salary Advance',
  provider: 'Company',
  description: 'Short advance on the next salary, repaid in 2–3 pay runs.',
  typicalTerm: '1–3 months',
  typicalAmount: 'Up to 50% of monthly basic pay',
}

export const loanTypes: LoanTypeConfig[] = companies.flatMap((company) => [
  ...BUILT_IN.map((t) => ({ ...t, id: `lt_${company.id}_${t.key}`, companyId: company.id, isActive: true, builtIn: true })),
  { ...CUSTOM_SAMPLE, id: `lt_${company.id}_${CUSTOM_SAMPLE.key}`, companyId: company.id, isActive: true },
])
