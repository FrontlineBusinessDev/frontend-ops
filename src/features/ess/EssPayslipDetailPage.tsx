import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { PayslipCard } from '@/features/payslips/components/PayslipCard'
import { db } from '@/mock-data'

export function EssPayslipDetailPage() {
  const { lineId } = useParams<{ lineId: string }>()
  const { employee, isLoading } = useSelfEmployee()

  if (isLoading) return <Skeleton className="h-96" />
  if (!employee) return <p className="text-sm text-muted-foreground">No employee record linked to this account.</p>

  const line = db.payrollLines.find((l) => l.id === lineId && l.employeeId === employee.id)
  if (!line) return <p className="text-sm text-muted-foreground">Payslip not found.</p>

  const period = db.payrollPeriods.find((p) => p.id === line.periodId)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/ess/payslips" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to my payslips
        </Link>
        <Button size="sm" variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Print / Download
        </Button>
      </div>

      <PayslipCard employee={employee} period={period} line={line} />
    </div>
  )
}
