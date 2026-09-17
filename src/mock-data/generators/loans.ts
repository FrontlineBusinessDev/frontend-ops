import type { Employee, LoanRecord, LoanType } from '@/types/domain'

const LOAN_TEMPLATES: { type: LoanType; label: string; principal: number; months: number }[] = [
  { type: 'sss_loan', label: 'SSS Salary Loan', principal: 24000, months: 24 },
  { type: 'pagibig_loan', label: 'Pag-IBIG Multi-Purpose Loan', principal: 18000, months: 18 },
  { type: 'company_loan', label: 'Company Emergency Loan', principal: 10000, months: 10 },
]

/** Roughly every 4th active employee gets one active loan, at a random point in its repayment schedule. */
export function generateLoans(employees: Employee[]): LoanRecord[] {
  const loans: LoanRecord[] = []

  employees
    .filter((e) => e.employment.status === 'active')
    .forEach((employee, idx) => {
      if (idx % 4 !== 0) return

      const template = LOAN_TEMPLATES[idx % LOAN_TEMPLATES.length]
      const monthlyDeduction = Math.round(template.principal / template.months)
      const monthsPaid = 1 + (idx % Math.max(1, template.months - 2))
      const balance = Math.max(0, template.principal - monthlyDeduction * monthsPaid)
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - monthsPaid)

      loans.push({
        id: `${employee.id}_loan`,
        companyId: employee.companyId,
        employeeId: employee.id,
        type: template.type,
        label: template.label,
        principal: template.principal,
        balance,
        monthlyDeduction,
        startDate: startDate.toISOString().slice(0, 10),
        status: balance > 0 ? 'active' : 'completed',
      })
    })

  return loans
}
