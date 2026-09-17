import { useMemo } from 'react'
import { useSession } from '@/hooks/useSession'
import { db } from '@/mock-data'

export function useTenant() {
  const { user } = useSession()

  const company = useMemo(() => db.companies.find((c) => c.id === user.companyId), [user.companyId])
  const companyBranches = useMemo(
    () => db.branches.filter((b) => b.companyId === user.companyId),
    [user.companyId],
  )
  const activeBranch = useMemo(
    () => companyBranches.find((b) => b.id === user.branchId),
    [companyBranches, user.branchId],
  )

  return { company, branches: companyBranches, activeBranch }
}
