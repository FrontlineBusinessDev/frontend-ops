import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PlanGate } from '@/components/ui/PlanGate'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  useAttendanceSummary,
  useEmployeeMasterlist,
  useLeaveSummary,
  usePayrollPeriodOptions,
  usePayrollRegister,
} from '@/features/reports/hooks/useReports'
import { useSubscriptionUsage } from '@/features/subscription/hooks/useSubscription'
import { formatCurrency, formatDate } from '@/lib/utils/format'

function fullName(personal: { firstName: string; lastName: string }) {
  return `${personal.firstName} ${personal.lastName}`
}

function PayrollRegisterTab() {
  const { periods, isLoading: periodsLoading } = usePayrollPeriodOptions()
  const [periodId, setPeriodId] = useState<string | undefined>(undefined)
  const { report, isLoading } = usePayrollRegister(periodId ?? periods[0]?.id)

  if (periodsLoading) return <Skeleton className="h-72" />
  if (periods.length === 0) return <EmptyState title="No payroll periods yet" description="Run a payroll period first to see the register here." />

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select
          value={periodId ?? periods[0]?.id}
          onValueChange={setPeriodId}
          options={periods.map((p) => ({ value: p.id, label: p.label }))}
        />
      </div>

      {isLoading || !report ? (
        <Skeleton className="h-72" />
      ) : report.rows.length === 0 ? (
        <EmptyState title="No payroll lines" description="This period hasn't been run yet." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gross Pay</p>
              <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(report.totals.grossPay)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Deductions</p>
              <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(report.totals.totalDeductions)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net Pay</p>
              <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(report.totals.netPay)}</p>
            </Card>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>SSS</TableHead>
                <TableHead>PhilHealth</TableHead>
                <TableHead>Pag-IBIG</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Total Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.employee.id}>
                  <TableCell className="font-medium">{fullName(row.employee.personal)}</TableCell>
                  <TableCell>{formatCurrency(row.grossPay)}</TableCell>
                  <TableCell>{formatCurrency(row.sssEmployeeShare)}</TableCell>
                  <TableCell>{formatCurrency(row.philhealthEmployeeShare)}</TableCell>
                  <TableCell>{formatCurrency(row.pagibigEmployeeShare)}</TableCell>
                  <TableCell>{formatCurrency(row.withholdingTax)}</TableCell>
                  <TableCell>{formatCurrency(row.totalDeductions)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(row.netPay)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}

function AttendanceSummaryTab() {
  const { rows, isLoading } = useAttendanceSummary()

  if (isLoading) return <Skeleton className="h-72" />
  if (rows.length === 0) return <EmptyState title="No attendance data yet" />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Present</TableHead>
          <TableHead>Late</TableHead>
          <TableHead>Undertime</TableHead>
          <TableHead>Absent</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.employee.id}>
            <TableCell className="font-medium">{fullName(row.employee.personal)}</TableCell>
            <TableCell>{row.present}</TableCell>
            <TableCell>{row.late}</TableCell>
            <TableCell>{row.undertime}</TableCell>
            <TableCell>{row.absent}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function LeaveSummaryTab() {
  const { rows, isLoading } = useLeaveSummary()

  if (isLoading) return <Skeleton className="h-72" />
  if (rows.length === 0) return <EmptyState title="No approved leave yet" description="Approved leave requests will be summarized here by type." />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Leave Type</TableHead>
          <TableHead>Days Taken</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={`${row.employee.id}-${row.leaveTypeName}-${idx}`}>
            <TableCell className="font-medium">{fullName(row.employee.personal)}</TableCell>
            <TableCell>{row.leaveTypeName}</TableCell>
            <TableCell>{row.daysTaken}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MasterlistTab() {
  const { employees, isLoading } = useEmployeeMasterlist()

  if (isLoading) return <Skeleton className="h-72" />
  if (employees.length === 0) return <EmptyState title="No employees yet" />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Date Hired</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((e) => (
          <TableRow key={e.id}>
            <TableCell>{e.employeeNumber}</TableCell>
            <TableCell className="font-medium">{fullName(e.personal)}</TableCell>
            <TableCell>{e.employment.department}</TableCell>
            <TableCell>{e.employment.position}</TableCell>
            <TableCell>{formatDate(e.employment.dateHired)}</TableCell>
            <TableCell className="capitalize">{e.employment.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function AdvancedAnalyticsTab() {
  const { usage, isLoading: usageLoading } = useSubscriptionUsage()
  const { periods } = usePayrollPeriodOptions()
  const { report, isLoading: reportLoading } = usePayrollRegister(periods[0]?.id)

  if (usageLoading) return <Skeleton className="h-56" />

  return (
    <PlanGate feature="advanced_reports" planTier={usage!.planTier}>
      {reportLoading || !report || report.rows.length === 0 ? (
        <EmptyState title="No payroll data yet" description="Run a payroll period first to see net-pay analytics by department." />
      ) : (
        <AverageNetPayByDepartment rows={report.rows} />
      )}
    </PlanGate>
  )
}

function AverageNetPayByDepartment({ rows }: { rows: { employee: { employment: { department: string } }; netPay: number }[] }) {
  const byDept = new Map<string, { total: number; count: number }>()
  for (const row of rows) {
    const dept = row.employee.employment.department
    const bucket = byDept.get(dept) ?? { total: 0, count: 0 }
    bucket.total += row.netPay
    bucket.count += 1
    byDept.set(dept, bucket)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Department</TableHead>
          <TableHead>Employees</TableHead>
          <TableHead>Average Net Pay</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...byDept.entries()].map(([dept, { total, count }]) => (
          <TableRow key={dept}>
            <TableCell className="font-medium">{dept}</TableCell>
            <TableCell>{count}</TableCell>
            <TableCell>{formatCurrency(Math.round(total / count))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ReportsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Payroll, attendance, leave, and employee reports." />

      <Tabs defaultValue="payroll-register">
        <TabsList>
          <TabsTrigger value="payroll-register">Payroll Register</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Summary</TabsTrigger>
          <TabsTrigger value="leave">Leave Summary</TabsTrigger>
          <TabsTrigger value="masterlist">Employee Masterlist</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll-register">
          <PayrollRegisterTab />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceSummaryTab />
        </TabsContent>
        <TabsContent value="leave">
          <LeaveSummaryTab />
        </TabsContent>
        <TabsContent value="masterlist">
          <MasterlistTab />
        </TabsContent>
        <TabsContent value="advanced">
          <AdvancedAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
