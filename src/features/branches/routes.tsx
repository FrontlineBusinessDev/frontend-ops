import { Building2, Crown, Eye } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { fullName } from '@/features/branches/branchUtils'
import { AddBranchDialog } from '@/features/branches/components/AddBranchDialog'
import { AssignEmployeesDialog } from '@/features/branches/components/AssignEmployeesDialog'
import { BranchDetailsDialog } from '@/features/branches/components/BranchDetailsDialog'
import { useBranches, useBranchSummaries } from '@/features/branches/hooks/useBranches'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { reassignEmployeeBranch } from '@/lib/services/branchService'
import { formatCurrency } from '@/lib/utils/format'
import type { Branch, Employee } from '@/types/domain'

function BranchCard({
  branch,
  branches,
  employees,
  canManage,
  onView,
  onChanged,
}: {
  branch: Branch
  branches: Branch[]
  employees: Employee[]
  canManage: boolean
  onView: () => void
  onChanged: () => void
}) {
  const { user } = useSession()
  const { notify } = useToast()
  const staff = employees
    .filter((e) => e.branchId === branch.id)
    .sort((a, b) => Number(b.id === branch.managerEmployeeId) - Number(a.id === branch.managerEmployeeId) || a.personal.lastName.localeCompare(b.personal.lastName))
  const manager = staff.find((e) => e.id === branch.managerEmployeeId)
  const activeCount = staff.filter((e) => e.employment.status === 'active').length
  const otherBranches = branches.filter((b) => b.id !== branch.id).map((b) => ({ value: b.id, label: b.name }))

  async function moveEmployee(employee: Employee, targetId: string) {
    await reassignEmployeeBranch(user, employee.id, targetId)
    notify({ title: 'Employee transferred', description: `${fullName(employee)} moved to ${branches.find((b) => b.id === targetId)?.name}.`, tone: 'success' })
    onChanged()
  }

  return (
    <Card className="flex flex-col">
      <Card.Header className="items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <Card.Title className="truncate">{branch.name}</Card.Title>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{[branch.code, branch.city].filter(Boolean).join(' · ') || 'No location details yet'}</p>
        </div>
        {branch.isHeadOffice && (
          <Badge tone="brand" className="shrink-0 whitespace-nowrap">
            Head Office
          </Badge>
        )}
      </Card.Header>

      <Card.Body className="flex flex-1 flex-col gap-3 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Crown className="size-3.5 text-primary" />
            {manager ? <span className="font-medium text-foreground">{fullName(manager)}</span> : 'No manager assigned'}
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{staff.length}</span> employees · {activeCount} active
          </span>
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-border">
          {staff.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No employees assigned yet.</p>
          ) : (
            <ul className="max-h-60 divide-y divide-border overflow-y-auto">
              {staff.map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar name={fullName(e)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-medium">
                      <span className="truncate">{fullName(e)}</span>
                      {e.id === branch.managerEmployeeId && <Crown className="size-3 shrink-0 text-primary" aria-label="Branch manager" />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.employment.position} · {e.employment.department}
                    </p>
                  </div>
                  {canManage && otherBranches.length > 0 && (
                    <Select value={undefined} onValueChange={(v) => moveEmployee(e, v)} options={otherBranches} placeholder="Move" className="h-8 w-24 shrink-0 text-xs" aria-label={`Transfer ${fullName(e)}`} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="ghost" icon={<Eye className="size-3.5" />} onClick={onView}>
            View Details
          </Button>
          {canManage && <AssignEmployeesDialog branch={branch} branches={branches} employees={employees} onAssigned={onChanged} />}
        </div>
      </Card.Body>
    </Card>
  )
}

/** Branches and their employees in one view — assign, transfer, and manage without switching tabs. */
function BranchesTab() {
  const canManage = usePermission('branches.manage')
  const { branches, isLoading, refetch } = useBranches()
  const { employees, refetch: refetchEmployees } = useEmployees()
  const [viewingId, setViewingId] = useState<string | null>(null)

  const refresh = () => {
    refetch()
    refetchEmployees()
  }
  const unassigned = employees.filter((e) => e.employment.status !== 'archived' && !branches.some((b) => b.id === e.branchId))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {branches.length} branch{branches.length === 1 ? '' : 'es'} · {employees.filter((e) => e.employment.status !== 'archived').length} employees
        </p>
        {canManage && <AddBranchDialog employees={employees} branches={branches} onCreated={refresh} />}
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          {unassigned.length} employee(s) aren&apos;t assigned to any branch — use &ldquo;Assign&rdquo; on a branch card to place them.
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-56" />
      ) : branches.length === 0 ? (
        <EmptyState title="No branches yet" description="Add a branch to start assigning employees to locations." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              branches={branches}
              employees={employees}
              canManage={canManage}
              onView={() => setViewingId(branch.id)}
              onChanged={refresh}
            />
          ))}
        </div>
      )}

      <BranchDetailsDialog
        branch={branches.find((b) => b.id === viewingId) ?? null}
        branches={branches}
        employees={employees}
        canManage={canManage}
        onClose={() => setViewingId(null)}
        onChanged={refresh}
      />
    </div>
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
      <PageHeader title="Multi-Branch Management" description="Branches with their assigned employees, and consolidated cross-branch reporting." />

      <Tabs defaultValue="branches">
        <TabsList>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="report">Consolidated Report</TabsTrigger>
        </TabsList>

        <TabsContent value="branches">
          <BranchesTab />
        </TabsContent>
        <TabsContent value="report">
          <ConsolidatedReportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
