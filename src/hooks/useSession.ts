import { useSessionStore } from '@/lib/auth/mockSession'

export function useSession() {
  const currentUser = useSessionStore((s) => s.currentUser)
  const availableUsers = useSessionStore((s) => s.availableUsers)
  const setCurrentUserId = useSessionStore((s) => s.setCurrentUserId)
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const login = useSessionStore((s) => s.login)
  const logout = useSessionStore((s) => s.logout)
  return {
    user: currentUser,
    availableUsers: availableUsers.filter((u) => u.isActive !== false),
    setCurrentUserId,
    isAuthenticated,
    login,
    logout,
  }
}
