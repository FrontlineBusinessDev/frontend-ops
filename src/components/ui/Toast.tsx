import * as ToastPrimitive from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface ToastMessage {
  id: string
  title: string
  description?: string
  tone?: 'default' | 'success' | 'danger'
}

interface ToastContextValue {
  notify: (toast: Omit<ToastMessage, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_CLASSES: Record<NonNullable<ToastMessage['tone']>, string> = {
  default: 'border-border',
  success: 'border-success/40',
  danger: 'border-danger/40',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const notify = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ notify }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            duration={4000}
            onOpenChange={(open) => !open && dismiss(toast.id)}
            className={cn(
              'rounded-xl border bg-card px-4 py-3 shadow-soft-lg data-[state=open]:animate-in data-[state=closed]:animate-out',
              TONE_CLASSES[toast.tone ?? 'default'],
            )}
          >
            <ToastPrimitive.Title className="text-sm font-semibold tracking-tight">{toast.title}</ToastPrimitive.Title>
            {toast.description && (
              <ToastPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                {toast.description}
              </ToastPrimitive.Description>
            )}
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
