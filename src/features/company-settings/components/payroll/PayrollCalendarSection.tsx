import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatDate } from '@/lib/utils/format'
import type { Holiday, PayrollGroup } from '@/types/domain'

const FREQUENCY_LABEL: Record<PayrollGroup['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semi_monthly: 'Semi-monthly',
  monthly: 'Monthly',
  custom: 'Custom',
}

export function PayrollCalendarSection({ groups, holidays }: { groups: PayrollGroup[]; holidays: Holiday[] }) {
  const [filter, setFilter] = useState('all')

  const filterOptions = [{ value: 'all', label: 'All Payroll Groups' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]
  const rows = filter === 'all' ? groups : groups.filter((g) => g.id === filter)
  const upcomingHolidays = holidays
    .filter((h) => new Date(h.date) >= new Date(new Date().toISOString().slice(0, 10)))
    .slice(0, 3)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Payroll Calendar</p>
          <p className="text-xs text-muted-foreground">Cutoff and pay dates by payroll group, with the nearest upcoming holidays.</p>
        </div>
        <Select value={filter} onValueChange={setFilter} options={filterOptions} className="w-56" />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No payroll groups to display" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payroll Group</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Cutoff</TableHead>
              <TableHead>Pay Date(s)</TableHead>
              <TableHead>Processing Deadline</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{FREQUENCY_LABEL[group.frequency]}</TableCell>
                <TableCell className="text-muted-foreground">{group.cutoffSchedule}</TableCell>
                <TableCell className="text-muted-foreground">{group.payDates}</TableCell>
                <TableCell className="text-muted-foreground">2 business days before pay date</TableCell>
                <TableCell>
                  <Badge tone={group.status === 'active' ? 'success' : 'neutral'} className="capitalize">
                    {group.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming Holidays</p>
        {upcomingHolidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming holidays configured.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {upcomingHolidays.map((h) => (
              <Badge key={h.id} tone="brand">
                {h.name} · {formatDate(h.date)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
