import { Card } from '@/components/ui/Card'
import { getLeaveBalance } from '@/lib/services/leaveService'
import type { Employee, LeaveType } from '@/types/domain'

export function LeaveTypesPanel({ leaveTypes, employees }: { leaveTypes: LeaveType[]; employees: Employee[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {leaveTypes.map((leaveType) => {
        const totalCredits = employees.reduce((sum, e) => sum + (e.benefits.leaveCreditsByType[leaveType.name] ?? 0), 0)
        const totalUsed = employees.reduce((sum, e) => sum + getLeaveBalance(e.id, leaveType.id).used, 0)

        return (
          <Card key={leaveType.id}>
            <Card.Header>
              <Card.Title>{leaveType.name}</Card.Title>
            </Card.Header>
            <Card.Body className="space-y-1 pt-2 text-sm text-muted-foreground">
              <p>{leaveType.defaultCredits} days credited per employee by default</p>
              <p>
                {totalUsed} of {totalCredits} total company days used this year
              </p>
            </Card.Body>
          </Card>
        )
      })}
    </div>
  )
}
