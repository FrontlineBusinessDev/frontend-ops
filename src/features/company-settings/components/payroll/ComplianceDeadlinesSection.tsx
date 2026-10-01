import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Switch } from '@/components/ui/Switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { ComplianceDeadlineDialog } from '@/features/company-settings/components/payroll/ComplianceDeadlineDialog'
import { useSession } from '@/hooks/useSession'
import { daysUntil, nextDueDate, scheduleLabel, toIsoDate } from '@/lib/payroll/complianceDeadlines'
import { deleteComplianceDeadline, updateComplianceDeadline } from '@/lib/services/complianceService'
import { formatDate } from '@/lib/utils/format'
import type { ComplianceDeadline } from '@/types/domain'

function countdown(days: number): { text: string; tone: 'danger' | 'warning' | 'neutral' } {
  if (days === 0) return { text: 'Due today', tone: 'danger' }
  if (days === 1) return { text: 'Tomorrow', tone: 'danger' }
  return { text: `In ${days} days`, tone: days <= 7 ? 'warning' : 'neutral' }
}

export function ComplianceDeadlinesSection({ deadlines, canEdit, onRefetch }: { deadlines: ComplianceDeadline[]; canEdit: boolean; onRefetch: () => void }) {
  const { user } = useSession()
  const { notify } = useToast()

  // Soonest first; deadlines with no upcoming date (a past one-time reminder) sink to the bottom.
  const rows = deadlines
    .map((deadline) => ({ deadline, due: nextDueDate(deadline) }))
    .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity))

  async function toggle(deadline: ComplianceDeadline, enabled: boolean) {
    await updateComplianceDeadline(user, deadline.id, { enabled })
    onRefetch()
  }

  async function remove(deadline: ComplianceDeadline) {
    await deleteComplianceDeadline(user, deadline.id)
    notify({ title: 'Reminder deleted', tone: 'success' })
    onRefetch()
  }

  return (
    <div className="mt-8 space-y-4 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Compliance Deadlines</p>
          <p className="text-xs text-muted-foreground">Government filing and remittance due dates, plus your own reminders. Enabled items appear on the dashboard&apos;s Reminders card.</p>
        </div>
        {canEdit && <ComplianceDeadlineDialog onSaved={onRefetch} />}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No compliance deadlines yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deadline</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Remind</TableHead>
              <TableHead>Show on Dashboard</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ deadline, due }) => {
              const status = due ? countdown(daysUntil(due)) : undefined
              return (
                <TableRow key={deadline.id} className={deadline.enabled ? undefined : 'opacity-60'}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{deadline.name}</span>
                      <Badge tone="brand">{deadline.category}</Badge>
                      {deadline.custom && <Badge tone="neutral">Custom</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{scheduleLabel(deadline)}</TableCell>
                  <TableCell>
                    {due && status ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{formatDate(toIsoDate(due))}</span>
                        <Badge tone={status.tone}>{status.text}</Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Passed</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{deadline.remindDaysBefore} days before</TableCell>
                  <TableCell>
                    <Switch checked={deadline.enabled} onCheckedChange={(checked) => toggle(deadline, checked)} disabled={!canEdit} aria-label={`Show ${deadline.name} on the dashboard`} />
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ComplianceDeadlineDialog
                          deadline={deadline}
                          onSaved={onRefetch}
                          trigger={
                            <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />}>
                              Edit
                            </Button>
                          }
                        />
                        {deadline.custom && (
                          <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => remove(deadline)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
