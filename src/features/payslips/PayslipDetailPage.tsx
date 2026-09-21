import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEmployee } from '@/features/employees/hooks/useEmployee'
import { usePayrollPeriods } from '@/features/payroll/hooks/usePayroll'
import { PayslipCard } from '@/features/payslips/components/PayslipCard'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { findEmployeePayrollGroup } from '@/lib/payroll/groupAssignment'
import { getLoans } from '@/lib/services/loanService'
import { getPayrollLine } from '@/lib/services/payrollService'
import { getDeductionConfigs, getPayrollGroups } from '@/lib/services/payrollSettingsService'
import type { DeductionConfig, LoanRecord, PayrollGroup, PayrollLine } from '@/types/domain'

export function PayslipDetailPage() {
  const { lineId } = useParams<{ lineId: string }>()
  const { user } = useSession()
  const { company } = useTenant()
  const [line, setLine] = useState<PayrollLine | null | undefined>(undefined)
  const [deductionConfigs, setDeductionConfigs] = useState<DeductionConfig[]>([])
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [payrollGroups, setPayrollGroups] = useState<PayrollGroup[]>([])
  const { periods } = usePayrollPeriods()

  useEffect(() => {
    if (!lineId) return
    setLine(undefined)
    getPayrollLine(user, lineId).then((result) => setLine(result ?? null))
    getDeductionConfigs(user).then(setDeductionConfigs)
    getLoans(user).then(setLoans)
    getPayrollGroups(user).then(setPayrollGroups)
  }, [user, lineId])

  const { employee } = useEmployee(line?.employeeId)
  const period = periods.find((p) => p.id === line?.periodId)
  const payrollGroup = employee ? findEmployeePayrollGroup(payrollGroups, employee.id) : undefined

  if (line === undefined || (line && !employee)) return <Skeleton className="h-96" />
  if (!line || !employee) return <p className="text-sm text-muted-foreground">Payslip not found.</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/payslips" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to payslips
        </Link>
        <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Print / Download
        </Button>
      </div>

      <PayslipCard
        company={company}
        employee={employee}
        period={period}
        payrollGroup={payrollGroup}
        line={line}
        deductionConfigs={deductionConfigs}
        loans={loans.filter((l) => l.employeeId === employee.id)}
      />
    </div>
  )
}
