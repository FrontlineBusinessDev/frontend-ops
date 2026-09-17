import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEmployee } from '@/features/employees/hooks/useEmployee'
import { usePayrollPeriods } from '@/features/payroll/hooks/usePayroll'
import { PayslipCard } from '@/features/payslips/components/PayslipCard'
import { useSession } from '@/hooks/useSession'
import { getPayrollLine } from '@/lib/services/payrollService'
import type { PayrollLine } from '@/types/domain'

export function PayslipDetailPage() {
  const { lineId } = useParams<{ lineId: string }>()
  const { user } = useSession()
  const [line, setLine] = useState<PayrollLine | null | undefined>(undefined)
  const { periods } = usePayrollPeriods()

  useEffect(() => {
    if (!lineId) return
    setLine(undefined)
    getPayrollLine(user, lineId).then((result) => setLine(result ?? null))
  }, [user, lineId])

  const { employee } = useEmployee(line?.employeeId)
  const period = periods.find((p) => p.id === line?.periodId)

  if (line === undefined || (line && !employee)) return <Skeleton className="h-96" />
  if (!line || !employee) return <p className="text-sm text-muted-foreground">Payslip not found.</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/payslips" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to payslips
        </Link>
        <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Print / Download
        </Button>
      </div>

      <PayslipCard employee={employee} period={period} line={line} />
    </div>
  )
}
