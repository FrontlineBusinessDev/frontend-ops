import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import { formatDate } from '@/lib/utils/format'

const TONE_DOT: Record<string, string> = {
  default: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function NotificationsPage() {
  const notifications = useNotifications()

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" description="Tasks, decisions, and reminders that need your attention." />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="New notifications will show up here." />
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={n.link ?? '#'}
              className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
            >
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[n.tone]}`} />
              <div>
                <p className="text-sm text-foreground">{n.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(n.timestamp)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
