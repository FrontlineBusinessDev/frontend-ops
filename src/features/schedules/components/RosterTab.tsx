import { ChevronLeft, ChevronRight, Coffee, Copy, Plane, Plus, Search, UserCheck, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { AssignShiftDialog, type ApplyPreset } from '@/features/schedules/components/AssignShiftDialog'
import { useRoster, useScheduleTeams } from '@/features/schedules/hooks/useSchedules'
import { LEAVE_CLASS, REST_CLASS, TONE_CLASS } from '@/features/schedules/scheduleUi'
import { StatTile } from '@/features/reports/components/shared'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from '@/hooks/useSession'
import { useTenant } from '@/hooks/useTenant'
import { addDaysIso, cellFor, datesBetween, hoursFor, isoDate, mondayOf, parseIso, shortTimeRange, weekDates, type RosterCell, type RosterContext } from '@/lib/schedule/roster'
import { copyWeek } from '@/lib/services/scheduleService'
import { cn } from '@/lib/utils/cn'
import type { Employee, ScheduleTeam, ShiftTemplate } from '@/types/domain'

type View = 'week' | 'month' | 'year'

interface RosterGroup {
  key: string
  branchIds: string[]
  department: string
  members: Employee[]
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const fullName = (e: Employee) => `${e.personal.firstName} ${e.personal.lastName}`
const monthName = (year: number, month: number) => new Date(year, month, 1).toLocaleDateString('en-PH', { month: 'long' })
const shortDate = (iso: string) => parseIso(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

function chipLabel(cell: RosterCell): string {
  if (cell.kind === 'leave') return 'Leave'
  if (cell.kind === 'rest') return 'Rest'
  if (cell.kind === 'shift' && cell.template) return cell.template.shiftType === 'flexible' ? `Flex ${hoursFor(cell.template)}h` : shortTimeRange(cell.template)
  return '+ Add'
}

function chipClass(cell: RosterCell): string {
  if (cell.kind === 'leave') return LEAVE_CLASS
  if (cell.kind === 'rest') return REST_CLASS
  if (cell.kind === 'shift' && cell.template) return TONE_CLASS[cell.template.tone ?? 'accent']
  return 'border border-dashed border-border text-muted-foreground'
}

function countDay(employees: Employee[], date: string, roster: RosterContext) {
  const counts = { working: 0, rest: 0, leave: 0, unscheduled: 0 }
  for (const e of employees) {
    const kind = cellFor(e.id, date, roster).kind
    if (kind === 'shift') counts.working++
    else counts[kind]++
  }
  return counts
}

function rangeOf(view: View, anchor: string): { from: string; to: string } {
  const d = parseIso(anchor)
  if (view === 'week') return { from: mondayOf(anchor), to: addDaysIso(mondayOf(anchor), 6) }
  if (view === 'month') return { from: isoDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
  return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` }
}

function shiftAnchor(view: View, anchor: string, direction: 1 | -1): string {
  const d = parseIso(anchor)
  if (view === 'week') return addDaysIso(anchor, 7 * direction)
  if (view === 'month') return isoDate(new Date(d.getFullYear(), d.getMonth() + direction, 1))
  return isoDate(new Date(d.getFullYear() + direction, d.getMonth(), 1))
}

function periodLabel(view: View, anchor: string): string {
  const { from, to } = rangeOf(view, anchor)
  const d = parseIso(anchor)
  if (view === 'week') return `${shortDate(from)} – ${shortDate(to)}, ${parseIso(to).getFullYear()}`
  if (view === 'month') return `${monthName(d.getFullYear(), d.getMonth())} ${d.getFullYear()}`
  return String(d.getFullYear())
}

export function RosterTab() {
  const today = isoDate(new Date())
  const { user } = useSession()
  const { notify } = useToast()
  const { employees, isLoading: employeesLoading } = useEmployees()
  const { branches } = useTenant()
  const { teams } = useScheduleTeams()
  const canManage = usePermission('schedules.manage')

  const [view, setView] = useState<View>('week')
  const [onDuty, setOnDuty] = useState(false)
  const [anchor, setAnchor] = useState(today)
  const [branchId, setBranchId] = useState('all')
  const [department, setDepartment] = useState('all')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; employeeIds: string[]; date: string; preset: ApplyPreset }>({ open: false, employeeIds: [], date: today, preset: 'week' })

  const { from, to } = onDuty ? { from: today, to: today } : rangeOf(view, anchor)
  const { roster, isLoading: rosterLoading, refetch } = useRoster(from, to)
  const { roster: todayRoster } = useRoster(today, today)

  const active = useMemo(() => employees.filter((e) => e.employment.status === 'active'), [employees])
  const departmentOptions = useMemo(() => [{ value: 'all', label: 'All departments' }, ...[...new Set(active.map((e) => e.employment.department))].sort().map((d) => ({ value: d, label: d }))], [active])
  const branchOptions = useMemo(() => [{ value: 'all', label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))], [branches])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return active
      .filter((e) => (branchId === 'all' || e.branchId === branchId) && (department === 'all' || e.employment.department === department))
      .filter((e) => !q || `${fullName(e)} ${e.employeeNumber} ${e.employment.position}`.toLowerCase().includes(q))
  }, [active, branchId, department, search])

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? ''

  const groups = useMemo(() => {
    // One group per department; with a single branch selected the group is that branch's department.
    const map = new Map<string, RosterGroup>()
    for (const e of visible) {
      const key = branchId === 'all' ? e.employment.department : `${e.branchId}|${e.employment.department}`
      const group = map.get(key) ?? { key, branchIds: [], department: e.employment.department, members: [] }
      group.members.push(e)
      if (!group.branchIds.includes(e.branchId)) group.branchIds.push(e.branchId)
      map.set(key, group)
    }
    return [...map.values()]
      .map((g) => ({ ...g, members: g.members.sort((a, b) => fullName(a).localeCompare(fullName(b))) }))
      .sort((a, b) => a.department.localeCompare(b.department) || branchName(a.branchIds[0]).localeCompare(branchName(b.branchIds[0])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, branches, branchId])

  function supervisorFor(group: RosterGroup): string {
    const find = (team?: ScheduleTeam) => (team?.supervisorEmployeeId ? employeeById.get(team.supervisorEmployeeId) : undefined)
    const labels = new Set(
      group.branchIds.map((branch) => {
        const own = find(teams.find((t) => t.branchId === branch && t.department === group.department))
        if (own) return fullName(own)
        const branchLevel = find(teams.find((t) => t.branchId === branch && t.department === null))
        return branchLevel ? `${fullName(branchLevel)} (branch)` : 'Company admin'
      }),
    )
    return labels.size === 1 ? [...labels][0] : 'Varies by branch'
  }

  const todayCounts = useMemo(() => countDay(visible, today, todayRoster), [visible, today, todayRoster])
  const multiBranch = branchId === 'all' && branches.length > 1

  function openAssign(employeeIds: string[], date: string, preset: ApplyPreset) {
    if (canManage) setDialog({ open: true, employeeIds, date, preset })
  }

  async function onCopyLastWeek() {
    if (!window.confirm(`Copy last week’s schedule onto ${periodLabel('week', anchor)} for ${visible.length} employees? This overrides anything set for those days.`)) return
    const written = await copyWeek(user, addDaysIso(anchor, -7), anchor, visible.map((e) => e.id))
    notify({ title: 'Last week copied', description: `${written} days set.`, tone: 'success' })
    refetch()
  }

  const dates = weekDates(anchor)
  const isLoading = employeesLoading || rosterLoading && roster.templates.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {onDuty ? (
          <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium">
            Today · {parseIso(today).toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <div className="inline-flex items-center rounded-lg border border-border bg-card">
            <Button size="sm" variant="ghost" aria-label="Previous" icon={<ChevronLeft className="size-4" />} onClick={() => setAnchor(shiftAnchor(view, anchor, -1))} />
            <span className="min-w-44 px-2 text-center text-sm font-medium">{periodLabel(view, anchor)}</span>
            <Button size="sm" variant="ghost" aria-label="Next" icon={<ChevronRight className="size-4" />} onClick={() => setAnchor(shiftAnchor(view, anchor, 1))} />
          </div>
        )}
        <Button
          size="sm"
          variant={onDuty ? 'primary' : 'secondary'}
          aria-pressed={onDuty}
          title={onDuty ? 'Back to the roster' : 'Show only the employees on duty today'}
          onClick={() => {
            setOnDuty((current) => !current)
            setAnchor(today)
          }}
        >
          Today
        </Button>
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(['week', 'month', 'year'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v)
                setOnDuty(false)
              }}
              className={cn('rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors', !onDuty && view === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canManage && !onDuty && view === 'week' && (
            <Button size="sm" variant="secondary" icon={<Copy className="size-3.5" />} onClick={onCopyLastWeek} disabled={visible.length === 0}>
              Copy last week
            </Button>
          )}
          {canManage && (
            <Button size="sm" icon={<Plus className="size-4" />} onClick={() => openAssign([], view === 'week' ? dates[0] : anchor, view === 'week' ? 'week' : 'month')}>
              Assign shift
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={branchId} onValueChange={setBranchId} options={branchOptions} className="w-48" />
        <Select value={department} onValueChange={setDepartment} options={departmentOptions} className="w-48" />
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee…" className="pl-9" />
        </div>
        <p className="ml-auto text-sm text-muted-foreground">{visible.length} employees</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Working today" value={String(todayCounts.working)} icon={UserCheck} />
        <StatTile label="On rest day today" value={String(todayCounts.rest)} icon={Coffee} />
        <StatTile label="Not yet scheduled" value={String(todayCounts.unscheduled)} icon={UserX} />
        <StatTile label="On leave today" value={String(todayCounts.leave)} icon={Plane} />
      </div>

      <Legend templates={roster.templates} />

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : visible.length === 0 ? (
        <EmptyState title="No employees match" description="Try another branch, department or search." />
      ) : onDuty ? (
        <OnDutyList visible={visible} roster={todayRoster} branchName={branchName} supervisorFor={supervisorFor} multiBranch={multiBranch} />
      ) : view === 'week' ? (
        <WeekGrid
          groups={groups}
          dates={dates}
          roster={roster}
          today={today}
          multiBranch={multiBranch}
          branchName={branchName}
          supervisorFor={supervisorFor}
          canManage={canManage}
          onCell={(employeeId, date) => openAssign([employeeId], date, 'day')}
          visible={visible}
        />
      ) : view === 'month' ? (
        <MonthGrid anchor={anchor} visible={visible} roster={roster} today={today} onPick={(date) => { setAnchor(date); setView('week') }} />
      ) : (
        <YearOverview anchor={anchor} visible={visible} roster={roster} onPick={(date) => { setAnchor(date); setView('month') }} />
      )}

      <AssignShiftDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        employees={employees}
        templates={roster.templates}
        defaultEmployeeIds={dialog.employeeIds}
        defaultDate={dialog.date}
        defaultPreset={dialog.preset}
        onDone={refetch}
      />
    </div>
  )
}

function OnDutyList({
  visible,
  roster,
  branchName,
  supervisorFor,
  multiBranch,
}: {
  visible: Employee[]
  roster: RosterContext
  branchName: (id: string) => string
  supervisorFor: (group: RosterGroup) => string
  multiBranch: boolean
}) {
  const today = isoDate(new Date())
  const onDutyRows = visible
    .map((employee) => ({ employee, cell: cellFor(employee.id, today, roster) }))
    .filter((r) => r.cell.kind === 'shift' && r.cell.template)
    .sort((a, b) => a.cell.template!.startTime.localeCompare(b.cell.template!.startTime) || fullName(a.employee).localeCompare(fullName(b.employee)))
  const off = visible.length - onDutyRows.length

  if (onDutyRows.length === 0) return <EmptyState title="Nobody is on duty today" description="No one in this view has a shift scheduled today." />

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{onDutyRows.length} on duty today</span> · {off} resting, on leave or not yet scheduled
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Employee</th>
              <th className="px-3 py-2 font-medium">Department</th>
              <th className="px-3 py-2 font-medium">Shift</th>
              <th className="px-3 py-2 font-medium">Hours</th>
              <th className="px-3 py-2 font-medium">Supervisor</th>
            </tr>
          </thead>
          <tbody>
            {onDutyRows.map(({ employee, cell }) => (
              <tr key={employee.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <span className="font-medium">{fullName(employee)}</span>
                  <span className="block text-[11px] text-muted-foreground">{employee.employment.position}</span>
                </td>
                <td className="px-3 py-2">
                  {employee.employment.department}
                  {multiBranch && <span className="block text-[11px] text-muted-foreground">{branchName(employee.branchId)}</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', TONE_CLASS[cell.template!.tone ?? 'accent'])}>
                    {cell.template!.name} · {cell.template!.startTime}–{cell.template!.endTime}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{hoursFor(cell.template!)}h</td>
                <td className="px-3 py-2 text-muted-foreground">{supervisorFor({ key: employee.id, branchIds: [employee.branchId], department: employee.employment.department, members: [employee] })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Legend({ templates }: { templates: ShiftTemplate[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      {templates.map((t) => (
        <span key={t.id} className={cn('rounded-md px-2 py-0.5 font-medium', TONE_CLASS[t.tone ?? 'accent'])}>
          {t.name} {shortTimeRange(t)}
        </span>
      ))}
      <span className={cn('rounded-md px-2 py-0.5', REST_CLASS)}>Rest day</span>
      <span className={cn('rounded-md px-2 py-0.5 font-medium', LEAVE_CLASS)}>On leave</span>
    </div>
  )
}

function WeekGrid({
  groups,
  dates,
  roster,
  today,
  multiBranch,
  branchName,
  supervisorFor,
  canManage,
  onCell,
  visible,
}: {
  groups: RosterGroup[]
  dates: string[]
  roster: RosterContext
  today: string
  multiBranch: boolean
  branchName: (id: string) => string
  supervisorFor: (group: RosterGroup) => string
  canManage: boolean
  onCell: (employeeId: string, date: string) => void
  visible: Employee[]
}) {
  const headcount = dates.map((d) => countDay(visible, d, roster).working)
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
      <div className="grid min-w-[760px] grid-cols-[180px_repeat(7,minmax(88px,1fr))] text-xs">
        <div className="border-b border-border bg-muted/50 px-3 py-2 font-medium text-muted-foreground">Employee</div>
        {dates.map((date, i) => (
          <div key={date} className={cn('border-b border-l border-border px-2 py-2 text-center', date === today ? 'bg-primary/10 font-semibold text-primary' : 'bg-muted/50 text-muted-foreground')}>
            <div>{WEEKDAY_SHORT[i]}</div>
            <div className="text-[11px] font-normal">{shortDate(date)}</div>
          </div>
        ))}

        {groups.map((group) => (
          <WeekGroup key={group.key} group={group} dates={dates} roster={roster} today={today} multiBranch={multiBranch} branchName={branchName} supervisor={supervisorFor(group)} canManage={canManage} onCell={onCell} />
        ))}

        <div className="bg-muted/50 px-3 py-2 font-medium text-muted-foreground">Headcount working</div>
        {headcount.map((count, i) => (
          <div key={dates[i]} className={cn('border-l border-border px-2 py-2 text-center font-semibold tabular-nums', dates[i] === today ? 'bg-primary/10 text-primary' : 'bg-muted/50')}>
            {count}
          </div>
        ))}
      </div>
    </div>
  )
}

function WeekGroup({
  group,
  dates,
  roster,
  today,
  multiBranch,
  branchName,
  supervisor,
  canManage,
  onCell,
}: {
  group: RosterGroup
  dates: string[]
  roster: RosterContext
  today: string
  multiBranch: boolean
  branchName: (id: string) => string
  supervisor: string
  canManage: boolean
  onCell: (employeeId: string, date: string) => void
}) {
  return (
    <>
      <div className="col-span-8 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
        <span className="text-xs font-semibold">
          {group.department}
          {!multiBranch && <span className="font-normal text-muted-foreground"> · {branchName(group.branchIds[0])}</span>}
          <span className="ml-1 font-normal text-muted-foreground">({group.members.length})</span>
        </span>
        <span className="text-[11px] text-muted-foreground">Supervisor: {supervisor}</span>
      </div>
      {group.members.map((employee) => (
        <WeekRow key={employee.id} employee={employee} branchLabel={multiBranch ? branchName(employee.branchId) : undefined} dates={dates} roster={roster} today={today} canManage={canManage} onCell={onCell} />
      ))}
    </>
  )
}

function WeekRow({ employee, branchLabel, dates, roster, today, canManage, onCell }: { employee: Employee; branchLabel?: string; dates: string[]; roster: RosterContext; today: string; canManage: boolean; onCell: (employeeId: string, date: string) => void }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium">{employee.personal.firstName[0]}{employee.personal.lastName[0]}</span>
        <span className="min-w-0 text-xs font-medium" title={`${fullName(employee)} · ${employee.employment.position}`}>
          <span className="block truncate">{fullName(employee)}</span>
          {branchLabel && <span className="block truncate text-[10px] font-normal text-muted-foreground">{branchLabel}</span>}
        </span>
      </div>
      {dates.map((date) => {
        const cell = cellFor(employee.id, date, roster)
        const title =
          cell.kind === 'shift' && cell.template
            ? `${cell.template.name} · ${cell.template.startTime}–${cell.template.endTime} (${hoursFor(cell.template)}h)${cell.assignment ? ' · assigned for this day' : ''}`
            : cell.kind === 'leave'
              ? 'On approved leave'
              : cell.kind === 'rest'
                ? 'Rest day'
                : 'Not scheduled'
        return (
          <div key={date} className={cn('flex items-center border-b border-l border-border p-1', date === today && 'bg-primary/[0.04]')}>
            <button
              type="button"
              disabled={!canManage}
              title={title}
              onClick={() => onCell(employee.id, date)}
              className={cn('w-full rounded-md px-1 py-1 text-center text-[11px] font-medium leading-tight transition-opacity', chipClass(cell), canManage && 'hover:opacity-80', !canManage && 'cursor-default')}
            >
              {chipLabel(cell)}
            </button>
          </div>
        )
      })}
    </>
  )
}

function MonthGrid({ anchor, visible, roster, today, onPick }: { anchor: string; visible: Employee[]; roster: RosterContext; today: string; onPick: (date: string) => void }) {
  const { from, to } = rangeOf('month', anchor)
  const days = datesBetween(from, to)
  const leading = (parseIso(from).getDay() + 6) % 7
  const peak = Math.max(1, visible.length)
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="grid min-w-[640px] grid-cols-7 gap-1.5 text-xs">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="px-1 pb-1 text-center font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map((date) => {
          const c = countDay(visible, date, roster)
          return (
            <button key={date} type="button" onClick={() => onPick(date)} className={cn('rounded-lg border p-2 text-left transition-colors hover:bg-muted/60', date === today ? 'border-primary bg-primary/[0.06]' : 'border-border')}>
              <span className="text-[11px] font-semibold">{Number(date.slice(8))}</span>
              <span className="mt-1 block text-[11px] text-foreground">{c.working} working</span>
              <span className="block text-[11px] text-muted-foreground">
                {c.rest} rest{c.leave > 0 ? ` · ${c.leave} leave` : ''}
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((c.working / peak) * 100)}%` }} />
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Click a day to open its week and edit shifts.</p>
    </div>
  )
}

function YearOverview({ anchor, visible, roster, onPick }: { anchor: string; visible: Employee[]; roster: RosterContext; onPick: (date: string) => void }) {
  const year = parseIso(anchor).getFullYear()
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => {
        const days = datesBetween(isoDate(new Date(year, month, 1)), isoDate(new Date(year, month + 1, 0)))
        const perDay = days.map((d) => countDay(visible, d, roster))
        const average = perDay.reduce((s, c) => s + c.working, 0) / perDay.length
        const peak = Math.max(...perDay.map((c) => c.working))
        const unscheduled = Math.max(...perDay.map((c) => c.unscheduled))
        return { month, average, peak, unscheduled, first: days[0] }
      }),
    [year, visible, roster],
  )
  const top = Math.max(1, visible.length)
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {months.map((m) => (
        <button key={m.month} type="button" onClick={() => onPick(m.first)} className="rounded-xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:bg-muted/50">
          <p className="font-display text-sm font-semibold">{monthName(year, m.month)}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{Math.round(m.average * 10) / 10}</p>
          <p className="text-[11px] text-muted-foreground">avg working per day · peak {m.peak}</p>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((m.average / top) * 100)}%` }} />
          </span>
          {m.unscheduled > 0 && <p className="mt-2 text-[11px] text-warning">{m.unscheduled} not yet scheduled</p>}
        </button>
      ))}
    </div>
  )
}
