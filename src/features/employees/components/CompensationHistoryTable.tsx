import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { CompensationHistoryEntry } from '@/types/domain'

function PercentChange({ previous, next }: { previous: number | null; next: number }) {
  if (previous === null || previous === 0) return <span className="text-xs text-muted-foreground">—</span>
  const pct = ((next - previous) / previous) * 100
  const tone = pct > 0 ? 'success' : pct < 0 ? 'danger' : 'neutral'
  return (
    <Badge tone={tone} className="font-mono">
      {pct > 0 ? '+' : ''}
      {pct.toFixed(1)}%
    </Badge>
  )
}

export function CompensationHistoryTable({ entries }: { entries: CompensationHistoryEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState title="No compensation history yet" description="Salary changes will be logged here automatically." />
  }

  const sorted = [...entries].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Effective Date</TableHead>
          <TableHead>Type / Reason</TableHead>
          <TableHead>Previous → New Salary</TableHead>
          <TableHead>% Change</TableHead>
          <TableHead>Approved By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="whitespace-nowrap">{formatDate(entry.effectiveDate)}</TableCell>
            <TableCell>
              <Badge tone="brand">{entry.type}</Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 text-sm">
                <span className={entry.previousSalary === null ? 'text-muted-foreground' : ''}>
                  {entry.previousSalary === null ? '—' : formatCurrency(entry.previousSalary)}
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{formatCurrency(entry.newSalary)}</span>
              </span>
            </TableCell>
            <TableCell>
              <PercentChange previous={entry.previousSalary} next={entry.newSalary} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{entry.approvedBy}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
