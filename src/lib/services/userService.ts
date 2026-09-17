import { db } from '@/mock-data'
import type { Role, SessionUser } from '@/types/domain'

function logActivity(session: SessionUser, action: string, details?: string) {
  db.activityLog.unshift({
    id: crypto.randomUUID(),
    companyId: session.companyId,
    timestamp: new Date().toISOString(),
    actor: session.name,
    action,
    details,
  })
}

export async function getUsers(session: SessionUser): Promise<SessionUser[]> {
  return db.users.filter((u) => u.companyId === session.companyId)
}

export async function getActivityLog(session: SessionUser) {
  return db.activityLog.filter((a) => a.companyId === session.companyId)
}

export interface InviteUserInput {
  name: string
  email: string
  role: Role
}

export async function inviteUser(session: SessionUser, input: InviteUserInput): Promise<SessionUser> {
  const user: SessionUser = {
    id: crypto.randomUUID(),
    companyId: session.companyId,
    role: input.role,
    name: input.name,
    email: input.email,
    isActive: true,
  }
  db.users.push(user)
  logActivity(session, `Invited ${input.name} as ${input.role.replace('_', ' ')}`)
  return user
}

export async function updateUserRole(session: SessionUser, userId: string, role: Role): Promise<void> {
  const user = db.users.find((u) => u.id === userId && u.companyId === session.companyId)
  if (!user) return
  user.role = role
  logActivity(session, `Changed ${user.name}'s role to ${role.replace('_', ' ')}`)
}

export async function setUserActive(session: SessionUser, userId: string, isActive: boolean): Promise<void> {
  const user = db.users.find((u) => u.id === userId && u.companyId === session.companyId)
  if (!user) return
  user.isActive = isActive
  logActivity(session, `${isActive ? 'Reactivated' : 'Deactivated'} ${user.name}`)
}
