import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { InviteUserDialog } from '@/features/user-access/components/InviteUserDialog'
import { useActivityLog, useUsers } from '@/features/user-access/hooks/useUsers'
import { useSession } from '@/hooks/useSession'
import { ROLE_PERMISSIONS } from '@/lib/rbac/permissions'
import { setUserActive, updateUserRole } from '@/lib/services/userService'
import { formatDate } from '@/lib/utils/format'
import type { Role } from '@/types/domain'

const ROLE_OPTIONS = [
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'payroll_admin', label: 'Payroll Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'super_admin', label: 'Super Admin' },
]

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  hr_admin: 'HR Admin',
  payroll_admin: 'Payroll Admin',
  manager: 'Manager',
  employee: 'Employee',
}

function UsersTab() {
  const { users, isLoading, refetch } = useUsers()
  const { user: session } = useSession()
  const { notify } = useToast()

  async function changeRole(userId: string, role: string) {
    await updateUserRole(session, userId, role as Role)
    notify({ title: 'Role updated', tone: 'success' })
    refetch()
  }

  async function toggleActive(userId: string, isActive: boolean) {
    await setUserActive(session, userId, isActive)
    notify({ title: isActive ? 'User reactivated' : 'User deactivated', tone: isActive ? 'success' : 'default' })
    refetch()
  }

  if (isLoading) return <Skeleton className="h-72" />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <p className="text-sm font-medium">{u.name}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </TableCell>
            <TableCell className="w-48">
              <Select value={u.role} onValueChange={(value) => changeRole(u.id, value)} options={ROLE_OPTIONS} />
            </TableCell>
            <TableCell>
              <StatusBadge status={u.isActive === false ? 'inactive' : 'active'} />
            </TableCell>
            <TableCell>
              <Button size="sm" variant="secondary" onClick={() => toggleActive(u.id, u.isActive === false)}>
                {u.isActive === false ? 'Reactivate' : 'Deactivate'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function PermissionsTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.entries(ROLE_PERMISSIONS) as [Role, string[]][]).map(([role, capabilities]) => (
        <Card key={role} className="p-5">
          <p className="mb-2 font-display text-sm font-semibold tracking-tight">{ROLE_LABELS[role]}</p>
          <p className="mb-3 text-xs text-muted-foreground">{capabilities.length} capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {capabilities.slice(0, 8).map((cap) => (
              <span key={cap} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {cap}
              </span>
            ))}
            {capabilities.length > 8 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                +{capabilities.length - 8} more
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function ActivityLogTab() {
  const log = useActivityLog()

  if (log.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No activity yet" description="Role changes and account updates will be logged here." />
  }

  return (
    <div className="space-y-3">
      {log.map((entry) => (
        <div key={entry.id} className="flex gap-3 border-l-2 border-border pl-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{entry.action}</p>
            <p className="text-xs text-muted-foreground">
              {entry.actor} &middot; {formatDate(entry.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function UserAccessPage() {
  const { refetch } = useUsers()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users & Access Management"
        description="Manage who can sign in, what they can do, and track important account changes."
        actions={<InviteUserDialog onCreated={refetch} />}
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions">Permission Map</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionsTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityLogTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
