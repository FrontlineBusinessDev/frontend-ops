import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const TONE_DOT: Record<string, string> = {
  default: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

/** Global notification trigger — the popover listing and click-to-redirect behavior are unchanged from the header version, just relocated. */
export function NotificationsBell({ className }: { className?: string }) {
  const notifications = useNotifications()
  const navigate = useNavigate()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  function onNotificationClick(notification: (typeof notifications)[number]) {
    setNotificationsOpen(false)
    if (!notification.link) return
    navigate(notification.link, { state: { highlightId: notification.highlightId, tab: notification.tab } })
  }

  return (
    <PopoverPrimitive.Root open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'relative flex size-9 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {notifications.length > 0 && <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-danger" />}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={8}
          className={cn(
            'z-50 w-80 rounded-2xl border border-border bg-card p-0 shadow-soft-lg',
            'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
          )}
        >
          <p className="border-b border-border px-4 py-3 font-display text-sm font-semibold tracking-tight">Notifications</p>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onNotificationClick(notification)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                >
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE_DOT[notification.tone])} />
                  <span className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-foreground">{notification.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(notification.timestamp)}</p>
                  </span>
                </button>
              ))
            )}
          </div>
          <Link
            to="/notifications"
            onClick={() => setNotificationsOpen(false)}
            className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:bg-muted/60"
          >
            View all notifications
          </Link>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
