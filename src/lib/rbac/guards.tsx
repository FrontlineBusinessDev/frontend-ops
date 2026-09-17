import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import type { Capability } from '@/lib/rbac/permissions'
import { roleHasCapability } from '@/lib/rbac/permissions'
import type { Role } from '@/types/domain'

interface RequireRoleProps {
  roles: Role[]
  children: ReactNode
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user } = useSession()
  if (!roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }
  return <>{children}</>
}

interface RequireCapabilityProps {
  capability: Capability
  children: ReactNode
}

export function RequireCapability({ capability, children }: RequireCapabilityProps) {
  const { user } = useSession()
  if (!roleHasCapability(user.role, capability)) {
    return <Navigate to="/forbidden" replace />
  }
  return <>{children}</>
}

interface RequireSelfOrRoleProps {
  roles: Role[]
  ownerEmployeeId: string | undefined
  children: ReactNode
}

/** Guards ESS-style routes: allow if the session holds an elevated role, OR the record belongs to the signed-in employee. */
export function RequireSelfOrRole({ roles, ownerEmployeeId, children }: RequireSelfOrRoleProps) {
  const { user } = useSession()
  const isOwner = user.employeeId != null && user.employeeId === ownerEmployeeId
  if (!isOwner && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />
  }
  return <>{children}</>
}
