import type { Role, SessionUser } from '@/types/domain'

interface HasCompany {
  companyId: string
}

interface HasBranch {
  branchId?: string
}

/**
 * Single choke point every mock service must filter through. Structural tenant
 * isolation: no feature should read `mock-data` directly, only via services
 * that call this. When a real backend arrives, this becomes a harmless
 * defense-in-depth no-op (the API already scopes by tenant).
 */
export function scopeToCompany<T extends HasCompany>(records: T[], companyId: string): T[] {
  return records.filter((record) => record.companyId === companyId)
}

export function scopeToBranch<T extends HasBranch>(records: T[], branchId: string | undefined): T[] {
  if (!branchId) return records
  return records.filter((record) => record.branchId === branchId)
}

const BRANCH_SCOPED_ROLES: Role[] = ['manager']
const SELF_SCOPED_ROLES: Role[] = ['employee']

/**
 * Applies the full scoping chain (company -> branch -> self) appropriate for
 * the current session's role, for any record shaped with companyId/branchId/id.
 */
export function scopeForSession<T extends HasCompany & HasBranch & { id?: string }>(
  records: T[],
  session: SessionUser,
  options?: { employeeIdField?: keyof T },
): T[] {
  let scoped = scopeToCompany(records, session.companyId)

  if (BRANCH_SCOPED_ROLES.includes(session.role)) {
    scoped = scopeToBranch(scoped, session.branchId)
  }

  if (SELF_SCOPED_ROLES.includes(session.role) && session.employeeId) {
    const field = options?.employeeIdField ?? ('id' as keyof T)
    scoped = scoped.filter((record) => record[field] === session.employeeId)
  }

  return scoped
}
