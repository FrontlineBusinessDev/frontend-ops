import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { getBonuses } from '@/lib/services/bonusService'
import type { BonusIncentive } from '@/types/domain'

export function useBonuses() {
  const { user } = useSession()
  const [bonuses, setBonuses] = useState<BonusIncentive[] | null>(null)

  const refetch = useCallback(() => {
    getBonuses(user).then(setBonuses)
  }, [user])

  useEffect(() => {
    setBonuses(null)
    refetch()
  }, [refetch])

  return { bonuses: bonuses ?? [], isLoading: bonuses === null, refetch }
}
