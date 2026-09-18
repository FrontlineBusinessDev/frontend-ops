import { CalendarDays, ChevronRight, Clock3, ClipboardEdit, Moon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePendingRequestsSummary } from '@/features/dashboard/hooks/useDashboardData'

const ROWS = [
  { key: 'leavePending', label: 'Leave Requests', to: '/leave', icon: CalendarDays } as const,
  { key: 'overtimePending', label: 'Overtime Requests', to: '/overtime', icon: Clock3 } as const,
  { key: 'nightDiffPending', label: 'Night Differential Requests', to: '/overtime', icon: Moon } as const,
  { key: 'attendanceAdjustmentsPending', label: 'Attendance Adjustments', to: '/attendance', icon: ClipboardEdit } as const,
]

export function PendingRequestsCard() {
  const { summary, isLoading } = usePendingRequestsSummary()

  return (
    <Card>
      <Card.Header>
        <Card.Title>Pending Requests</Card.Title>
        <Card.Description>Open items waiting on your review.</Card.Description>
      </Card.Header>
      <Card.Body className="pt-2">
        {isLoading || !summary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ROWS.map(({ key, label, to, icon: Icon }) => {
              const count = summary[key]
              return (
                <Link
                  key={key}
                  to={to}
                  className="flex items-center gap-3 rounded-xl border border-border p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug text-muted-foreground">{label}</p>
                    <Badge tone={count > 0 ? 'warning' : 'neutral'} className="mt-1">
                      {count} Pending
                    </Badge>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              )
            })}
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
