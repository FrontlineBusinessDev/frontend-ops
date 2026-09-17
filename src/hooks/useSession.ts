import { useSessionStore } from '@/lib/auth/mockSession'

export function useSession() {
  const currentUser = useSessionStore((s) => s.currentUser)
  const availableUsers = useSessionStore((s) => s.availableUsers)
  const setCurrentUserId = useSessionStore((s) => s.setCurrentUserId)
  return { user: currentUser, availableUsers: availableUsers.filter((u) => u.isActive !== false), setCurrentUserId }
}
