import type { Employee, LoanRecord, LoanRepaymentEntry, LoanType } from '@/types/domain'

const LOAN_TEMPLATES: { type: LoanType; label: string; principal: number; months: number }[] = [
  { type: 'sss_salary_loan', label: 'SSS Salary Loan', principal: 24000, months: 24 },
  { type: 'pagibig_multipurpose_loan', label: 'Pag-IBIG Multi-Purpose Loan', principal: 18000, months: 18 },
  { type: 'company_loan', label: 'Company Emergency Loan', principal: 10000, months: 10 },
  { type: 'pagibig_mp2', label: 'Pag-IBIG MP2 Savings', principal: 24000, months: 24 },
  { type: 'other_deduction', label: 'Uniform Deduction', principal: 3000, months: 6 },
]

function pad(n: number) {
  return String(n).padStart(4, '0')
}

/** Semi-monthly payroll reference labels, counting back from `startDate`, matching this app's payroll period naming convention. */
function buildRepaymentHistory(
  employeeId: string,
  startDate: Date,
  monthsPaid: number,
  monthlyDeduction: number,
  principal: number,
): LoanRepaymentEntry[] {
  const entries: LoanRepaymentEntry[] = []
  let remaining = principal

  for (let i = 0; i < monthsPaid; i++) {
    const periodDate = new Date(startDate)
    periodDate.setMonth(periodDate.getMonth() + i)
    remaining = Math.max(0, remaining - monthlyDeduction)

    entries.push({
      id: `${employeeId}_loan_repay_${pad(i + 1)}`,
      date: periodDate.toISOString().slice(0, 10),
      payrollReference: `Payroll ${periodDate.toLocaleString('en-PH', { month: 'short' })} 16–30, ${periodDate.getFullYear()}`,
      amount: monthlyDeduction,
      remainingBalanceAfter: remaining,
    })
  }

  return entries
}

/** Roughly every 4th active employee gets one active loan/deduction, at a random point in its repayment schedule. */
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

      const isSuspended = idx % 12 === 8 && balance > 0

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
        status: balance > 0 ? (isSuspended ? 'suspended' : 'active') : 'completed',
        repaymentHistory: buildRepaymentHistory(employee.id, startDate, monthsPaid, monthlyDeduction, template.principal),
      })
    })

  return loans
}
