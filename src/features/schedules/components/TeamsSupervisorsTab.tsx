import { Building2, ShieldCheck, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useScheduleTeams } from '@/features/schedules/hooks/useSchedules'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { updateScheduleTeam } from '@/lib/services/scheduleService'
import type { Employee, ScheduleTeam } from '@/types/domain'

const NONE = '__none__'
const fullName = (e: Employee) => `${e.personal.firstName} ${e.personal.lastName}`

function PersonSelect({ value, options, onChange, disabled, label }: { value?: string; options: { value: string; label: string }[]; onChange: (id: string | undefined) => void; disabled: boolean; label: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? undefined : v)} options={[{ value: NONE, label: 'Not assigned' }, ...options]} disabled={disabled} />
    </div>
  )
}

/**
 * Who manages scheduling for each branch and department. A department's supervisor decides its employees' shifts;
 * with none (or editing off) the branch's supervisor steps in, then the company admin.
 */
export function TeamsSupervisorsTab() {
  const { teams, isLoading, refetch } = useScheduleTeams()
  const { employees } = useEmployees()
  const { branches } = useTenant()
  const { user } = useSession()
  const { notify } = useToast()
  const canManage = usePermission('schedules.manage')

  const active = useMemo(() => employees.filter((e) => e.employment.status === 'active'), [employees])

  async function update(team: ScheduleTeam, updates: Parameters<typeof updateScheduleTeam>[2]) {
    await updateScheduleTeam(user, team.id, updates)
    notify({ title: 'Team updated', tone: 'success' })
    refetch()
  }

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Teams and supervisors</p>
        <p className="max-w-3xl text-xs text-muted-foreground">
          Choose who manages each branch and department. They decide shifts for the people under them — by week, month or year. If a department has no supervisor, its branch supervisor steps in, then the company admin.
        </p>
      </div>

      <Card watermark={null} className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Company admin</p>
            <p className="text-xs text-muted-foreground">Can edit every schedule, whatever the settings below.</p>
          </div>
        </div>
        <Badge tone="success">Always on</Badge>
      </Card>

      {branches.map((branch) => {
        const branchStaff = active.filter((e) => e.branchId === branch.id)
        const people = branchStaff.map((e) => ({ value: e.id, label: `${fullName(e)} · ${e.employment.position}` }))
        const branchTeam = teams.find((t) => t.branchId === branch.id && t.department === null)
        const departments = teams.filter((t) => t.branchId === branch.id && t.department !== null).sort((a, b) => (a.department ?? '').localeCompare(b.department ?? ''))
        return (
          <Card key={branch.id} watermark={null} className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold tracking-tight">{branch.name}</p>
                <p className="text-xs text-muted-foreground">
                  {branchStaff.length} {branchStaff.length === 1 ? "employee" : "employees"} · {departments.length} {departments.length === 1 ? "department" : "departments"}
                </p>
              </div>
            </div>

            {branchTeam && (
              <div className="grid items-end gap-3 border-b border-border pb-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="text-sm font-medium">Branch default</div>
                <PersonSelect label="Branch manager" value={branchTeam.managerEmployeeId} options={people} disabled={!canManage} onChange={(id) => update(branchTeam, { managerEmployeeId: id })} />
                <PersonSelect label="Direct supervisor" value={branchTeam.supervisorEmployeeId} options={people} disabled={!canManage} onChange={(id) => update(branchTeam, { supervisorEmployeeId: id })} />
                <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
                  Can edit
                  <Switch checked={branchTeam.canEdit} onCheckedChange={(v) => update(branchTeam, { canEdit: v })} disabled={!canManage} />
                </label>
              </div>
            )}

            <div className="divide-y divide-border">
              {departments.map((team) => {
                const members = branchStaff.filter((e) => e.employment.department === team.department)
                const memberOptions = [...members, ...branchStaff.filter((e) => e.employment.department !== team.department)].map((e) => ({ value: e.id, label: `${fullName(e)} · ${e.employment.position}` }))
                return (
                  <div key={team.id} className="grid items-end gap-3 py-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="size-4 text-muted-foreground" />
                      <span>
                        {team.department}
                        <span className="block text-xs font-normal text-muted-foreground">{members.length} {members.length === 1 ? "employee" : "employees"}</span>
                      </span>
                    </div>
                    <PersonSelect label="Department manager" value={team.managerEmployeeId} options={memberOptions} disabled={!canManage} onChange={(id) => update(team, { managerEmployeeId: id })} />
                    <PersonSelect label="Direct supervisor" value={team.supervisorEmployeeId} options={memberOptions} disabled={!canManage} onChange={(id) => update(team, { supervisorEmployeeId: id })} />
                    <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
                      Can edit
                      <Switch checked={team.canEdit} onCheckedChange={(v) => update(team, { canEdit: v })} disabled={!canManage} />
                    </label>
                  </div>
                )
              })}
              {departments.length === 0 && <p className="py-3 text-xs text-muted-foreground">No active employees in this branch yet.</p>}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
