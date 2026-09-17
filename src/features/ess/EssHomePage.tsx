import { CalendarDays, CreditCard, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSelfEmployee } from '@/features/ess/hooks/useSelfEmployee'
import { useSession } from '@/hooks/useSession'
import { db } from '@/mock-data'
import { formatCurrency } from '@/lib/utils/format'

export function EssHomePage() {
  const { employee, isLoading } = useSelfEmployee()
  const { user } = useSession()

  if (isLoading) return <Skeleton className="h-72" />
  if (!employee) {
    return <EmptyState title="No employee record linked to this account" description="Ask HR to link your user account to your employee profile." />
  }

  const latestFinalizedLine = db.payrollLines
    .filter((l) => l.employeeId === employee.id && db.payrollPeriods.find((p) => p.id === l.periodId)?.status === 'finalized')
    .at(-1)
  const activeLoans = db.loans.filter((l) => l.employeeId === employee.id && l.status === 'active')
  const upcomingLeave = db.leaveRequests.filter((r) => r.employeeId === employee.id && r.status === 'approved' && r.dateFrom >= new Date().toISOString().slice(0, 10))

  return (
    <div className="space-y-5">
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} description="Your personal payroll and workforce summary." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/ess/payslips">
          <Card className="p-5 transition-shadow hover:shadow-soft-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ReceiptText className="size-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Latest Net Pay</p>
            </div>
            <p className="mt-2 font-display text-xl font-semibold">
              {latestFinalizedLine ? formatCurrency(latestFinalizedLine.netPay) : '—'}
            </p>
          </Card>
        </Link>

        <Link to="/ess/leave">
          <Card className="p-5 transition-shadow hover:shadow-soft-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Upcoming Leave</p>
            </div>
            <p className="mt-2 font-display text-xl font-semibold">{upcomingLeave.length} approved</p>
          </Card>
        </Link>

        <Link to="/ess/loans">
          <Card className="p-5 transition-shadow hover:shadow-soft-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="size-4" />
              <p className="text-xs font-medium uppercase tracking-wide">Active Loans</p>
            </div>
            <p className="mt-2 font-display text-xl font-semibold">{activeLoans.length}</p>
          </Card>
        </Link>
      </div>

      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          Leave credits remaining: {Object.entries(employee.benefits.leaveCreditsByType).map(([type, credits]) => `${type} (${credits}d)`).join(', ')}
        </p>
      </Card>
    </div>
  )
}
