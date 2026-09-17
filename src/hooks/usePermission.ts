import { useSession } from '@/hooks/useSession'
import type { Capability } from '@/lib/rbac/permissions'
import { roleHasCapability } from '@/lib/rbac/permissions'

export function usePermission(capability: Capability): boolean {
  const { user } = useSession()
  return roleHasCapability(user.role, capability)
}
