import { Building2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { AddBranchDialog } from '@/features/branches/components/AddBranchDialog'
import { useBranches, useBranchSummaries } from '@/features/branches/hooks/useBranches'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { usePermission } from '@/hooks/usePermission'
import { reassignEmployeeBranch } from '@/lib/services/branchService'
import { useSession } from '@/hooks/useSession'
import { formatCurrency } from '@/lib/utils/format'

function BranchesTab() {
  const canManage = usePermission('branches.manage')
  const { branches, isLoading, refetch } = useBranches()
  const { employees } = useEmployees()

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{canManage && <AddBranchDialog onCreated={refetch} />}</div>

      {isLoading ? (
        <Skeleton className="h-56" />
      ) : branches.length === 0 ? (
        <EmptyState title="No branches yet" description="Add a branch to start assigning employees to locations." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => {
            const headcount = employees.filter((e) => e.branchId === branch.id).length
            return (
              <Card key={branch.id}>
                <Card.Header>
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <Card.Title>{branch.name}</Card.Title>
                  </div>
                  {branch.isHeadOffice && <Badge tone="brand">Head Office</Badge>}
                </Card.Header>
                <Card.Body className="pt-3 text-sm text-muted-foreground">{headcount} employees</Card.Body>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AssignmentTab() {
  const { user } = useSession()
  const canManage = usePermission('branches.manage')
  const { branches } = useBranches()
  const { employees, isLoading, refetch } = useEmployees()

  if (isLoading) return <Skeleton className="h-72" />
  if (employees.length === 0) return <EmptyState title="No employees yet" />

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Branch</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell className="font-medium">
              {employee.personal.firstName} {employee.personal.lastName}
            </TableCell>
            <TableCell>{employee.employment.department}</TableCell>
            <TableCell className="max-w-56">
              <Select
                value={employee.branchId}
                onValueChange={(branchId) => reassignEmployeeBranch(user, employee.id, branchId).then(refetch)}
                options={branchOptions}
                disabled={!canManage}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ConsolidatedReportTab() {
  const { summaries, isLoading } = useBranchSummaries()

  if (isLoading) return <Skeleton className="h-72" />
  if (summaries.length === 0) return <EmptyState title="No branches yet" />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Branch</TableHead>
          <TableHead>Headcount</TableHead>
          <TableHead>Active</TableHead>
          <TableHead>Gross Pay (Latest Period)</TableHead>
          <TableHead>Net Pay (Latest Period)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summaries.map(({ branch, headcount, activeCount, grossPay, netPay }) => (
          <TableRow key={branch.id}>
            <TableCell className="font-medium">
              {branch.name}
              {branch.isHeadOffice && (
                <Badge tone="brand" className="ml-2">
                  HQ
                </Badge>
              )}
            </TableCell>
            <TableCell>{headcount}</TableCell>
            <TableCell>{activeCount}</TableCell>
            <TableCell>{formatCurrency(grossPay)}</TableCell>
            <TableCell>{formatCurrency(netPay)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function BranchesPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Multi-Branch Management" description="Branches, employee assignment, and consolidated cross-branch reporting." />

      <Tabs defaultValue="branches">
        <TabsList>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="assignment">Employee Assignment</TabsTrigger>
          <TabsTrigger value="report">Consolidated Report</TabsTrigger>
        </TabsList>

        <TabsContent value="branches">
          <BranchesTab />
        </TabsContent>
        <TabsContent value="assignment">
          <AssignmentTab />
        </TabsContent>
        <TabsContent value="report">
          <ConsolidatedReportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
