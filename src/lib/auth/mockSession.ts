import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { users } from '@/mock-data/seed/users'
import type { SessionUser } from '@/types/domain'

interface SessionState {
  currentUserId: string
  currentUser: SessionUser
  availableUsers: SessionUser[]
  setCurrentUserId: (userId: string) => void
}

const defaultUser = users[0]

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentUserId: defaultUser.id,
      currentUser: defaultUser,
      availableUsers: users,
      setCurrentUserId: (userId) =>
        set(() => {
          const nextUser = users.find((u) => u.id === userId) ?? defaultUser
          return { currentUserId: nextUser.id, currentUser: nextUser }
        }),
    }),
    {
      name: 'fbs-ops-demo-session',
      partialize: (state) => ({ currentUserId: state.currentUserId }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const restored = users.find((u) => u.id === state.currentUserId) ?? defaultUser
          state.currentUser = restored
        }
      },
    },
  ),
)
